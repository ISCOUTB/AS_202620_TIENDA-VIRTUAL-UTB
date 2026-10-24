"""API HTTP del módulo de pedidos."""

import uuid
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from app.modules.catalog.public import identificadores_de_tiendas
from app.modules.orders import repository, service
from app.modules.orders.models import Pedido
from app.modules.orders.schemas import (
    EstadoPedido,
    OrderCancelRequest,
    OrderCreateRequest,
    OrderItemOut,
    OrderOut,
    OrderStatusRequest,
)
from app.shared.database import get_session
from app.shared.errores import respuestas
from app.shared.seguridad import ContextoSeguridad, prohibido, requiere_usuario

router = APIRouter(prefix="/orders", tags=["orders"])

Sesion = Annotated[Session, Depends(get_session)]
Usuario = Annotated[ContextoSeguridad, Depends(requiere_usuario)]
OrderId = Annotated[int, Path(alias="orderId", description="ID del pedido")]


def _salida(session: Session, pedidos: Sequence[Pedido]) -> list[OrderOut]:
    lineas = repository.lineas_de(session, [p.id for p in pedidos])
    tiendas = identificadores_de_tiendas(session, {p.tienda_id for p in pedidos})
    return [
        OrderOut(
            id=p.id,
            usuario_id=p.usuario_id,
            tienda_id=p.tienda_id,
            tienda=tiendas.get(p.tienda_id),
            items=[
                OrderItemOut(
                    product_id=linea.producto_id,
                    product_nombre=linea.producto_nombre,
                    cantidad=linea.cantidad,
                    precio_unitario_centavos=linea.precio_unitario_centavos,
                    subtotal_centavos=linea.precio_unitario_centavos * linea.cantidad,
                )
                for linea in lineas[p.id]
            ],
            total_centavos=p.total_centavos,
            estado=p.estado,
            hora_recogida=p.hora_recogida,
            creado_en=p.creado_en,
            actualizado_en=p.actualizado_en,
        )
        for p in pedidos
    ]


def _visible(session: Session, contexto: ContextoSeguridad, pedido_id: int) -> Pedido:
    """El pedido existe y es del usuario o de una tienda que gestiona.

    RLS aplica la misma regla en la base; aquí se responde 404 sin revelar si
    el pedido de otra persona existe.
    """
    pedido = repository.obtener(session, pedido_id)
    if pedido is None or not (
        pedido.usuario_id == contexto.usuario_id or contexto.gestiona_inventario(pedido.tienda_id)
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pedido no encontrado")
    return pedido


@contextmanager
def _confirmar(session: Session) -> Iterator[None]:
    """Confirma; las reglas incumplidas son 400 y la concurrencia 409 (F-03)."""
    try:
        yield
        session.commit()
    except service.ErrorPedido as error:
        session.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from None
    except StaleDataError:
        session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "El pedido cambió mientras tanto; recarga y reintenta"
        ) from None


@router.get(
    "", responses=respuestas(e401="Token ausente o inválido", e403="No gestiona la tienda")
)
def list_orders(
    contexto: Usuario,
    session: Sesion,
    estado: Annotated[EstadoPedido | None, Query(description="Filtrar por estado")] = None,
    tienda_id: Annotated[
        int | None,
        Query(description="Pedidos de una tienda que el usuario gestiona; sin él, los propios."),
    ] = None,
) -> list[OrderOut]:
    """Pedidos del usuario o, con `tienda_id`, la cola de pedidos de esa tienda."""
    if tienda_id is not None and not contexto.gestiona_inventario(tienda_id):
        raise prohibido("No gestionas los pedidos de esta tienda")
    pedidos = repository.listar(
        session,
        usuario_id=None if tienda_id is not None else contexto.usuario_id,
        tienda_id=tienda_id,
        estado=estado,
    )
    return _salida(session, pedidos)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    responses={
        200: {
            "model": list[OrderOut],
            "description": "Reintento con la misma Idempotency-Key: los pedidos originales",
        },
        **respuestas(
            e400="Producto no disponible, stock insuficiente o llave vencida",
            e401="Token ausente o inválido",
        ),
    },
)
def create_order(
    datos: OrderCreateRequest,
    contexto: Usuario,
    session: Sesion,
    response: Response,
    clave: Annotated[
        uuid.UUID,
        Header(
            alias="Idempotency-Key",
            description="UUID por intento de compra; repetirlo no duplica el pedido (F-04).",
        ),
    ],
) -> list[OrderOut]:
    """Crea un pedido por cada tienda del carrito y descuenta sus unidades."""
    items = [(item.product_id, item.cantidad) for item in datos.items]

    def crear() -> service.Resultado:
        return service.crear(
            session,
            usuario_id=contexto.usuario_id,
            items=items,
            hora_recogida=datos.hora_recogida,
            clave=clave,
        )

    try:
        with _confirmar(session):
            resultado = crear()
    except service.LlaveEnUso:
        # Una petición simultánea con la misma llave ganó: se devuelve la suya.
        session.rollback()
        resultado = crear()
    if resultado.repetido:
        response.status_code = status.HTTP_200_OK
    return _salida(session, resultado.pedidos)


@router.get(
    "/{orderId}",
    responses=respuestas(e401="Token ausente o inválido", e404="Pedido no encontrado"),
)
def get_order(order_id: OrderId, contexto: Usuario, session: Sesion) -> OrderOut:
    """Detalle de un pedido propio o de una tienda que el usuario gestiona."""
    return _salida(session, [_visible(session, contexto, order_id)])[0]


@router.post(
    "/{orderId}/cancel",
    responses=respuestas(
        e400="El pedido no se puede cancelar",
        e401="Token ausente o inválido",
        e404="Pedido no encontrado",
        e409="Conflicto de concurrencia",
    ),
)
def cancel_order(
    order_id: OrderId,
    contexto: Usuario,
    session: Sesion,
    datos: Annotated[OrderCancelRequest | None, Body()] = None,
) -> OrderOut:
    """Cancela el pedido y repone el stock.

    El comprador puede hacerlo mientras no haya pagado; la tienda, mientras no
    se haya entregado.
    """
    pedido = _visible(session, contexto, order_id)
    gestiona = contexto.gestiona_inventario(pedido.tienda_id)
    por_defecto = "Cancelado por la tienda" if gestiona else "Cancelado por el comprador"
    with _confirmar(session):
        service.cancelar(
            session,
            pedido,
            usuario_id=contexto.usuario_id,
            comentario=(datos.motivo if datos else None) or por_defecto,
            por_comprador=not gestiona,
        )
    return _salida(session, [pedido])[0]


@router.post(
    "/{orderId}/estado",
    responses=respuestas(
        e400="Transición no permitida",
        e401="Token ausente o inválido",
        e403="No gestiona la tienda",
        e404="Pedido no encontrado",
        e409="Conflicto de concurrencia",
    ),
)
def update_order_status(
    order_id: OrderId, datos: OrderStatusRequest, contexto: Usuario, session: Sesion
) -> OrderOut:
    """La tienda avanza el pedido: pago confirmado, en preparación, listo, entregado."""
    pedido = _visible(session, contexto, order_id)
    if not contexto.gestiona_inventario(pedido.tienda_id):
        raise prohibido("Solo la tienda puede cambiar el estado del pedido")
    with _confirmar(session):
        service.cambiar_estado(
            session,
            pedido,
            datos.estado,
            usuario_id=contexto.usuario_id,
            comentario=datos.comentario,
        )
    return _salida(session, [pedido])[0]

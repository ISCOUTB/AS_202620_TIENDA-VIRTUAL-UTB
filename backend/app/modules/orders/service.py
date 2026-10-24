"""Reglas del ciclo de vida del pedido (docs/idempotencia-saga-s11.md).

Un pedido pertenece a una sola tienda: el checkout divide el carrito. Crear
el pedido y descontar el stock ocurre en la misma transacción local, que es
lo que el ADR 0010 mantiene mientras ambos módulos viven en el mismo proceso
(escenario 3: sin consistencia eventual). La compensación de la saga es
explícita: cancelar o vencer un pedido repone sus unidades.
"""

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.catalog.public import ProductoResumen, productos_para_pedido
from app.modules.inventory.public import (
    StockInsuficiente,
    descontar_para_pedido,
    reponer_por_pedido,
)
from app.modules.orders import repository
from app.modules.orders.models import ESTADO_INICIAL, Pedido, PedidoLinea

# Vigencia de la llave de idempotencia y plazo de pago: el mismo horizonte de
# 24 horas del diseño de la saga (F-01, F-04).
VIGENCIA_LLAVE = timedelta(hours=24)
PLAZO_PAGO = timedelta(hours=24)

# Avance normal del pedido en la tienda. La cancelación va aparte porque
# repone stock y tiene reglas propias.
TRANSICIONES: dict[str, set[str]] = {
    "pendiente_pago": {"pagado"},
    "pagado": {"en_preparacion"},
    "en_preparacion": {"listo"},
    "listo": {"entregado"},
}
CERRADOS = {"entregado", "cancelado"}

_RESTRICCION_LLAVE = "uq_pedidos_usuario_id"


class ErrorPedido(Exception):
    """Regla de negocio incumplida; el mensaje se muestra al usuario."""


class LlaveEnUso(Exception):
    """Otra petición con la misma llave creó el pedido mientras tanto."""


@dataclass(frozen=True)
class Resultado:
    pedidos: list[Pedido]
    repetido: bool


def _ahora() -> datetime:
    return datetime.now(UTC)


def _agrupar_por_tienda(
    cantidades: dict[int, int], productos: dict[int, ProductoResumen]
) -> dict[int, list[tuple[ProductoResumen, int]]]:
    por_tienda: dict[int, list[tuple[ProductoResumen, int]]] = defaultdict(list)
    for producto_id, cantidad in cantidades.items():
        producto = productos.get(producto_id)
        if producto is None or not producto.activo:
            raise ErrorPedido(f"El producto {producto_id} no está disponible")
        por_tienda[producto.tienda_id].append((producto, cantidad))
    return por_tienda


def crear(
    session: Session,
    *,
    usuario_id: int,
    items: list[tuple[int, int]],
    hora_recogida: time | None,
    clave: uuid.UUID,
) -> Resultado:
    """Crea un pedido por tienda, o devuelve los que ya creó la misma llave.

    `items` son pares (producto, cantidad); un producto repetido se suma.
    """
    existentes = list(repository.por_llave(session, usuario_id, clave))
    if existentes:
        if _ahora() - existentes[0].creado_en > VIGENCIA_LLAVE:
            raise ErrorPedido("La llave de idempotencia venció; genera una nueva")
        return Resultado(existentes, repetido=True)

    cantidades: dict[int, int] = defaultdict(int)
    for producto_id, cantidad in items:
        cantidades[producto_id] += cantidad
    productos = productos_para_pedido(session, list(cantidades))
    por_tienda = _agrupar_por_tienda(cantidades, productos)

    pedidos = []
    for tienda_id, lineas in sorted(por_tienda.items()):
        pedido = Pedido(
            usuario_id=usuario_id,
            tienda_id=tienda_id,
            estado=ESTADO_INICIAL,
            total_centavos=sum(p.precio_centavos * c for p, c in lineas),
            hora_recogida=hora_recogida,
            clave_idempotencia=clave,
        )
        session.add(pedido)
        try:
            session.flush()
        except IntegrityError as error:
            restriccion = getattr(getattr(error.orig, "diag", None), "constraint_name", "")
            if (restriccion or "").startswith(_RESTRICCION_LLAVE):
                raise LlaveEnUso(clave) from error
            raise
        # Copias de nombre y precio: el pedido no cambia si el catálogo cambia.
        session.add_all(
            PedidoLinea(
                pedido_id=pedido.id,
                linea=numero,
                producto_id=producto.id,
                producto_nombre=producto.nombre,
                precio_unitario_centavos=producto.precio_centavos,
                cantidad=cantidad,
            )
            for numero, (producto, cantidad) in enumerate(lineas, start=1)
        )
        repository.registrar_historial(session, pedido, anterior=None, usuario_id=usuario_id)
        session.flush()
        for producto, cantidad in lineas:
            try:
                descontar_para_pedido(session, producto.id, cantidad, pedido.id)
            except StockInsuficiente:
                raise ErrorPedido(
                    f"No hay unidades suficientes de «{producto.nombre}»"
                ) from None
        pedidos.append(pedido)
    return Resultado(pedidos, repetido=False)


def cancelar(
    session: Session,
    pedido: Pedido,
    *,
    usuario_id: int | None,
    comentario: str,
    por_comprador: bool,
) -> None:
    """Cancela el pedido y repone sus unidades (compensación de la saga).

    El comprador solo cancela antes de pagar; después, la tienda decide.
    """
    if pedido.estado in CERRADOS:
        raise ErrorPedido(f"El pedido ya está {pedido.estado.replace('_', ' ')}")
    if por_comprador and pedido.estado != ESTADO_INICIAL:
        raise ErrorPedido("El pedido ya se pagó; pide la cancelación en la tienda")
    anterior = pedido.estado
    pedido.estado = "cancelado"
    repository.registrar_historial(
        session, pedido, anterior=anterior, usuario_id=usuario_id, comentario=comentario
    )
    for linea in repository.lineas_de(session, [pedido.id])[pedido.id]:
        reponer_por_pedido(session, linea.producto_id, linea.cantidad, pedido.id)
    session.flush()


def cambiar_estado(
    session: Session,
    pedido: Pedido,
    nuevo: str,
    *,
    usuario_id: int,
    comentario: str | None,
) -> None:
    """Avanza el pedido un paso: pago confirmado, preparación, listo, entregado."""
    if nuevo not in TRANSICIONES.get(pedido.estado, set()):
        raise ErrorPedido(
            f"No se puede pasar de {pedido.estado.replace('_', ' ')} a {nuevo.replace('_', ' ')}"
        )
    anterior = pedido.estado
    pedido.estado = nuevo
    repository.registrar_historial(
        session, pedido, anterior=anterior, usuario_id=usuario_id, comentario=comentario
    )
    session.flush()


def vencer_pendientes(session: Session, ahora: datetime | None = None) -> int:
    """Cancela los pedidos sin pago con más de 24 h y repone su stock (F-01)."""
    limite = (ahora or _ahora()) - PLAZO_PAGO
    vencidos = repository.pendientes_vencidos(session, limite)
    for pedido in vencidos:
        cancelar(
            session,
            pedido,
            usuario_id=None,
            comentario="Vencido sin confirmación de pago (24 h)",
            por_comprador=False,
        )
    return len(vencidos)

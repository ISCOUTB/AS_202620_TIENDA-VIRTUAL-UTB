"""API HTTP del módulo de inventario: lectura pública y ajustes protegidos."""

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from app.modules.catalog.public import ProductoResumen, producto_resumen
from app.modules.inventory import repository
from app.modules.inventory.models import Existencia
from app.modules.inventory.schemas import (
    InventoryAdjustRequest,
    InventoryItemOut,
    InventoryUpdateRequest,
    StockOut,
)
from app.shared.database import get_session
from app.shared.errores import respuestas
from app.shared.seguridad import ContextoSeguridad, prohibido, requiere_usuario

router = APIRouter(prefix="/inventory", tags=["inventario"])

ProductId = Annotated[int, Path(alias="productId", description="ID del producto")]
Sesion = Annotated[Session, Depends(get_session)]
Usuario = Annotated[ContextoSeguridad, Depends(requiere_usuario)]


@router.get("")
def get_inventory(session: Sesion) -> list[StockOut]:
    """Lista la disponibilidad necesaria para presentar el catálogo."""
    # El contrato 0.3.0 conserva `product_id`/`existencias`; la tabla usa
    # `producto_id`/`cantidad`.
    return [
        StockOut(product_id=item.producto_id, existencias=item.cantidad)
        for item in repository.list_stock(session)
    ]


def _producto(session: Session, producto_id: int) -> ProductoResumen:
    producto = producto_resumen(session, producto_id)
    if producto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return producto


def _gestionable(
    session: Session, contexto: ContextoSeguridad, producto_id: int
) -> ProductoResumen:
    """El producto existe y el usuario gestiona el inventario de su tienda.

    RLS impone la misma regla en la base; aquí se responde un 403 claro antes.
    """
    producto = _producto(session, producto_id)
    if not contexto.gestiona_inventario(producto.tienda_id):
        raise prohibido("No gestionas el inventario de esta tienda")
    return producto


def _item(producto: ProductoResumen, existencia: Existencia) -> InventoryItemOut:
    return InventoryItemOut(
        product_id=producto.id,
        product_nombre=producto.nombre,
        cantidad=existencia.cantidad,
        actualizado_en=existencia.actualizado_en,
    )


@contextmanager
def _confirmar(session: Session) -> Iterator[None]:
    """Confirma el cambio; el bloqueo optimista (F-03) se traduce en 409."""
    try:
        yield
        session.commit()
    except StaleDataError:
        session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Las existencias cambiaron mientras tanto; reintenta"
        ) from None


@router.get(
    "/{productId}",
    responses=respuestas(e401="Token ausente o inválido", e404="Producto sin existencias"),
)
def get_stock(product_id: ProductId, _usuario: Usuario, session: Sesion) -> InventoryItemOut:
    """Existencias de un producto, con la fecha del último cambio."""
    producto = _producto(session, product_id)
    existencia = repository.obtener(session, product_id)
    if existencia is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto sin existencias registradas")
    return _item(producto, existencia)


@router.put(
    "/{productId}",
    responses=respuestas(
        e401="Token ausente o inválido",
        e403="No gestiona el inventario de la tienda",
        e404="Producto no encontrado",
        e409="Conflicto de concurrencia",
    ),
)
def update_stock(
    product_id: ProductId, datos: InventoryUpdateRequest, contexto: Usuario, session: Sesion
) -> InventoryItemOut:
    """Fija la cantidad absoluta (conteo físico). Queda como movimiento `ajuste`."""
    producto = _gestionable(session, contexto, product_id)
    with _confirmar(session):
        existencia = repository.fijar(
            session,
            product_id,
            datos.cantidad,
            motivo=datos.motivo,
            usuario_id=contexto.usuario_id,
        )
    return _item(producto, existencia)


@router.post(
    "/{productId}/adjust",
    responses=respuestas(
        e400="Ajuste inválido: cero o deja el stock en negativo",
        e401="Token ausente o inválido",
        e403="No gestiona el inventario de la tienda",
        e404="Producto sin existencias",
        e409="Conflicto de concurrencia",
    ),
)
def adjust_stock(
    product_id: ProductId, datos: InventoryAdjustRequest, contexto: Usuario, session: Sesion
) -> InventoryItemOut:
    """Suma o resta unidades (reposición, merma) con un motivo obligatorio."""
    if datos.delta == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El ajuste no puede ser cero")
    producto = _gestionable(session, contexto, product_id)
    try:
        with _confirmar(session):
            existencia = repository.ajustar(
                session,
                product_id,
                datos.delta,
                motivo=datos.motivo,
                usuario_id=contexto.usuario_id,
            )
    except repository.SinExistencias:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Producto sin existencias registradas"
        ) from None
    except repository.ExistenciasInsuficientes:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "El ajuste deja las existencias en negativo"
        ) from None
    return _item(producto, existencia)

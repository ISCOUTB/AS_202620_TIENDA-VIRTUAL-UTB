"""Operaciones públicas de Inventario para otros módulos y el composition root."""

from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.modules.inventory.models import Existencia, MovimientoExistencias


def asegurar_existencia_inicial(session: Session, producto_id: int, cantidad: int) -> bool:
    """Crea la existencia y su movimiento `inicial` si el producto no tiene.

    Nunca sobrescribe una existencia previa: volver a sembrar no borra ventas
    ni ajustes. Devuelve True si la creó.
    """
    if session.get(Existencia, producto_id) is not None:
        return False
    session.add(Existencia(producto_id=producto_id, cantidad=cantidad))
    # Sin relación ORM la FK no ordena las inserciones: primero la existencia.
    session.flush()
    session.add(
        MovimientoExistencias(
            producto_id=producto_id,
            tipo="inicial",
            cambio=cantidad,
            cantidad_resultante=cantidad,
            motivo="Carga inicial",
        )
    )
    session.flush()
    return True


class StockInsuficiente(Exception):
    """No hay unidades suficientes (o el producto no tiene existencias)."""

    def __init__(self, producto_id: int) -> None:
        super().__init__(producto_id)
        self.producto_id = producto_id


# SQLSTATE con que las funciones de la migración 0002 rechazan el movimiento.
_SIN_STOCK = {"23514", "P0002"}  # check_violation, no_data_found


def _mover(session: Session, funcion: str, producto_id: int, cantidad: int, pedido_id: int) -> int:
    try:
        with session.begin_nested():
            return session.execute(
                text(f"SELECT {funcion}(:producto, :cantidad, :pedido)"),
                {"producto": producto_id, "cantidad": cantidad, "pedido": pedido_id},
            ).scalar_one()
    except DBAPIError as error:
        if getattr(error.orig, "pgcode", None) in _SIN_STOCK:
            raise StockInsuficiente(producto_id) from error
        raise


def descontar_para_pedido(
    session: Session, producto_id: int, cantidad: int, pedido_id: int
) -> int:
    """Descuenta las unidades de un pedido (movimiento `venta`).

    Pasa por `inventario_descontar`, que es atómica y no deja stock negativo
    (F-03): el comprador no tiene UPDATE directo sobre `existencias` (ADR 0014).
    Devuelve la cantidad resultante.
    """
    return _mover(session, "inventario_descontar", producto_id, cantidad, pedido_id)


def reponer_por_pedido(session: Session, producto_id: int, cantidad: int, pedido_id: int) -> int:
    """Devuelve al stock las unidades de un pedido cancelado o vencido (`devolucion`)."""
    return _mover(session, "inventario_reponer", producto_id, cantidad, pedido_id)

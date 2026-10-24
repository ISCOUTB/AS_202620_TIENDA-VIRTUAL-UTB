"""Acceso a datos del módulo de inventario."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.inventory.models import Existencia, MovimientoExistencias


class SinExistencias(Exception):
    """El producto no tiene fila de existencias."""


class ExistenciasInsuficientes(Exception):
    """El ajuste dejaría el stock en negativo."""


def list_stock(session: Session) -> Sequence[Existencia]:
    """Devuelve las existencias ordenadas por referencia de producto."""
    return session.scalars(select(Existencia).order_by(Existencia.producto_id)).all()


def obtener(session: Session, producto_id: int) -> Existencia | None:
    return session.get(Existencia, producto_id)


def _registrar(
    session: Session,
    existencia: Existencia,
    *,
    tipo: str,
    cambio: int,
    motivo: str,
    usuario_id: int | None,
) -> None:
    session.add(
        MovimientoExistencias(
            producto_id=existencia.producto_id,
            tipo=tipo,
            cambio=cambio,
            cantidad_resultante=existencia.cantidad,
            motivo=motivo,
            usuario_id=usuario_id,
        )
    )


def fijar(
    session: Session, producto_id: int, cantidad: int, *, motivo: str, usuario_id: int | None
) -> Existencia:
    """Fija la cantidad absoluta; crea la existencia (`inicial`) si no había.

    El cambio queda como movimiento `ajuste`. Si la cantidad no cambia no se
    registra nada: un movimiento de cambio cero no aporta trazabilidad.
    """
    existencia = obtener(session, producto_id)
    if existencia is None:
        existencia = Existencia(producto_id=producto_id, cantidad=cantidad)
        session.add(existencia)
        # Sin relación ORM la FK no ordena las inserciones: primero la existencia.
        session.flush()
        _registrar(
            session,
            existencia,
            tipo="inicial",
            cambio=cantidad,
            motivo=motivo,
            usuario_id=usuario_id,
        )
    elif cantidad != existencia.cantidad:
        cambio = cantidad - existencia.cantidad
        existencia.cantidad = cantidad
        _registrar(
            session,
            existencia,
            tipo="ajuste",
            cambio=cambio,
            motivo=motivo,
            usuario_id=usuario_id,
        )
    session.flush()
    return existencia


def ajustar(
    session: Session, producto_id: int, delta: int, *, motivo: str, usuario_id: int | None
) -> Existencia:
    """Suma `delta` a la existencia y registra el movimiento `ajuste`."""
    existencia = obtener(session, producto_id)
    if existencia is None:
        raise SinExistencias(producto_id)
    if existencia.cantidad + delta < 0:
        raise ExistenciasInsuficientes(producto_id)
    existencia.cantidad += delta
    _registrar(
        session, existencia, tipo="ajuste", cambio=delta, motivo=motivo, usuario_id=usuario_id
    )
    # Bloqueo optimista (F-03): si otra transacción cambió la fila, el flush
    # lanza StaleDataError en lugar de pisar su cambio.
    session.flush()
    return existencia

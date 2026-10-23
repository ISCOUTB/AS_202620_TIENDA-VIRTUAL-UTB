"""Operaciones públicas de Inventario para el composition root (siembra)."""

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

"""Acceso a datos del módulo de inventario."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.inventory.models import Existencia


def list_stock(session: Session) -> Sequence[Existencia]:
    """Devuelve las existencias ordenadas por referencia de producto."""
    return session.scalars(select(Existencia).order_by(Existencia.producto_id)).all()

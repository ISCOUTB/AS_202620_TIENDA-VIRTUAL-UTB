"""Acceso a datos del módulo de inventario."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.inventory.models import Stock


def list_stock(session: Session) -> Sequence[Stock]:
    """Devuelve las existencias ordenadas por referencia de producto."""
    return session.scalars(select(Stock).order_by(Stock.product_id)).all()

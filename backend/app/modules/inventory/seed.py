"""Datos mockeados iniciales propiedad de Inventario."""

from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.inventory.models import Stock

_SEED_QUANTITIES = (40, 25, 18, 12)


def seed_stock(session: Session, product_ids: Sequence[int]) -> None:
    """Siembra referencias recibidas por contrato, nunca consulta Catálogo."""
    if session.scalar(select(func.count()).select_from(Stock)):
        return
    session.add_all(
        Stock(
            product_id=product_id,
            existencias=(
                _SEED_QUANTITIES[index]
                if index < len(_SEED_QUANTITIES)
                else 0
            ),
        )
        for index, product_id in enumerate(product_ids)
    )
    session.commit()

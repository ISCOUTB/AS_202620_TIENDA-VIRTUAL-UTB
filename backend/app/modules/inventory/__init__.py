"""Contrato público y arranque del módulo de inventario."""

from collections.abc import Sequence

from sqlalchemy.orm import Session

from app.modules.inventory import models as _models  # noqa: F401
from app.modules.inventory.router import router
from app.modules.inventory.seed import seed_stock


def initialize(session: Session, product_ids: Sequence[int]) -> None:
    """Carga existencias para las referencias que entrega el composition root."""
    seed_stock(session, product_ids)


__all__ = ["initialize", "router"]

"""Contrato público y arranque del módulo de catálogo."""

from sqlalchemy.orm import Session

from app.modules.catalog import models as _models  # noqa: F401
from app.modules.catalog.router import router
from app.modules.catalog.seed import seed_products


def initialize(session: Session) -> list[int]:
    """Carga datos iniciales y devuelve las referencias públicas de producto."""
    return seed_products(session)


__all__ = ["initialize", "router"]

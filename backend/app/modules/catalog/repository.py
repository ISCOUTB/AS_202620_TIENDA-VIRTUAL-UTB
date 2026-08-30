"""Acceso a datos del módulo de catálogo."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.catalog.models import Product


def list_products(session: Session) -> Sequence[Product]:
    """Devuelve el catálogo ordenado por nombre."""
    return session.scalars(select(Product).order_by(Product.nombre)).all()

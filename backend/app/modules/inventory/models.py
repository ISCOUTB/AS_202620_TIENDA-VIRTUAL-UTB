"""Tablas propiedad del módulo de inventario."""

from sqlalchemy import CheckConstraint, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class Stock(Base):
    __tablename__ = "inventory_stock"
    __table_args__ = (CheckConstraint("existencias >= 0", name="ck_inventory_stock_nonnegative"),)

    # Referencia estable al producto, sin relación ORM ni acceso a tablas de Catálogo.
    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    existencias: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

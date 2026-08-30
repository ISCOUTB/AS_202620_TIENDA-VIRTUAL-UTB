"""Tablas propiedad del módulo de catálogo."""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class Product(Base):
    __tablename__ = "catalog_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(400), nullable=False, default="")
    precio_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    existencias: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

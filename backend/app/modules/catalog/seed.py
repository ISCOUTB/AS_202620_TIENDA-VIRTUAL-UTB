"""Datos mockeados iniciales del catálogo (ver Architecture Constraints)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.catalog.models import Product

_SEED = [
    {"nombre": "Café americano", "descripcion": "Vaso de 8 oz", "precio_centavos": 350000},
    {"nombre": "Empanada de queso", "descripcion": "Unidad recién hecha", "precio_centavos": 280000},
    {"nombre": "Jugo de naranja", "descripcion": "Botella de 300 ml", "precio_centavos": 450000},
    {"nombre": "Sándwich mixto", "descripcion": "Jamón y queso", "precio_centavos": 900000},
]


def seed_products(session: Session) -> list[int]:
    """Siembra si hace falta y devuelve los IDs reales, ordenados y estables."""
    if session.scalar(select(func.count()).select_from(Product)):
        return list(session.scalars(select(Product.id).order_by(Product.id)).all())

    products = [Product(**row) for row in _SEED]
    session.add_all(products)
    session.flush()
    product_ids = [product.id for product in products]
    session.commit()
    return product_ids

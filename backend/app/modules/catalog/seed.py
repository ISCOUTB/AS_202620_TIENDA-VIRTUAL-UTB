"""Datos mockeados iniciales del catálogo (ver Architecture Constraints)."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.catalog.models import Product

_SEED = [
    {"nombre": "Café americano", "descripcion": "Vaso de 8 oz", "precio_centavos": 350000, "existencias": 40},
    {"nombre": "Empanada de queso", "descripcion": "Unidad recién hecha", "precio_centavos": 280000, "existencias": 25},
    {"nombre": "Jugo de naranja", "descripcion": "Botella de 300 ml", "precio_centavos": 450000, "existencias": 18},
    {"nombre": "Sándwich mixto", "descripcion": "Jamón y queso", "precio_centavos": 900000, "existencias": 12},
]


def seed_products(session: Session) -> None:
    """Inserta el catálogo de ejemplo solo si la tabla está vacía (idempotente)."""
    if session.scalar(select(func.count()).select_from(Product)):
        return
    session.add_all(Product(**fila) for fila in _SEED)
    session.commit()

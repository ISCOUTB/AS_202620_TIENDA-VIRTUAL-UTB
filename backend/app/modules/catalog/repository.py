"""Acceso a datos del módulo de catálogo."""

from collections.abc import Sequence

from sqlalchemy import Row, and_, select
from sqlalchemy.orm import Session

from app.modules.catalog.models import ImagenProducto, Producto, Tienda


def list_products(session: Session) -> Sequence[Row]:
    """Devuelve los productos activos de tiendas activas, ordenados por nombre."""
    consulta = (
        select(
            Producto.id,
            Producto.nombre,
            Producto.descripcion,
            Producto.precio_centavos,
            Tienda.identificador.label("tienda"),
            ImagenProducto.url.label("imagen_url"),
        )
        .join(Tienda, Tienda.id == Producto.tienda_id)
        .outerjoin(
            ImagenProducto,
            and_(ImagenProducto.producto_id == Producto.id, ImagenProducto.es_principal),
        )
        .where(Producto.activo, Tienda.activa)
        .order_by(Producto.nombre, Producto.id)
    )
    return session.execute(consulta).all()

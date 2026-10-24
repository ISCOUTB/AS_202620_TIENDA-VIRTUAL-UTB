"""Acceso a datos del módulo de catálogo."""

from collections.abc import Sequence

from sqlalchemy import Row, and_, or_, select, true
from sqlalchemy.orm import Session

from app.modules.catalog.models import Categoria, ImagenProducto, Producto, Tienda


def _consulta_productos():
    return (
        select(
            Producto.id,
            Producto.nombre,
            Producto.descripcion,
            Producto.precio_centavos,
            Tienda.identificador.label("tienda"),
            ImagenProducto.url.label("imagen_url"),
            Categoria.nombre.label("categoria"),
            Producto.presentacion,
            Producto.precio_confirmado,
            Producto.activo,
            Producto.tienda_id,
            Tienda.activa.label("tienda_activa"),
        )
        .join(Tienda, Tienda.id == Producto.tienda_id)
        .outerjoin(
            ImagenProducto,
            and_(ImagenProducto.producto_id == Producto.id, ImagenProducto.es_principal),
        )
        .outerjoin(Categoria, Categoria.id == Producto.categoria_id)
    )


def list_products(
    session: Session, *, tiendas_gestionadas: set[int] | None = None, todas: bool = False
) -> Sequence[Row]:
    """Productos activos de tiendas activas, ordenados por nombre.

    `tiendas_gestionadas` (o `todas`) añade los inactivos de esas tiendas,
    para la vista administrativa.
    """
    visibles = and_(Producto.activo, Tienda.activa)
    if todas:
        visibles = true()
    elif tiendas_gestionadas:
        visibles = or_(visibles, Producto.tienda_id.in_(tiendas_gestionadas))
    consulta = _consulta_productos().where(visibles).order_by(Producto.nombre, Producto.id)
    return session.execute(consulta).all()


def product(session: Session, producto_id: int) -> Row | None:
    return session.execute(_consulta_productos().where(Producto.id == producto_id)).first()


def list_stores(session: Session) -> Sequence[Tienda]:
    """Tiendas activas, en el orden en que se registraron."""
    return session.scalars(select(Tienda).where(Tienda.activa).order_by(Tienda.id)).all()


def tienda_por_identificador(session: Session, identificador: str) -> Tienda | None:
    return session.scalar(select(Tienda).where(Tienda.identificador == identificador))


def obtener(session: Session, producto_id: int) -> Producto | None:
    return session.get(Producto, producto_id)

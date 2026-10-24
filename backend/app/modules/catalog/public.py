"""Operaciones públicas de Catálogo para otros módulos y el composition root.

Son altas idempotentes: buscan por la clave natural y crean o actualizan.
Devuelven solo identificadores, nunca modelos internos.
"""

from typing import NamedTuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.catalog.models import Categoria, Producto, Tienda


def asegurar_tienda(
    session: Session, *, identificador: str, nombre: str, descripcion: str = ""
) -> int:
    """Crea o actualiza la tienda por su `identificador`."""
    tienda = session.scalar(select(Tienda).where(Tienda.identificador == identificador))
    if tienda is None:
        tienda = Tienda(identificador=identificador, nombre=nombre, descripcion=descripcion)
        session.add(tienda)
    else:
        tienda.nombre = nombre
        tienda.descripcion = descripcion
    session.flush()
    return tienda.id


def asegurar_categoria(session: Session, *, tienda_id: int, nombre: str) -> int:
    """Crea la categoría si no existe en la tienda."""
    categoria = session.scalar(
        select(Categoria).where(Categoria.tienda_id == tienda_id, Categoria.nombre == nombre)
    )
    if categoria is None:
        categoria = Categoria(tienda_id=tienda_id, nombre=nombre)
        session.add(categoria)
        session.flush()
    return categoria.id


def asegurar_producto(
    session: Session,
    *,
    tienda_id: int,
    nombre: str,
    descripcion: str,
    precio_centavos: int,
    categoria_id: int | None = None,
) -> int:
    """Crea o actualiza el producto por (tienda, nombre sin distinguir mayúsculas)."""
    producto = session.scalar(
        select(Producto).where(
            Producto.tienda_id == tienda_id,
            func.lower(Producto.nombre) == func.lower(nombre),
        )
    )
    if producto is None:
        producto = Producto(tienda_id=tienda_id, nombre=nombre)
        session.add(producto)
    producto.descripcion = descripcion
    producto.precio_centavos = precio_centavos
    producto.categoria_id = categoria_id
    session.flush()
    return producto.id


def ids_de_tiendas(session: Session) -> list[int]:
    """Identificadores de las tiendas visibles para el principal de la sesión."""
    return list(session.scalars(select(Tienda.id).order_by(Tienda.id)))


class ProductoResumen(NamedTuple):
    id: int
    nombre: str
    tienda_id: int
    precio_centavos: int
    activo: bool


def producto_resumen(session: Session, producto_id: int) -> ProductoResumen | None:
    """Datos mínimos de un producto visible para el principal de la sesión.

    Bajo RLS, un producto inactivo solo lo ven quienes gestionan su tienda.
    """
    return productos_para_pedido(session, [producto_id]).get(producto_id)


def productos_para_pedido(session: Session, ids: list[int]) -> dict[int, ProductoResumen]:
    """Resúmenes de los productos visibles entre `ids`, indexados por id."""
    filas = session.execute(
        select(
            Producto.id,
            Producto.nombre,
            Producto.tienda_id,
            Producto.precio_centavos,
            Producto.activo,
        ).where(Producto.id.in_(ids))
    ).all()
    return {fila.id: ProductoResumen(*fila) for fila in filas}


def identificadores_de_tiendas(session: Session, ids: set[int]) -> dict[int, str]:
    """Slug de cada tienda visible entre `ids`."""
    if not ids:
        return {}
    filas = session.execute(
        select(Tienda.id, Tienda.identificador).where(Tienda.id.in_(ids))
    ).all()
    return dict(filas)

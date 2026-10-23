"""Operaciones públicas de Catálogo para el composition root (siembra).

Son altas idempotentes: buscan por la clave natural y crean o actualizan.
Devuelven solo identificadores, nunca modelos internos.
"""

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

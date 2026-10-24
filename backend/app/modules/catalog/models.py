"""Tablas propiedad del módulo de catálogo."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Identity,
    Index,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class Tienda(Base):
    __tablename__ = "tiendas"
    __table_args__ = (
        CheckConstraint(
            "identificador ~ '^[a-z0-9]+(-[a-z0-9]+)*$'", name="identificador_formato"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    identificador: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    descripcion: Mapped[str] = mapped_column(
        String(400), nullable=False, server_default=text("''")
    )
    # Ruta relativa servida localmente, p. ej. /media/tiendas/antojos.webp.
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Categoria(Base):
    __tablename__ = "categorias"
    __table_args__ = (
        UniqueConstraint("tienda_id", "nombre"),
        # Destino de la FK compuesta de productos: garantiza la misma tienda.
        UniqueConstraint("id", "tienda_id"),
    )

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    tienda_id: Mapped[int] = mapped_column(
        ForeignKey("tiendas.id", ondelete="RESTRICT"), nullable=False
    )
    nombre: Mapped[str] = mapped_column(String(60), nullable=False)


class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = (
        # MATCH SIMPLE: con categoria_id NULL la restricción no se evalúa.
        ForeignKeyConstraint(
            ["categoria_id", "tienda_id"],
            ["categorias.id", "categorias.tienda_id"],
            ondelete="RESTRICT",
        ),
        CheckConstraint("btrim(nombre) <> ''", name="nombre_no_vacio"),
        CheckConstraint("precio_centavos >= 0", name="precio_no_negativo"),
        # Expresión escrita exactamente como la refleja PostgreSQL
        # ("lower(nombre::text)") para que `alembic check` no detecte diferencias falsas.
        Index(
            "ix_productos_tienda_id_nombre_lower",
            "tienda_id",
            text("lower(nombre::text)"),
            unique=True,
        ),
        Index("ix_productos_categoria_id", "categoria_id"),
    )

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    tienda_id: Mapped[int] = mapped_column(
        ForeignKey("tiendas.id", ondelete="RESTRICT"), nullable=False
    )
    categoria_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    descripcion: Mapped[str] = mapped_column(
        String(400), nullable=False, server_default=text("''")
    )
    precio_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    # false = precio de referencia que la tienda aún no confirmó (migración 0003).
    precio_confirmado: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )
    # "Grande", "Personal", "Entero"...: distingue variantes en la vitrina.
    presentacion: Mapped[str | None] = mapped_column(String(40), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class ImagenProducto(Base):
    __tablename__ = "imagenes_producto"
    __table_args__ = (
        CheckConstraint("orden >= 0", name="orden_no_negativo"),
        # Una sola imagen principal por producto.
        Index(
            "ix_imagenes_producto_principal",
            "producto_id",
            unique=True,
            postgresql_where=text("es_principal"),
        ),
        Index("ix_imagenes_producto_producto_id_orden", "producto_id", "orden"),
    )

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("productos.id", ondelete="CASCADE"), nullable=False
    )
    # Ruta relativa servida localmente, p. ej. /media/productos/15/frente.webp.
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    texto_alternativo: Mapped[str] = mapped_column(
        String(200), nullable=False, server_default=text("''")
    )
    orden: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text("0"))
    es_principal: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )

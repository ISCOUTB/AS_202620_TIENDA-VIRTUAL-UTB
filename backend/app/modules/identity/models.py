"""Tablas propiedad del módulo de identidad y acceso."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base

# Roles de referencia; la migración 0001 inserta estas mismas filas.
ROLES: dict[str, str] = {
    "comprador": "Comprador",
    "admin_general": "Administrador general",
    "admin_tienda": "Administrador de tienda",
    "responsable_inventario": "Responsable de inventario",
}


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint("char_length(btrim(nombre)) >= 2", name="nombre_minimo"),
        # Expresión escrita exactamente como la refleja PostgreSQL (pg_get_indexdef:
        # "lower(correo::text)") para que `alembic check` no detecte diferencias falsas.
        Index("ix_usuarios_correo_lower", text("lower(correo::text)"), unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    correo: Mapped[str] = mapped_column(String(254), nullable=False)
    hash_contrasena: Mapped[str] = mapped_column(Text, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = (CheckConstraint("codigo ~ '^[a-z_]+$'", name="codigo_formato"),)

    codigo: Mapped[str] = mapped_column(String(32), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)


class UsuarioRol(Base):
    __tablename__ = "usuario_roles"
    __table_args__ = (
        UniqueConstraint(
            "usuario_id", "rol_codigo", "tienda_id", postgresql_nulls_not_distinct=True
        ),
    )

    id: Mapped[int] = mapped_column(Integer, Identity(), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    rol_codigo: Mapped[str] = mapped_column(
        ForeignKey("roles.codigo", ondelete="RESTRICT"), nullable=False
    )
    # Referencia lógica a `tiendas` de Catálogo; NULL = el rol vale en todas.
    tienda_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    asignado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

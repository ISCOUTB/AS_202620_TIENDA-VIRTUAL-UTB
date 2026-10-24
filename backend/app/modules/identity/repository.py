"""Acceso a datos del módulo de identidad.

Con el rol de aplicación la API no puede leer `hash_contrasena` ni insertar
en `usuarios` (ADR 0014): el login y el alta pasan por las funciones
SECURITY DEFINER de la migración 0002, y el resto usa columnas explícitas.
"""

from collections.abc import Sequence
from datetime import datetime
from typing import NamedTuple

from sqlalchemy import Row, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.identity.models import Usuario, UsuarioRol


class CorreoDuplicado(Exception):
    """Ya existe una cuenta con ese correo (sin distinguir mayúsculas)."""


class Credenciales(NamedTuple):
    id: int
    hash_contrasena: str
    activo: bool


class Perfil(NamedTuple):
    id: int
    nombre: str
    correo: str
    activo: bool
    creado_en: datetime


def registrar_comprador(session: Session, *, nombre: str, correo: str, hash_contrasena: str) -> int:
    """Crea la cuenta con el rol `comprador` y devuelve su id."""
    try:
        with session.begin_nested():
            return session.execute(
                text("SELECT identidad_registrar_comprador(:nombre, :correo, :hash)"),
                {"nombre": nombre, "correo": correo, "hash": hash_contrasena},
            ).scalar_one()
    except IntegrityError as error:
        raise CorreoDuplicado(correo) from error


def buscar_credenciales(session: Session, correo: str) -> Credenciales | None:
    fila = session.execute(
        text("SELECT id, hash_contrasena, activo FROM identidad_buscar_credenciales(:correo)"),
        {"correo": correo},
    ).first()
    return Credenciales(*fila) if fila else None


def perfil(session: Session, usuario_id: int) -> Perfil | None:
    """Lee el perfil visible bajo RLS (el propio, o todos si es admin general)."""
    fila = session.execute(
        select(
            Usuario.id, Usuario.nombre, Usuario.correo, Usuario.activo, Usuario.creado_en
        ).where(Usuario.id == usuario_id)
    ).first()
    return Perfil(*fila) if fila else None


def roles(session: Session, usuario_id: int) -> Sequence[Row]:
    return session.execute(
        select(UsuarioRol.rol_codigo, UsuarioRol.tienda_id)
        .where(UsuarioRol.usuario_id == usuario_id)
        .order_by(UsuarioRol.rol_codigo, UsuarioRol.tienda_id)
    ).all()

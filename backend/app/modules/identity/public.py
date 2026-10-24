"""Operaciones públicas de Identidad para el composition root.

- `principal_desde_token`: lo registra `app.main` como resolvedor de
  `shared.seguridad.contexto_actual`.
- `asegurar_admin_general` y `asegurar_admin_tienda`: altas idempotentes para
  la siembra, que corre con el rol dueño (ADR 0013).
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.catalog.public import ids_de_tiendas
from app.modules.identity import contrasenas, repository, tokens
from app.modules.identity.models import Usuario, UsuarioRol
from app.shared.database import SessionLocal
from app.shared.seguridad import CLAVE_CONTEXTO, ContextoSeguridad


def principal_desde_token(token: str) -> ContextoSeguridad | None:
    """Valida el token y carga roles y tiendas del usuario, o None si no vale."""
    usuario_id = tokens.usuario_del_token(token)
    if usuario_id is None:
        return None
    # Se lee con el contexto del propio usuario: RLS solo le deja ver su fila
    # de `usuarios` y sus `usuario_roles`.
    propio = ContextoSeguridad(usuario_id=usuario_id)
    with SessionLocal(info={CLAVE_CONTEXTO: propio}) as session, session.begin():
        perfil = repository.perfil(session, usuario_id)
        if perfil is None or not perfil.activo:
            return None
        asignados = repository.roles(session, usuario_id)
        # `tienda_id` NULL = el rol vale en todas las tiendas existentes.
        todas = (
            frozenset(ids_de_tiendas(session))
            if any(r.tienda_id is None and r.rol_codigo != "comprador" for r in asignados)
            else frozenset()
        )

    def tiendas_con(rol: str) -> frozenset[int]:
        con_rol = [r.tienda_id for r in asignados if r.rol_codigo == rol]
        return todas if None in con_rol else frozenset(con_rol)

    return ContextoSeguridad(
        usuario_id=usuario_id,
        roles=frozenset(r.rol_codigo for r in asignados),
        tiendas_admin=tiendas_con("admin_tienda"),
        tiendas_inventario=tiendas_con("responsable_inventario"),
    )


def asegurar_cuenta_con_rol(
    session: Session,
    *,
    nombre: str,
    correo: str,
    contrasena: str,
    rol: str,
    tienda_id: int | None = None,
) -> int:
    """Crea (o reactiva) la cuenta con `rol` (en `tienda_id`) y devuelve su id.

    No cambia la contraseña de una cuenta existente: volver a sembrar no debe
    pisar una contraseña que su dueño ya cambió.
    """
    usuario = session.scalar(select(Usuario).where(func.lower(Usuario.correo) == correo.lower()))
    if usuario is None:
        usuario = Usuario(
            nombre=nombre, correo=correo, hash_contrasena=contrasenas.generar(contrasena)
        )
        session.add(usuario)
        session.flush()
    usuario.activo = True
    tienda = UsuarioRol.tienda_id.is_(None) if tienda_id is None else UsuarioRol.tienda_id == tienda_id
    tiene_rol = session.scalar(
        select(UsuarioRol.id).where(
            UsuarioRol.usuario_id == usuario.id, UsuarioRol.rol_codigo == rol, tienda
        )
    )
    if tiene_rol is None:
        session.add(UsuarioRol(usuario_id=usuario.id, rol_codigo=rol, tienda_id=tienda_id))
    session.flush()
    return usuario.id


def asegurar_admin_general(session: Session, *, nombre: str, correo: str, contrasena: str) -> int:
    """Cuenta con el rol `admin_general`: supervisa todas las tiendas (ADR 0017)."""
    return asegurar_cuenta_con_rol(
        session, nombre=nombre, correo=correo, contrasena=contrasena, rol="admin_general"
    )


def asegurar_admin_tienda(
    session: Session, *, nombre: str, correo: str, contrasena: str, tienda_id: int
) -> int:
    """Cuenta con el rol `admin_tienda` de una tienda: la única que gestiona."""
    return asegurar_cuenta_con_rol(
        session,
        nombre=nombre,
        correo=correo,
        contrasena=contrasena,
        rol="admin_tienda",
        tienda_id=tienda_id,
    )


def verificar_configuracion() -> None:
    """Falla al arrancar si los tokens no se pueden firmar."""
    tokens.verificar_configuracion()

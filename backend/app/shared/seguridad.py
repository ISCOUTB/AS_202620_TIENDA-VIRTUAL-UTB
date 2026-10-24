"""Contexto de seguridad por transacción para las políticas RLS de PostgreSQL.

Elemento transversal (ADR 0014): no conoce a ningún módulo. Traslada a la base
quién hace la petición mediante `set_config(..., true)`, que dura solo hasta el
final de la transacción y por eso es seguro con el pool de conexiones. Las
políticas leen esos valores con las funciones SQL `seg_*` de la migración
`0002_politicas_rls`.
"""

from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import Connection, text

# Clave bajo la que la sesión de SQLAlchemy guarda el contexto (`Session.info`).
CLAVE_CONTEXTO = "contexto_seguridad"


@dataclass(frozen=True)
class ContextoSeguridad:
    """Principal de la petición. Vacío = anónimo."""

    usuario_id: int | None = None
    roles: frozenset[str] = field(default_factory=frozenset)
    # Tiendas donde el usuario es `admin_tienda` / `responsable_inventario`.
    tiendas_admin: frozenset[int] = field(default_factory=frozenset)
    tiendas_inventario: frozenset[int] = field(default_factory=frozenset)
    # Tareas programadas (`app.tareas`): sin usuario, alcance sobre todas las tiendas.
    sistema: bool = False

    @property
    def es_admin_general(self) -> bool:
        return "admin_general" in self.roles

    def administra_tienda(self, tienda_id: int) -> bool:
        """Misma regla que `seg_administra_tienda` en la base.

        El admin general no escribe en las tiendas, solo las supervisa (ADR 0017).
        """
        return self.sistema or tienda_id in self.tiendas_admin

    def gestiona_inventario(self, tienda_id: int) -> bool:
        """Misma regla que `seg_gestiona_inventario_tienda` en la base."""
        return self.administra_tienda(tienda_id) or tienda_id in self.tiendas_inventario

    def supervisa_tienda(self, tienda_id: int) -> bool:
        """Misma regla que `seg_supervisa_tienda`: puede leer lo de la tienda."""
        return self.es_admin_general or self.gestiona_inventario(tienda_id)


ANONIMO = ContextoSeguridad()

_SQL_CONTEXTO = text(
    "SELECT set_config('app.usuario_id', :usuario_id, true),"
    " set_config('app.roles', :roles, true),"
    " set_config('app.tiendas_admin', :tiendas_admin, true),"
    " set_config('app.tiendas_inventario', :tiendas_inventario, true),"
    " set_config('app.es_admin_general', :es_admin_general, true),"
    " set_config('app.es_sistema', :es_sistema, true)"
)


def _lista(valores: Iterable[object]) -> str:
    return ",".join(str(valor) for valor in sorted(valores))


def aplicar_contexto(conexion: Connection, contexto: ContextoSeguridad) -> None:
    """Fija el principal en la transacción abierta de `conexion`."""
    conexion.execute(
        _SQL_CONTEXTO,
        {
            "usuario_id": "" if contexto.usuario_id is None else str(contexto.usuario_id),
            "roles": _lista(contexto.roles),
            "tiendas_admin": _lista(contexto.tiendas_admin),
            "tiendas_inventario": _lista(contexto.tiendas_inventario),
            "es_admin_general": "true" if contexto.es_admin_general else "false",
            "es_sistema": "true" if contexto.sistema else "false",
        },
    )


# Traduce un token Bearer al principal, o None si no es válido. Lo registra el
# composition root (`app.main`) con la función pública de Identidad: así este
# paquete transversal no importa ningún módulo (ADR 0001).
ResolvedorToken = Callable[[str], ContextoSeguridad | None]
_resolvedor: ResolvedorToken | None = None


def registrar_resolvedor(resolvedor: ResolvedorToken) -> None:
    global _resolvedor
    _resolvedor = resolvedor


def _no_autenticado(detalle: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detalle,
        headers={"WWW-Authenticate": "Bearer"},
    )


def contexto_actual(request: Request) -> ContextoSeguridad:
    """Dependencia de FastAPI que construye el principal de la petición.

    Sin cabecera `Authorization` la petición es anónima. Con cabecera, el
    token debe ser válido: uno vencido o alterado responde 401 en lugar de
    degradar a anónimo, para que el cliente cierre la sesión (ADR 0011).
    Lee la cabecera directamente para no declarar seguridad en las rutas
    públicas del contrato; las protegidas usan `requiere_usuario`.
    """
    cabecera = request.headers.get("Authorization")
    if not cabecera:
        return ANONIMO
    esquema, _, token = cabecera.partition(" ")
    if esquema.lower() != "bearer" or not token.strip() or _resolvedor is None:
        raise _no_autenticado("Credenciales inválidas")
    contexto = _resolvedor(token.strip())
    if contexto is None:
        raise _no_autenticado("Sesión inválida o vencida")
    return contexto


# Solo documenta el esquema `bearerAuth` en OpenAPI; la validación es la de
# `contexto_actual`.
_esquema_bearer = HTTPBearer(scheme_name="bearerAuth", bearerFormat="JWT", auto_error=False)


def requiere_usuario(
    contexto: Annotated[ContextoSeguridad, Depends(contexto_actual)],
    _credencial: Annotated[HTTPAuthorizationCredentials | None, Depends(_esquema_bearer)],
) -> ContextoSeguridad:
    """Dependencia de las rutas protegidas: exige un usuario autenticado."""
    if contexto.usuario_id is None:
        raise _no_autenticado("Se requiere iniciar sesión")
    return contexto


def prohibido(detalle: str = "No tienes permiso para esta operación") -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detalle)


SOLO_SUPERVISA = "El administrador general solo supervisa: los cambios los hace el admin de la tienda"


def prohibido_en_tienda(contexto: ContextoSeguridad, detalle: str) -> HTTPException:
    """403 de una escritura en una tienda ajena; al admin general le explica por qué."""
    return prohibido(SOLO_SUPERVISA if contexto.es_admin_general else detalle)

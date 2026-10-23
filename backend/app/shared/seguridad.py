"""Contexto de seguridad por transacción para las políticas RLS de PostgreSQL.

Elemento transversal (ADR 0014): no conoce a ningún módulo. Traslada a la base
quién hace la petición mediante `set_config(..., true)`, que dura solo hasta el
final de la transacción y por eso es seguro con el pool de conexiones. Las
políticas leen esos valores con las funciones SQL `seg_*` de la migración
`0002_politicas_rls`.
"""

from collections.abc import Iterable
from dataclasses import dataclass, field

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

    @property
    def es_admin_general(self) -> bool:
        return "admin_general" in self.roles


ANONIMO = ContextoSeguridad()

_SQL_CONTEXTO = text(
    "SELECT set_config('app.usuario_id', :usuario_id, true),"
    " set_config('app.roles', :roles, true),"
    " set_config('app.tiendas_admin', :tiendas_admin, true),"
    " set_config('app.tiendas_inventario', :tiendas_inventario, true),"
    " set_config('app.es_admin_general', :es_admin_general, true)"
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
        },
    )


def contexto_actual() -> ContextoSeguridad:
    """Dependencia de FastAPI que construye el principal de la petición.

    TODO(identity): cuando existan `POST /identity/login` y el JWT, leer aquí
    la cabecera `Authorization`, validar el token y devolver el usuario con sus
    roles y tiendas (consultando `usuario_roles` con el contexto del propio
    usuario). Mientras tanto toda petición es anónima.
    """
    return ANONIMO

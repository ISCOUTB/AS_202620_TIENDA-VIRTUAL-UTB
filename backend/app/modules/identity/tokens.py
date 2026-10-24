"""Emisión y validación de tokens de acceso (ADR 0016).

JWT HS256 con la clave `JWT_SECRET`. El token solo lleva el identificador del
usuario: los roles se leen de la base en cada petición, de modo que retirar un
rol o desactivar una cuenta surte efecto sin esperar a que el token venza.
"""

import os
from datetime import UTC, datetime, timedelta

import jwt

ALGORITMO = "HS256"
_TTL_POR_DEFECTO = 3600
# RFC 7518 §3.2: la clave de HS256 debe tener al menos 256 bits.
_LONGITUD_MINIMA = 32


class ConfiguracionTokensError(RuntimeError):
    """Falta `JWT_SECRET` o es demasiado corta: la API no arranca."""


def _clave() -> str:
    clave = os.getenv("JWT_SECRET", "")
    if len(clave.encode()) < _LONGITUD_MINIMA:
        raise ConfiguracionTokensError(
            f"Define JWT_SECRET con al menos {_LONGITUD_MINIMA} bytes "
            "(p. ej. `openssl rand -hex 32`)."
        )
    return clave


def vigencia_segundos() -> int:
    return int(os.getenv("JWT_TTL_SEGUNDOS", str(_TTL_POR_DEFECTO)))


def verificar_configuracion() -> None:
    _clave()


def emitir(usuario_id: int) -> str:
    ahora = datetime.now(UTC)
    reclamos = {
        "sub": str(usuario_id),
        "iat": ahora,
        "exp": ahora + timedelta(seconds=vigencia_segundos()),
    }
    return jwt.encode(reclamos, _clave(), algorithm=ALGORITMO)


def usuario_del_token(token: str) -> int | None:
    """Devuelve el usuario del token, o None si es inválido o venció."""
    try:
        reclamos = jwt.decode(
            token, _clave(), algorithms=[ALGORITMO], options={"require": ["sub", "exp", "iat"]}
        )
        return int(reclamos["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None

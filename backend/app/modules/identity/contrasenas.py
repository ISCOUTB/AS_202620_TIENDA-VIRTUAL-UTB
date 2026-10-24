"""Hash de contraseñas con Argon2id (parámetros por defecto de argon2-cffi)."""

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()
# Se verifica contra este hash cuando el correo no existe, para que el tiempo
# de respuesta no revele qué cuentas están registradas.
_HASH_SEÑUELO = _hasher.hash("señuelo-sin-cuenta")


def generar(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar(hash_guardado: str | None, contrasena: str) -> bool:
    try:
        return _hasher.verify(hash_guardado or _HASH_SEÑUELO, contrasena) and bool(hash_guardado)
    except (VerificationError, InvalidHashError):
        return False

"""Contrato público del módulo de identidad y acceso."""

from app.modules.identity import models as _models  # noqa: F401
from app.modules.identity.router import router

__all__ = ["router"]

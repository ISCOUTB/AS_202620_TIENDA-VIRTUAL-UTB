"""Contrato público del módulo de inventario."""

from app.modules.inventory import models as _models  # noqa: F401
from app.modules.inventory.router import router

__all__ = ["router"]

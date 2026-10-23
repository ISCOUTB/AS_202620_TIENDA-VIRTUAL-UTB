"""Contrato público del módulo de catálogo."""

from app.modules.catalog import models as _models  # noqa: F401
from app.modules.catalog.router import router

__all__ = ["router"]

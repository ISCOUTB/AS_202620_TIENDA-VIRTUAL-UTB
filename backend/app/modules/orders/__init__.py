"""Contrato público del módulo de pedidos."""

from app.modules.orders import models as _models  # noqa: F401
from app.modules.orders.router import router

__all__ = ["router"]

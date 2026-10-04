"""Contrato público del módulo de inventario."""

from pydantic import BaseModel, ConfigDict


class StockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    existencias: int

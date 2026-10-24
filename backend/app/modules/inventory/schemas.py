"""Contrato público del módulo de inventario."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    existencias: int


class InventoryItemOut(BaseModel):
    product_id: int
    product_nombre: str
    cantidad: int = Field(ge=0, description="Unidades disponibles en stock")
    actualizado_en: datetime


class InventoryUpdateRequest(BaseModel):
    cantidad: int = Field(ge=0, description="Nueva cantidad absoluta de stock")
    motivo: str = Field(
        default="Conteo de existencias",
        min_length=1,
        max_length=200,
        description="Razón del cambio, para la auditoría de movimientos.",
    )


class InventoryAdjustRequest(BaseModel):
    delta: int = Field(description="Positivo = reposición, negativo = venta o merma.")
    motivo: str = Field(min_length=1, max_length=200, description="Razón del ajuste.")

"""Contrato público del módulo de pedidos."""

from datetime import datetime, time
from typing import Literal

from pydantic import BaseModel, Field

# Mismos valores que `models.ESTADOS_PEDIDO` (ADR 0013); lo verifica una prueba.
EstadoPedido = Literal[
    "pendiente_pago", "pagado", "en_preparacion", "listo", "entregado", "cancelado"
]


class OrderItemRequest(BaseModel):
    product_id: int
    cantidad: int = Field(ge=1, le=50)


class OrderCreateRequest(BaseModel):
    items: list[OrderItemRequest] = Field(min_length=1, max_length=50)
    hora_recogida: time | None = Field(
        default=None, description="Franja acordada con el mostrador (America/Bogota)."
    )


class OrderItemOut(BaseModel):
    product_id: int
    product_nombre: str
    cantidad: int
    precio_unitario_centavos: int = Field(description="Precio al momento de la compra")
    subtotal_centavos: int


class OrderOut(BaseModel):
    id: int
    usuario_id: int
    tienda_id: int
    tienda: str | None = Field(default=None, description="Slug de la tienda del pedido.")
    items: list[OrderItemOut]
    total_centavos: int
    estado: EstadoPedido
    hora_recogida: time | None = None
    creado_en: datetime
    actualizado_en: datetime


class OrderCancelRequest(BaseModel):
    motivo: str | None = Field(default=None, min_length=1, max_length=200)


class OrderStatusRequest(BaseModel):
    estado: Literal["pagado", "en_preparacion", "listo", "entregado"]
    comentario: str | None = Field(default=None, max_length=200)

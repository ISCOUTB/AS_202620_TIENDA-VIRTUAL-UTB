"""Contrato público del módulo de catálogo."""

from pydantic import BaseModel, ConfigDict, Field


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str
    precio_centavos: int
    # Campos opcionales añadidos con el esquema 0001: no rompen consumidores.
    tienda: str | None = Field(
        default=None, description="Identificador (slug) de la tienda dueña del producto."
    )
    imagen_url: str | None = Field(
        default=None, description="Ruta relativa de la imagen principal, si existe."
    )

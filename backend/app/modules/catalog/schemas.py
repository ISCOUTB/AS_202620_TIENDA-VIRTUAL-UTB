"""Contrato público del módulo de catálogo."""

from pydantic import BaseModel, ConfigDict, Field, field_validator


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
    # Campos añadidos en la API 0.4.0 (docs/api/tiendas-catalogo.md).
    categoria: str | None = Field(default=None, description="Nombre de la categoría.")
    presentacion: str | None = Field(
        default=None, description="Variante en la vitrina: Grande, Personal, Entero..."
    )
    precio_confirmado: bool = Field(
        default=True,
        description="false = precio de referencia que la tienda aún no confirmó.",
    )
    activo: bool = Field(default=True, description="Habilitado para la venta.")


class TiendaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    identificador: str = Field(description="Slug de la tienda.")
    nombre: str
    descripcion: str
    logo_url: str | None = None


def _sin_espacios_extremos(valor: str | None) -> str | None:
    return valor.strip() if isinstance(valor, str) else valor


class _CamposEditables(BaseModel):
    # Rechaza campos no editables, como `existencias` (propiedad de Inventario)
    # o `id` (lo asigna el backend): docs/api/administracion-catalogo.md.
    model_config = ConfigDict(extra="forbid")

    limpiar_espacios = field_validator("*", mode="before")(_sin_espacios_extremos)


class ProductCreateRequest(_CamposEditables):
    tienda: str = Field(description="Slug de la tienda donde se registra el producto.")
    nombre: str = Field(min_length=1, max_length=120)
    descripcion: str = Field(default="", max_length=400)
    precio_centavos: int = Field(ge=0, description="Precio en centavos COP.")
    categoria: str | None = Field(default=None, min_length=1, max_length=60)
    presentacion: str | None = Field(default=None, min_length=1, max_length=40)
    precio_confirmado: bool = True
    activo: bool = True


class ProductUpdateRequest(_CamposEditables):
    nombre: str | None = Field(default=None, min_length=1, max_length=120)
    descripcion: str | None = Field(default=None, max_length=400)
    precio_centavos: int | None = Field(default=None, ge=0)
    categoria: str | None = Field(default=None, min_length=1, max_length=60)
    presentacion: str | None = Field(default=None, min_length=1, max_length=40)
    precio_confirmado: bool | None = None
    activo: bool | None = None

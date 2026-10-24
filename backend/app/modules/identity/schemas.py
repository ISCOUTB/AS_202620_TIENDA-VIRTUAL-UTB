"""Contrato público del módulo de identidad."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

# Mismos códigos que `models.ROLES` y la tabla `roles` (ADR 0013).
CodigoRol = Literal["comprador", "admin_general", "admin_tienda", "responsable_inventario"]


class RegisterRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = Field(description="Vigencia del token en segundos.")


class RolAsignado(BaseModel):
    codigo: CodigoRol
    tienda_id: int | None = Field(
        default=None, description="Tienda donde vale el rol; null = todas."
    )


class UserOut(BaseModel):
    id: int
    nombre: str
    email: str
    roles: list[RolAsignado]
    creado_en: datetime

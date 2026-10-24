"""Forma común de los errores HTTP de la API (`ErrorResponse` del contrato).

Transversal: es el cuerpo que FastAPI produce con `HTTPException`. Solo se usa
para documentar las respuestas de error en OpenAPI.
"""

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str


def respuestas(**descripciones: str) -> dict[int | str, dict]:
    """`responses=` de una ruta: `respuestas(e401="...", e409="...")`."""
    return {
        int(codigo.removeprefix("e")): {"model": ErrorResponse, "description": descripcion}
        for codigo, descripcion in descripciones.items()
    }

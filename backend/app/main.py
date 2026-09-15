from contextlib import asynccontextmanager
<<<<<<< HEAD
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel
=======
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
>>>>>>> 290608b2d0a3fbcae89ecab6d295c2ddbc9b40ce

from app.modules.catalog import models as catalog_models  # noqa: F401  (registra tablas)
from app.modules.catalog.router import router as catalog_router
from app.modules.catalog.seed import seed_products
from app.shared.database import Base, SessionLocal, engine

_PATH_CONTRATO_DISENO = (
    Path(__file__).resolve().parents[2] / "docs" / "openapi" / "tienda-virtual.yaml"
)
_PATH_CONTRATO_DISENO_DOCKER = (
    Path(__file__).resolve().parents[1] / "docs" / "openapi" / "tienda-virtual.yaml"
)


def _abrir_contrato_diseno() -> PlainTextResponse:
    """Devuelve el YAML del contrato de diseño, adaptable a local y Docker."""
    candidatas = [
        Path(os.environ.get("CONTRATO_DISENO", "")),  # override explícito
        _PATH_CONTRATO_DISENO,  # repositorio local (raíz/backend/app/main.py)
        _PATH_CONTRATO_DISENO_DOCKER,  # imagen Docker (WORKDIR /app)
    ]
    for ruta in candidatas:
        if ruta.exists():
            return PlainTextResponse(ruta.read_text(encoding="utf-8"))
    return PlainTextResponse("Contrato de diseño no encontrado.", status_code=404)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Prepara el esquema y el catálogo mockeado al arrancar."""
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_products(session)
    yield


app = FastAPI(title="Tienda Virtual UTB", version="0.2.0", lifespan=lifespan)
app.include_router(catalog_router)


class HealthOut(BaseModel):
    status: Literal["ok"]


@app.get("/health", tags=["operacion"], response_model=HealthOut)
def health() -> dict[str, str]:
    """Confirma que el proceso de la API está disponible."""
    return {"status": "ok"}


@app.get("/openapi/diseno", tags=["operacion"], response_class=PlainTextResponse)
def openapi_diseno() -> PlainTextResponse:
    """Sirve en crudo el contrato OpenAPI de diseño anticipado (YAML)."""
    return _abrir_contrato_diseno()

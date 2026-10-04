import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.catalog import initialize as initialize_catalog
from app.modules.catalog import router as catalog_router
from app.modules.inventory import initialize as initialize_inventory
from app.modules.inventory import router as inventory_router
from app.shared.database import Base, SessionLocal, engine, get_session
from app.shared.logging import configure_logging
from app.shared.metrics import ObservabilityMiddleware, snapshot

_PATH_CONTRATO_DISENO = (
    Path(__file__).resolve().parents[2] / "docs" / "openapi" / "tienda-virtual.yaml"
)
_PATH_CONTRATO_DISENO_DOCKER = (
    Path(__file__).resolve().parents[1] / "docs" / "openapi" / "tienda-virtual.yaml"
)


def _abrir_contrato_diseno() -> PlainTextResponse:
    """Devuelve el YAML del contrato de diseño, adaptable a local y Docker."""
    ruta_configurada = os.environ.get("CONTRATO_DISENO")
    candidatas = ([Path(ruta_configurada)] if ruta_configurada else []) + [
        _PATH_CONTRATO_DISENO,  # repositorio local (raíz/backend/app/main.py)
        _PATH_CONTRATO_DISENO_DOCKER,  # imagen Docker (WORKDIR /app)
    ]
    for ruta in candidatas:
        if ruta.is_file():
            return PlainTextResponse(ruta.read_text(encoding="utf-8"))
    return PlainTextResponse("Contrato de diseño no encontrado.", status_code=404)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Configura logs JSON, prepara el esquema y el catálogo mockeado."""
    configure_logging()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        product_ids = initialize_catalog(session)
        initialize_inventory(session, product_ids)
    yield


app = FastAPI(title="Tienda Virtual UTB", version="0.3.0", lifespan=lifespan)
app.add_middleware(ObservabilityMiddleware)
app.include_router(catalog_router)
app.include_router(inventory_router)


class HealthOut(BaseModel):
    status: Literal["ok"]


class ReadinessOut(BaseModel):
    status: Literal["ok", "error"]
    detalle: str | None = None


@app.get("/health", tags=["operacion"], response_model=HealthOut)
def health() -> dict[str, str]:
    """Liveness: confirma que el proceso de la API está disponible."""
    return {"status": "ok"}


@app.get(
    "/health/ready",
    tags=["operacion"],
    response_model=ReadinessOut,
    responses={503: {"model": ReadinessOut, "description": "Base de datos no disponible"}},
)
def health_ready(session: Session = Depends(get_session)) -> ReadinessOut | JSONResponse:
    """Readiness: además del proceso, verifica que la base de datos responde."""
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detalle": "base de datos no disponible"},
        )
    return ReadinessOut(status="ok")


@app.get("/metrics", tags=["operacion"])
def metrics() -> dict:
    """Métricas HTTP del proceso, ligadas al escenario de disponibilidad."""
    return snapshot()


@app.get(
    "/openapi/diseno",
    response_class=PlainTextResponse,
    include_in_schema=False,  # Documento auxiliar, como /docs y /openapi.json.
)
def openapi_diseno() -> PlainTextResponse:
    """Sirve en crudo el contrato OpenAPI de diseño anticipado (YAML)."""
    return _abrir_contrato_diseno()

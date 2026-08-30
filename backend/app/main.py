from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.modules.catalog import models as catalog_models  # noqa: F401  (registra tablas)
from app.modules.catalog.router import router as catalog_router
from app.modules.catalog.seed import seed_products
from app.shared.database import Base, SessionLocal, engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Prepara el esquema y el catálogo mockeado al arrancar."""
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_products(session)
    yield


app = FastAPI(title="Tienda Virtual UTB", version="0.2.0", lifespan=lifespan)
app.include_router(catalog_router)


@app.get("/health", tags=["operacion"])
def health() -> dict[str, str]:
    """Confirma que el proceso de la API está disponible."""
    return {"status": "ok"}

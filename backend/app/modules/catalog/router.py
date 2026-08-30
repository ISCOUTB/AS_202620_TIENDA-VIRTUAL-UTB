"""API HTTP del módulo de catálogo."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.catalog import repository
from app.modules.catalog.schemas import ProductOut
from app.shared.database import get_session

router = APIRouter(prefix="/catalog", tags=["catalogo"])


@router.get("/products", response_model=list[ProductOut])
def get_products(session: Session = Depends(get_session)) -> list[ProductOut]:
    """Lista los productos disponibles en el catálogo."""
    return [ProductOut.model_validate(p) for p in repository.list_products(session)]

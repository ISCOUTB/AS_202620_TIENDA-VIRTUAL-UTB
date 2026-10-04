"""API HTTP pública de lectura del módulo de inventario."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.inventory import repository
from app.modules.inventory.schemas import StockOut
from app.shared.database import get_session

router = APIRouter(prefix="/inventory", tags=["inventario"])


@router.get("", response_model=list[StockOut])
def get_inventory(session: Session = Depends(get_session)) -> list[StockOut]:
    """Lista la disponibilidad necesaria para presentar el catálogo."""
    return [StockOut.model_validate(item) for item in repository.list_stock(session)]

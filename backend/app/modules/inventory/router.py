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
    # El contrato 0.3.0 conserva `product_id`/`existencias`; la tabla usa
    # `producto_id`/`cantidad`.
    return [
        StockOut(product_id=item.producto_id, existencias=item.cantidad)
        for item in repository.list_stock(session)
    ]

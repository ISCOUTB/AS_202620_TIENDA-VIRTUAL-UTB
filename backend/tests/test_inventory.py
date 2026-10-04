from fastapi.testclient import TestClient

from app.main import app
from app.modules.catalog.models import Product
from app.modules.inventory.models import Stock


def test_inventory_endpoint_returns_stock_owned_by_inventory() -> None:
    with TestClient(app) as client:
        response = client.get("/inventory")

    assert response.status_code == 200
    stock = response.json()
    assert stock
    assert set(stock[0]) == {"product_id", "existencias"}
    assert all(item["existencias"] >= 0 for item in stock)


def test_stock_has_single_data_owner() -> None:
    """Falla si Catálogo vuelve a apropiarse de las existencias."""
    assert "existencias" not in Product.__table__.columns
    assert "existencias" in Stock.__table__.columns


def test_seeded_catalog_and_inventory_references_match() -> None:
    with TestClient(app) as client:
        product_ids = {item["id"] for item in client.get("/catalog/products").json()}
        stock_ids = {item["product_id"] for item in client.get("/inventory").json()}

    assert stock_ids == product_ids

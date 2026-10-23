from fastapi.testclient import TestClient

from app.main import app
from app.modules.catalog import models as catalogo
from app.modules.inventory.models import Existencia, MovimientoExistencias


def test_inventory_endpoint_returns_stock_owned_by_inventory(datos_demo) -> None:
    with TestClient(app) as client:
        response = client.get("/inventory")

    assert response.status_code == 200
    stock = response.json()
    assert stock
    assert set(stock[0]) == {"product_id", "existencias"}
    assert all(item["existencias"] >= 0 for item in stock)


def test_stock_has_single_data_owner() -> None:
    """Falla si Catálogo vuelve a apropiarse de las existencias."""
    tablas_catalogo = [
        modelo.__table__
        for modelo in (catalogo.Tienda, catalogo.Categoria, catalogo.Producto, catalogo.ImagenProducto)
    ]
    for tabla in tablas_catalogo:
        assert "cantidad" not in tabla.columns
        assert "existencias" not in tabla.columns
    assert "cantidad" in Existencia.__table__.columns


def test_seeded_catalog_and_inventory_references_match(datos_demo) -> None:
    with TestClient(app) as client:
        product_ids = {item["id"] for item in client.get("/catalog/products").json()}
        stock_ids = {item["product_id"] for item in client.get("/inventory").json()}

    assert stock_ids == product_ids


def test_seed_is_idempotent_and_records_initial_movement(sesion) -> None:
    from app.seed import PRODUCTOS, sembrar_demo

    with sesion.begin():
        primera = sembrar_demo(sesion)
    with sesion.begin():
        segunda = sembrar_demo(sesion)

    assert primera["existencias_nuevas"] == len(PRODUCTOS)
    assert segunda["existencias_nuevas"] == 0
    assert sesion.query(Existencia).count() == len(PRODUCTOS)
    iniciales = sesion.query(MovimientoExistencias).filter_by(tipo="inicial").count()
    assert iniciales == len(PRODUCTOS)

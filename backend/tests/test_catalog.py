from fastapi.testclient import TestClient

from app.main import app


def test_products_endpoint_returns_seeded_catalog() -> None:
    with TestClient(app) as client:
        response = client.get("/catalog/products")

    assert response.status_code == 200
    productos = response.json()
    assert len(productos) >= 1

    primero = productos[0]
    assert set(primero) == {"id", "nombre", "descripcion", "precio_centavos", "existencias"}
    assert primero["nombre"] == "Café americano"  # orden alfabético
    assert isinstance(primero["precio_centavos"], int)


def test_products_are_sorted_by_name() -> None:
    with TestClient(app) as client:
        nombres = [p["nombre"] for p in client.get("/catalog/products").json()]

    assert nombres == sorted(nombres)

from fastapi.testclient import TestClient

from app.main import app
from app.modules.catalog.models import ImagenProducto, Producto, Tienda


def test_products_endpoint_returns_seeded_catalog(datos_demo) -> None:
    with TestClient(app) as client:
        response = client.get("/catalog/products")

    assert response.status_code == 200
    productos = response.json()
    assert len(productos) == datos_demo["productos"]

    # Los campos del contrato 0.3.0 se conservan; los añadidos son opcionales.
    assert set(productos[0]) == {
        "id",
        "nombre",
        "descripcion",
        "precio_centavos",
        "tienda",
        "imagen_url",
        "categoria",
        "presentacion",
        "precio_confirmado",
        "activo",
    }
    cafe = next(p for p in productos if p["nombre"] == "Café americano")
    assert cafe["precio_centavos"] == 350000
    assert cafe["tienda"] == "alegria"


def test_products_are_sorted_by_name_and_hide_inactive(sesion) -> None:
    tienda = Tienda(identificador="prueba", nombre="Prueba")
    sesion.add(tienda)
    sesion.flush()
    for nombre, activo in (("Cocada", True), ("Arepa", True), ("Bocadillo", False)):
        sesion.add(Producto(tienda_id=tienda.id, nombre=nombre, precio_centavos=1000, activo=activo))
    sesion.commit()

    with TestClient(app) as client:
        nombres = [p["nombre"] for p in client.get("/catalog/products").json()]

    assert nombres == ["Arepa", "Cocada"]


def test_products_expose_main_image(sesion) -> None:
    tienda = Tienda(identificador="prueba", nombre="Prueba")
    sesion.add(tienda)
    sesion.flush()
    producto = Producto(tienda_id=tienda.id, nombre="Arepa", precio_centavos=1000)
    sesion.add(producto)
    sesion.flush()
    sesion.add_all(
        [
            ImagenProducto(producto_id=producto.id, url="/media/productos/1/lado.webp", orden=1),
            ImagenProducto(
                producto_id=producto.id, url="/media/productos/1/frente.webp", es_principal=True
            ),
        ]
    )
    sesion.commit()

    with TestClient(app) as client:
        (arepa,) = client.get("/catalog/products").json()

    assert arepa["imagen_url"] == "/media/productos/1/frente.webp"
    assert arepa["tienda"] == "prueba"

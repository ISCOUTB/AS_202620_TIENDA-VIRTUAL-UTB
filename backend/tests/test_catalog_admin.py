"""Detalle, tiendas y administración del catálogo (docs/api/administracion-catalogo.md)."""

import os

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from app.modules.catalog.models import Producto
from app.modules.catalog.public import asegurar_categoria
from app.modules.inventory.models import Existencia
from app.shared.database import SessionLocal, engine
from app.shared.seguridad import ContextoSeguridad, aplicar_contexto
from tests.conftest import asignar_rol, registrar_y_entrar

ROL_APP = os.getenv("APP_DB_USER", "tienda_app")

NUEVO = {
    "tienda": "antojos",
    "nombre": "Maní con pasas",
    "descripcion": "Bolsa de 50 g.",
    "precio_centavos": 220000,
    "categoria": "Snacks",
    "presentacion": "Bolsa",
}


@pytest.fixture
def admin_antojos(cliente, datos_demo) -> dict[str, str]:
    cabecera = registrar_y_entrar(cliente, "antojos@utb.edu.co")
    asignar_rol("antojos@utb.edu.co", "admin_tienda", tienda_id=1)
    return cabecera


def _por_nombre(cliente, nombre: str, **params) -> dict | None:
    productos = cliente.get("/catalog/products", **params).json()
    return next((p for p in productos if p["nombre"] == nombre), None)


def test_catalogo_expone_categoria_presentacion_y_precio_confirmado(cliente, datos_demo) -> None:
    pequeno = _por_nombre(cliente, "De todito pequeño")
    arroz = _por_nombre(cliente, "Arroz oriental")

    assert (pequeno["categoria"], pequeno["presentacion"]) == ("Snacks", "Pequeño")
    assert pequeno["precio_confirmado"] is False
    assert (arroz["presentacion"], arroz["precio_confirmado"]) == ("Porción", True)


def test_tiendas(cliente, datos_demo) -> None:
    tiendas = cliente.get("/catalog/tiendas").json()

    assert [t["identificador"] for t in tiendas] == [
        "antojos",
        "punto-fit",
        "alegria",
        "almuerzo-01",
        "almuerzo-02",
    ]


def test_detalle_de_producto(cliente, datos_demo) -> None:
    lista = cliente.get("/catalog/products").json()

    detalle = cliente.get(f"/catalog/products/{lista[0]['id']}")

    assert detalle.status_code == 200
    assert detalle.json() == lista[0]
    assert cliente.get("/catalog/products/999999").status_code == 404


def test_producto_inactivo_solo_lo_ve_quien_gestiona_la_tienda(
    cliente, admin_antojos
) -> None:
    producto_id = _por_nombre(cliente, "Doritos")["id"]
    with SessionLocal() as session, session.begin():
        session.execute(update(Producto).where(Producto.id == producto_id).values(activo=False))

    anonimo = cliente.get(f"/catalog/products/{producto_id}")
    admin = cliente.get(f"/catalog/products/{producto_id}", headers=admin_antojos)

    assert anonimo.status_code == 404
    assert admin.status_code == 200
    assert _por_nombre(cliente, "Doritos") is None
    assert _por_nombre(cliente, "Doritos", headers=admin_antojos) is None
    incluido = _por_nombre(
        cliente, "Doritos", headers=admin_antojos, params={"incluir_inactivos": True}
    )
    assert incluido["activo"] is False


def test_admin_de_tienda_registra_producto_sin_existencias(cliente, admin_antojos) -> None:
    respuesta = cliente.post("/catalog/products", json=NUEVO, headers=admin_antojos)

    assert respuesta.status_code == 201
    creado = respuesta.json()
    assert {k: creado[k] for k in NUEVO} == NUEVO
    assert creado["activo"] is True
    with SessionLocal() as session:
        assert session.get(Existencia, creado["id"]) is None


def test_registro_rechaza_campos_no_editables(cliente, admin_antojos) -> None:
    respuesta = cliente.post(
        "/catalog/products", json={**NUEVO, "existencias": 10}, headers=admin_antojos
    )

    assert respuesta.status_code == 422


@pytest.mark.parametrize(
    "cambio", [{"nombre": " "}, {"precio_centavos": -1}, {"tienda": "no-existe"}]
)
def test_registro_valida_datos(cliente, admin_antojos, cambio) -> None:
    respuesta = cliente.post("/catalog/products", json={**NUEVO, **cambio}, headers=admin_antojos)

    assert respuesta.status_code in {404, 422}


def test_registro_exige_administrar_la_tienda(cliente, datos_demo) -> None:
    comprador = registrar_y_entrar(cliente)
    otra = registrar_y_entrar(cliente, "fit@utb.edu.co")
    asignar_rol("fit@utb.edu.co", "admin_tienda", tienda_id=2)
    inventario = registrar_y_entrar(cliente, "inv@utb.edu.co")
    asignar_rol("inv@utb.edu.co", "responsable_inventario", tienda_id=1)

    assert cliente.post("/catalog/products", json=NUEVO).status_code == 401
    for cabecera in (comprador, otra, inventario):
        respuesta = cliente.post("/catalog/products", json=NUEVO, headers=cabecera)
        assert respuesta.status_code == 403


def test_nombre_repetido_en_la_tienda(cliente, admin_antojos) -> None:
    cliente.post("/catalog/products", json=NUEVO, headers=admin_antojos)

    repetido = cliente.post(
        "/catalog/products", json={**NUEVO, "nombre": "MANÍ con pasas"}, headers=admin_antojos
    )

    assert repetido.status_code == 409


def test_editar_y_deshabilitar_producto(cliente, admin_antojos) -> None:
    producto = _por_nombre(cliente, "De todito pequeño")
    ruta = f"/catalog/products/{producto['id']}"

    precio = cliente.patch(
        ruta, json={"precio_centavos": 210000, "precio_confirmado": True}, headers=admin_antojos
    )
    sin_presentacion = cliente.patch(ruta, json={"presentacion": None}, headers=admin_antojos)
    deshabilitado = cliente.patch(ruta, json={"activo": False}, headers=admin_antojos)

    assert precio.json()["precio_centavos"] == 210000
    assert precio.json()["precio_confirmado"] is True
    assert sin_presentacion.json()["presentacion"] is None
    assert deshabilitado.json()["activo"] is False
    assert _por_nombre(cliente, "De todito pequeño") is None


def test_editar_categoria_la_crea_en_la_tienda(cliente, admin_antojos) -> None:
    producto = _por_nombre(cliente, "Cheetos")

    respuesta = cliente.patch(
        f"/catalog/products/{producto['id']}", json={"categoria": "Picantes"}, headers=admin_antojos
    )

    assert respuesta.json()["categoria"] == "Picantes"


def test_editar_rechaza_campos_no_editables_y_permisos(cliente, admin_antojos) -> None:
    ajeno = _por_nombre(cliente, "Arroz oriental")
    propio = _por_nombre(cliente, "Cheetos")

    otra_tienda = cliente.patch(
        f"/catalog/products/{ajeno['id']}", json={"precio_centavos": 1}, headers=admin_antojos
    )
    no_editable = cliente.patch(
        f"/catalog/products/{propio['id']}", json={"tienda_id": 2}, headers=admin_antojos
    )
    inexistente = cliente.patch(
        "/catalog/products/999999", json={"precio_centavos": 1}, headers=admin_antojos
    )

    assert otra_tienda.status_code == 403
    assert no_editable.status_code == 422
    assert inexistente.status_code == 404


def test_registro_funciona_con_el_rol_de_aplicacion(datos_demo) -> None:
    """La API real corre como `tienda_app`: RLS debe permitir al admin de la tienda."""
    admin = ContextoSeguridad(
        usuario_id=1, roles=frozenset({"admin_tienda"}), tiendas_admin=frozenset({1})
    )
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        try:
            conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
            aplicar_contexto(conexion, admin)
            session = Session(bind=conexion)
            categoria_id = asegurar_categoria(session, tienda_id=1, nombre="Nueva")
            session.add(
                Producto(tienda_id=1, nombre="Nuevo", precio_centavos=1, categoria_id=categoria_id)
            )
            session.flush()
            producto = session.scalar(select(Producto).where(Producto.nombre == "Nuevo"))
            producto.activo = False
            session.flush()
            # Inactivo, sigue visible para quien administra la tienda.
            assert session.get(Producto, producto.id, populate_existing=True).activo is False
        finally:
            transaccion.rollback()

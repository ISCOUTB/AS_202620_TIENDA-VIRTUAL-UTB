"""Pedidos: creación idempotente por tienda, ciclo de vida y compensación."""

import os
import threading
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text, update
from sqlalchemy.orm import Session

from app.main import app
from app.modules.catalog.models import Producto
from app.modules.inventory.models import Existencia, MovimientoExistencias
from app.modules.orders import repository, service
from app.modules.orders.models import ESTADOS_PEDIDO, Pedido, PedidoHistorial
from app.modules.orders.schemas import EstadoPedido
from app.shared.database import SessionLocal, engine
from app.shared.seguridad import ContextoSeguridad, aplicar_contexto
from app.tareas import vencer_pedidos
from tests.conftest import asignar_rol, registrar_y_entrar

ROL_APP = os.getenv("APP_DB_USER", "tienda_app")


@pytest.fixture
def productos(datos_demo) -> dict[int, Producto]:
    """Primer producto con stock de las tiendas 1 y 2, por tienda."""
    with SessionLocal() as session:
        resultado = {}
        for tienda_id in (1, 2):
            resultado[tienda_id] = session.scalars(
                select(Producto)
                .join(Existencia, Existencia.producto_id == Producto.id)
                .where(Producto.tienda_id == tienda_id, Existencia.cantidad >= 5)
                .order_by(Producto.id)
                .limit(1)
            ).one()
        return resultado


@pytest.fixture
def comprador(cliente) -> dict[str, str]:
    return registrar_y_entrar(cliente)


@pytest.fixture
def tienda1(cliente) -> dict[str, str]:
    cabecera = registrar_y_entrar(cliente, "tienda1@utb.edu.co")
    asignar_rol("tienda1@utb.edu.co", "admin_tienda", tienda_id=1)
    return cabecera


def _llave() -> dict[str, str]:
    return {"Idempotency-Key": str(uuid.uuid4())}


def _stock(producto_id: int) -> int:
    with SessionLocal() as session:
        return session.get(Existencia, producto_id).cantidad


def _pedir(cliente, cabecera, items, llave=None, **extra):
    return cliente.post(
        "/orders",
        json={"items": items, **extra},
        headers={**cabecera, **(llave or _llave())},
    )


def test_estados_del_contrato_coinciden_con_el_modelo() -> None:
    assert EstadoPedido.__args__ == ESTADOS_PEDIDO


def test_crear_pedido_descuenta_stock_y_copia_precios(cliente, comprador, productos) -> None:
    producto = productos[1]
    antes = _stock(producto.id)

    respuesta = _pedir(
        cliente, comprador, [{"product_id": producto.id, "cantidad": 2}], hora_recogida="12:30"
    )

    assert respuesta.status_code == 201
    [pedido] = respuesta.json()
    assert pedido["estado"] == "pendiente_pago"
    assert pedido["tienda"] == "antojos"
    assert pedido["hora_recogida"] == "12:30:00"
    assert pedido["total_centavos"] == producto.precio_centavos * 2
    assert pedido["items"] == [
        {
            "product_id": producto.id,
            "product_nombre": producto.nombre,
            "cantidad": 2,
            "precio_unitario_centavos": producto.precio_centavos,
            "subtotal_centavos": producto.precio_centavos * 2,
        }
    ]
    assert _stock(producto.id) == antes - 2
    with SessionLocal() as session:
        [venta] = session.scalars(
            select(MovimientoExistencias).where(MovimientoExistencias.tipo == "venta")
        ).all()
        [historial] = session.scalars(select(PedidoHistorial)).all()
    assert (venta.pedido_id, venta.cambio) == (pedido["id"], -2)
    assert (historial.estado_anterior, historial.estado_nuevo) == (None, "pendiente_pago")


def test_carrito_con_dos_tiendas_crea_un_pedido_por_tienda(cliente, comprador, productos) -> None:
    items = [
        {"product_id": productos[1].id, "cantidad": 1},
        {"product_id": productos[2].id, "cantidad": 1},
        {"product_id": productos[1].id, "cantidad": 1},  # repetido: se suma
    ]

    respuesta = _pedir(cliente, comprador, items)

    assert respuesta.status_code == 201
    pedidos = respuesta.json()
    assert [p["tienda_id"] for p in pedidos] == [1, 2]
    assert pedidos[0]["items"][0]["cantidad"] == 2


def test_reintento_con_la_misma_llave_no_duplica(cliente, comprador, productos) -> None:
    producto = productos[1]
    llave = _llave()
    antes = _stock(producto.id)

    primera = _pedir(cliente, comprador, [{"product_id": producto.id, "cantidad": 1}], llave)
    segunda = _pedir(cliente, comprador, [{"product_id": producto.id, "cantidad": 1}], llave)

    assert (primera.status_code, segunda.status_code) == (201, 200)
    assert primera.json() == segunda.json()
    assert _stock(producto.id) == antes - 1
    with SessionLocal() as session:
        assert session.query(Pedido).count() == 1


def test_la_llave_es_por_cuenta(cliente, comprador, productos) -> None:
    llave = _llave()
    otro = registrar_y_entrar(cliente, "otro@utb.edu.co")
    items = [{"product_id": productos[1].id, "cantidad": 1}]

    primera = _pedir(cliente, comprador, items, llave)
    segunda = _pedir(cliente, otro, items, llave)

    assert (primera.status_code, segunda.status_code) == (201, 201)
    assert primera.json()[0]["id"] != segunda.json()[0]["id"]


def test_llave_vencida_es_rechazada(cliente, comprador, productos) -> None:
    llave = _llave()
    items = [{"product_id": productos[1].id, "cantidad": 1}]
    _pedir(cliente, comprador, items, llave)
    with SessionLocal() as session, session.begin():
        session.execute(update(Pedido).values(creado_en=datetime.now(UTC) - timedelta(hours=25)))

    respuesta = _pedir(cliente, comprador, items, llave)

    assert respuesta.status_code == 400


def test_llave_obligatoria_y_uuid(cliente, comprador, productos) -> None:
    items = {"items": [{"product_id": productos[1].id, "cantidad": 1}]}

    sin_llave = cliente.post("/orders", json=items, headers=comprador)
    mala = cliente.post("/orders", json=items, headers={**comprador, "Idempotency-Key": "abc"})

    assert sin_llave.status_code == mala.status_code == 422


def test_stock_insuficiente_no_crea_nada(cliente, comprador, productos) -> None:
    producto = productos[1]
    antes = _stock(producto.id)
    items = [
        {"product_id": productos[2].id, "cantidad": 1},
        {"product_id": producto.id, "cantidad": antes + 1},
    ]

    respuesta = _pedir(cliente, comprador, items)

    assert respuesta.status_code == 400
    assert producto.nombre in respuesta.json()["detail"]
    assert _stock(producto.id) == antes
    with SessionLocal() as session:
        assert session.query(Pedido).count() == 0


def test_producto_inexistente_o_inactivo(cliente, comprador, productos) -> None:
    with SessionLocal() as session, session.begin():
        session.execute(update(Producto).where(Producto.id == productos[1].id).values(activo=False))

    inactivo = _pedir(cliente, comprador, [{"product_id": productos[1].id, "cantidad": 1}])
    inexistente = _pedir(cliente, comprador, [{"product_id": 999999, "cantidad": 1}])

    assert inactivo.status_code == inexistente.status_code == 400


def test_pedir_exige_sesion(cliente, productos) -> None:
    respuesta = cliente.post(
        "/orders",
        json={"items": [{"product_id": productos[1].id, "cantidad": 1}]},
        headers=_llave(),
    )

    assert respuesta.status_code == 401


def test_comprador_ve_solo_sus_pedidos(cliente, comprador, productos) -> None:
    otro = registrar_y_entrar(cliente, "otro@utb.edu.co")
    [mio] = _pedir(cliente, comprador, [{"product_id": productos[1].id, "cantidad": 1}]).json()
    [ajeno] = _pedir(cliente, otro, [{"product_id": productos[1].id, "cantidad": 1}]).json()

    lista = cliente.get("/orders", headers=comprador).json()

    assert [p["id"] for p in lista] == [mio["id"]]
    assert cliente.get(f"/orders/{mio['id']}", headers=comprador).status_code == 200
    assert cliente.get(f"/orders/{ajeno['id']}", headers=comprador).status_code == 404


def test_cola_de_la_tienda(cliente, comprador, tienda1, productos) -> None:
    items = [
        {"product_id": productos[1].id, "cantidad": 1},
        {"product_id": productos[2].id, "cantidad": 1},
    ]
    _pedir(cliente, comprador, items)

    cola = cliente.get("/orders", params={"tienda_id": 1}, headers=tienda1)
    ajena = cliente.get("/orders", params={"tienda_id": 2}, headers=tienda1)
    filtrada = cliente.get(
        "/orders", params={"tienda_id": 1, "estado": "pagado"}, headers=tienda1
    )

    assert [p["tienda_id"] for p in cola.json()] == [1]
    assert ajena.status_code == 403
    assert filtrada.json() == []


def test_ciclo_de_vida_en_la_tienda(cliente, comprador, tienda1, productos) -> None:
    [pedido] = _pedir(cliente, comprador, [{"product_id": productos[1].id, "cantidad": 1}]).json()
    ruta = f"/orders/{pedido['id']}/estado"

    saltar = cliente.post(ruta, json={"estado": "listo"}, headers=tienda1)
    por_comprador = cliente.post(ruta, json={"estado": "pagado"}, headers=comprador)
    estados = [
        cliente.post(ruta, json={"estado": e}, headers=tienda1).json()["estado"]
        for e in ("pagado", "en_preparacion", "listo", "entregado")
    ]

    assert saltar.status_code == 400
    assert por_comprador.status_code == 403
    assert estados == ["pagado", "en_preparacion", "listo", "entregado"]
    with SessionLocal() as session:
        assert session.query(PedidoHistorial).count() == 5


def test_comprador_cancela_antes_de_pagar_y_repone_stock(cliente, comprador, productos) -> None:
    producto = productos[1]
    antes = _stock(producto.id)
    [pedido] = _pedir(cliente, comprador, [{"product_id": producto.id, "cantidad": 3}]).json()

    respuesta = cliente.post(f"/orders/{pedido['id']}/cancel", headers=comprador)

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "cancelado"
    assert _stock(producto.id) == antes
    with SessionLocal() as session:
        cancelacion = session.scalars(
            select(PedidoHistorial).where(PedidoHistorial.estado_nuevo == "cancelado")
        ).one()
    assert cancelacion.comentario == "Cancelado por el comprador"
    otra_vez = cliente.post(f"/orders/{pedido['id']}/cancel", headers=comprador)
    assert otra_vez.status_code == 400


def test_comprador_no_cancela_un_pedido_pagado_pero_la_tienda_si(
    cliente, comprador, tienda1, productos
) -> None:
    [pedido] = _pedir(cliente, comprador, [{"product_id": productos[1].id, "cantidad": 1}]).json()
    cliente.post(f"/orders/{pedido['id']}/estado", json={"estado": "pagado"}, headers=tienda1)

    comprador_cancela = cliente.post(f"/orders/{pedido['id']}/cancel", headers=comprador)
    tienda_cancela = cliente.post(
        f"/orders/{pedido['id']}/cancel", json={"motivo": "Sin existencias reales"}, headers=tienda1
    )

    assert comprador_cancela.status_code == 400
    assert tienda_cancela.status_code == 200


def test_vencimiento_cancela_pendientes_de_mas_de_24h(cliente, comprador, productos) -> None:
    producto = productos[1]
    antes = _stock(producto.id)
    [viejo] = _pedir(cliente, comprador, [{"product_id": producto.id, "cantidad": 2}]).json()
    [reciente] = _pedir(cliente, comprador, [{"product_id": producto.id, "cantidad": 1}]).json()
    with SessionLocal() as session, session.begin():
        session.execute(
            update(Pedido)
            .where(Pedido.id == viejo["id"])
            .values(creado_en=datetime.now(UTC) - timedelta(hours=25))
        )

    assert vencer_pedidos.main() == 1
    assert vencer_pedidos.main() == 0  # idempotente

    estados = {p["id"]: p["estado"] for p in cliente.get("/orders", headers=comprador).json()}
    assert estados == {viejo["id"]: "cancelado", reciente["id"]: "pendiente_pago"}
    assert _stock(producto.id) == antes - 1
    with SessionLocal() as session:
        cancelacion = session.scalars(
            select(PedidoHistorial).where(PedidoHistorial.estado_nuevo == "cancelado")
        ).one()
    assert cancelacion.usuario_id is None


def test_flujo_completo_con_el_rol_de_aplicacion(productos) -> None:
    """La API real corre como `tienda_app`: RLS debe permitir crear y cancelar."""
    with SessionLocal() as preparacion:
        usuario_id = preparacion.execute(
            text(
                "INSERT INTO usuarios (nombre, correo, hash_contrasena)"
                " VALUES ('Ana', 'ana@utb.edu.co', 'x') RETURNING id"
            )
        ).scalar_one()
        preparacion.commit()
    comprador = ContextoSeguridad(usuario_id=usuario_id, roles=frozenset({"comprador"}))
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        try:
            conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
            aplicar_contexto(conexion, comprador)
            session = Session(bind=conexion)
            resultado = service.crear(
                session,
                usuario_id=usuario_id,
                items=[(productos[1].id, 1), (productos[2].id, 1)],
                hora_recogida=None,
                clave=uuid.uuid4(),
            )
            assert len(resultado.pedidos) == 2
            pedido = resultado.pedidos[0]
            service.cancelar(
                session, pedido, usuario_id=usuario_id, comentario="x", por_comprador=True
            )
            assert repository.obtener(session, pedido.id).estado == "cancelado"
        finally:
            transaccion.rollback()


def test_vencimiento_con_el_rol_de_aplicacion(cliente, comprador, productos) -> None:
    [pedido] = _pedir(cliente, comprador, [{"product_id": productos[1].id, "cantidad": 1}]).json()
    with SessionLocal() as session, session.begin():
        session.execute(
            update(Pedido).values(creado_en=datetime.now(UTC) - timedelta(hours=25))
        )
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        try:
            conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
            aplicar_contexto(conexion, vencer_pedidos.SISTEMA)
            assert service.vencer_pendientes(Session(bind=conexion)) == 1
        finally:
            transaccion.rollback()


def test_ultima_unidad_la_gana_un_solo_comprador(cliente, productos) -> None:
    """F-03: dos compras simultáneas de la última unidad; solo una prospera."""
    producto = productos[1]
    with SessionLocal() as session, session.begin():
        session.execute(
            update(Existencia).where(Existencia.producto_id == producto.id).values(cantidad=1)
        )
    cabeceras = [registrar_y_entrar(cliente, f"c{i}@utb.edu.co") for i in range(2)]
    barrera = threading.Barrier(2)
    codigos: list[int] = []

    def comprar(cabecera: dict[str, str]) -> None:
        with TestClient(app) as propio:
            barrera.wait()
            codigos.append(
                _pedir(propio, cabecera, [{"product_id": producto.id, "cantidad": 1}]).status_code
            )

    hilos = [threading.Thread(target=comprar, args=(c,)) for c in cabeceras]
    for hilo in hilos:
        hilo.start()
    for hilo in hilos:
        hilo.join()

    assert sorted(codigos) == [201, 400]
    assert _stock(producto.id) == 0

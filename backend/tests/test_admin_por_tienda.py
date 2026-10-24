"""Cada tienda la gestiona su admin; el admin general solo supervisa (ADR 0016).

Matriz de permisos por la API (admin de la tienda, admin de otra tienda y
admin general) y la misma regla en la base con el rol de aplicación (RLS).
"""

import os
import uuid

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError

from app.modules.catalog.models import Producto
from app.modules.identity.models import Usuario, UsuarioRol
from app.modules.inventory.models import Existencia
from app.seed import TIENDAS, correo_admin_tienda, sembrar_admins_tienda
from app.shared.database import SessionLocal, engine
from app.shared.seguridad import SOLO_SUPERVISA, ContextoSeguridad, aplicar_contexto
from app.tareas.vencer_pedidos import SISTEMA
from tests.conftest import asignar_rol, registrar_y_entrar

ROL_APP = os.getenv("APP_DB_USER", "tienda_app")


@pytest.fixture
def escena(cliente, datos_demo) -> dict:
    """Un producto con stock en las tiendas 1 y 2, sus admins, el general y un pedido en la 1."""
    with SessionLocal() as session:
        productos = {
            tienda_id: session.scalars(
                select(Producto)
                .join(Existencia, Existencia.producto_id == Producto.id)
                .where(Producto.tienda_id == tienda_id, Existencia.cantidad >= 5)
                .order_by(Producto.id)
                .limit(1)
            ).one()
            for tienda_id in (1, 2)
        }
    admin_1 = registrar_y_entrar(cliente, "admin1@utb.edu.co")
    asignar_rol("admin1@utb.edu.co", "admin_tienda", tienda_id=1)
    admin_2 = registrar_y_entrar(cliente, "admin2@utb.edu.co")
    asignar_rol("admin2@utb.edu.co", "admin_tienda", tienda_id=2)
    general = registrar_y_entrar(cliente, "general@utb.edu.co")
    asignar_rol("general@utb.edu.co", "admin_general")
    comprador = registrar_y_entrar(cliente, "ana@utb.edu.co")
    pedido = cliente.post(
        "/orders",
        json={"items": [{"product_id": productos[1].id, "cantidad": 1}]},
        headers={**comprador, "Idempotency-Key": str(uuid.uuid4())},
    ).json()[0]
    return {
        "p1": productos[1].id,
        "p2": productos[2].id,
        "admin_1": admin_1,
        "admin_2": admin_2,
        "general": general,
        "comprador": comprador,
        "pedido": pedido["id"],
    }


def _escrituras(cliente, escena, cabecera) -> dict[str, int]:
    """Cada escritura de gestión sobre la tienda 1, con su código de respuesta."""
    p1, pedido = escena["p1"], escena["pedido"]
    return {
        "ajustar": cliente.post(
            f"/inventory/{p1}/adjust",
            json={"delta": 1, "motivo": "conteo"},
            headers=cabecera,
        ).status_code,
        "fijar": cliente.put(
            f"/inventory/{p1}", json={"cantidad": 7}, headers=cabecera
        ).status_code,
        "editar": cliente.patch(
            f"/catalog/products/{p1}", json={"descripcion": "nueva"}, headers=cabecera
        ).status_code,
        "crear": cliente.post(
            "/catalog/products",
            json={
                "tienda": "antojos",
                "nombre": f"Nuevo {uuid.uuid4().hex[:6]}",
                "descripcion": "x",
                "precio_centavos": 100,
            },
            headers=cabecera,
        ).status_code,
        "avanzar": cliente.post(
            f"/orders/{pedido}/estado", json={"estado": "pagado"}, headers=cabecera
        ).status_code,
    }


def test_el_admin_de_la_tienda_gestiona_todo_lo_suyo(cliente, escena) -> None:
    codigos = _escrituras(cliente, escena, escena["admin_1"])

    assert codigos == {
        "ajustar": 200,
        "fijar": 200,
        "editar": 200,
        "crear": 201,
        "avanzar": 200,
    }
    cola = cliente.get("/orders", params={"tienda_id": 1}, headers=escena["admin_1"])
    assert [p["id"] for p in cola.json()] == [escena["pedido"]]


def test_el_admin_de_otra_tienda_no_toca_nada(cliente, escena) -> None:
    codigos = _escrituras(cliente, escena, escena["admin_2"])

    # El pedido ajeno ni se ve (404, no revela que existe); el resto, 403.
    assert codigos == {
        "ajustar": 403,
        "fijar": 403,
        "editar": 403,
        "crear": 403,
        "avanzar": 404,
    }
    assert (
        cliente.get(
            "/orders", params={"tienda_id": 1}, headers=escena["admin_2"]
        ).status_code
        == 403
    )
    cancelar = cliente.post(
        f"/orders/{escena['pedido']}/cancel", headers=escena["admin_2"]
    )
    assert cancelar.status_code == 404


def test_el_admin_general_supervisa_pero_no_escribe(cliente, escena) -> None:
    antes = cliente.get(f"/inventory/{escena['p1']}", headers=escena["general"]).json()[
        "cantidad"
    ]

    codigos = _escrituras(cliente, escena, escena["general"])
    cancelar = cliente.post(
        f"/orders/{escena['pedido']}/cancel", headers=escena["general"]
    )

    assert codigos == {
        "ajustar": 403,
        "fijar": 403,
        "editar": 403,
        "crear": 403,
        "avanzar": 403,
    }
    assert cancelar.status_code == 403
    assert cancelar.json()["detail"] == SOLO_SUPERVISA
    despues = cliente.get(
        f"/inventory/{escena['p1']}", headers=escena["general"]
    ).json()["cantidad"]
    assert despues == antes


def test_el_admin_general_lee_lo_de_todas_las_tiendas(cliente, escena) -> None:
    general = escena["general"]
    with SessionLocal() as session, session.begin():
        session.get(Producto, escena["p2"]).activo = False

    cola = cliente.get("/orders", params={"tienda_id": 1}, headers=general)
    pedido = cliente.get(f"/orders/{escena['pedido']}", headers=general)
    inactivo = cliente.get(f"/catalog/products/{escena['p2']}", headers=general)
    todos = cliente.get(
        "/catalog/products", params={"incluir_inactivos": True}, headers=general
    )

    assert [p["id"] for p in cola.json()] == [escena["pedido"]]
    assert pedido.status_code == 200
    assert inactivo.status_code == 200
    assert escena["p2"] in {p["id"] for p in todos.json()}


def test_el_comprador_sigue_cancelando_su_pedido(cliente, escena) -> None:
    respuesta = cliente.post(
        f"/orders/{escena['pedido']}/cancel", headers=escena["comprador"]
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "cancelado"


# ───────────────────────────── RLS directo ─────────────────────────────


def _filas_actualizadas(contexto: ContextoSeguridad, sql: str, **parametros) -> int:
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        try:
            conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
            aplicar_contexto(conexion, contexto)
            return conexion.execute(text(sql), parametros).rowcount
        finally:
            transaccion.rollback()


GENERAL = ContextoSeguridad(usuario_id=1, roles=frozenset({"admin_general"}))
ADMIN_1 = ContextoSeguridad(
    usuario_id=2, roles=frozenset({"admin_tienda"}), tiendas_admin=frozenset({1})
)


@pytest.mark.parametrize(
    "sql",
    [
        "UPDATE productos SET descripcion = 'x' WHERE id = :producto",
        "UPDATE existencias SET cantidad = 99 WHERE producto_id = :producto",
    ],
)
def test_rls_el_general_no_escribe_y_el_admin_solo_en_su_tienda(escena, sql) -> None:
    assert _filas_actualizadas(GENERAL, sql, producto=escena["p1"]) == 0
    assert _filas_actualizadas(ADMIN_1, sql, producto=escena["p2"]) == 0
    assert _filas_actualizadas(ADMIN_1, sql, producto=escena["p1"]) == 1


def test_rls_solo_la_tienda_y_el_sistema_mueven_pedidos(escena) -> None:
    sql = "UPDATE pedidos SET estado = 'cancelado' WHERE id = :pedido"

    assert _filas_actualizadas(GENERAL, sql, pedido=escena["pedido"]) == 0
    assert _filas_actualizadas(ADMIN_1, sql, pedido=escena["pedido"]) == 1
    assert _filas_actualizadas(SISTEMA, sql, pedido=escena["pedido"]) == 1


def test_rls_el_general_lee_pedidos_y_productos_inactivos(escena) -> None:
    with SessionLocal() as session, session.begin():
        session.get(Producto, escena["p2"]).activo = False
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        try:
            conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
            aplicar_contexto(conexion, GENERAL)
            pedidos = set(conexion.scalars(text("SELECT id FROM pedidos")))
            productos = set(conexion.scalars(text("SELECT id FROM productos")))
        finally:
            transaccion.rollback()
    assert escena["pedido"] in pedidos
    assert escena["p2"] in productos


def test_rls_solo_el_sistema_mueve_inventario_sin_usuario(escena) -> None:
    sql = "SELECT inventario_reponer(:producto, 1, NULL)"
    sin_usuario = ContextoSeguridad(roles=frozenset({"admin_general"}))

    with engine.connect() as conexion:
        transaccion = conexion.begin()
        try:
            conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
            aplicar_contexto(conexion, SISTEMA)
            assert (
                conexion.execute(text(sql), {"producto": escena["p1"]}).scalar_one() > 0
            )
        finally:
            transaccion.rollback()
    with pytest.raises(DBAPIError) as error, engine.connect() as conexion:
        conexion.begin()
        conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
        aplicar_contexto(conexion, sin_usuario)
        conexion.execute(text(sql), {"producto": escena["p1"]})
    assert error.value.orig.pgcode == "42501"


# ───────────────────────────── Siembra ─────────────────────────────


def test_siembra_un_admin_por_tienda(cliente, datos_demo, monkeypatch) -> None:
    monkeypatch.setenv("SEED_TIENDAS_PASSWORD", "Tienda-demo-1")

    for _ in range(2):  # idempotente
        with SessionLocal() as session, session.begin():
            assert sembrar_admins_tienda(session) == {"admins_tienda": len(TIENDAS)}

    with SessionLocal() as session:
        roles = session.execute(
            select(Usuario.correo, UsuarioRol.rol_codigo, UsuarioRol.tienda_id)
            .join(UsuarioRol, UsuarioRol.usuario_id == Usuario.id)
            .where(Usuario.correo.like("admin.%"))
        ).all()
    assert len(roles) == len(TIENDAS)
    assert {r.rol_codigo for r in roles} == {"admin_tienda"}
    assert len({r.tienda_id for r in roles}) == len(TIENDAS)

    correo = correo_admin_tienda("antojos")
    token = cliente.post(
        "/identity/login", json={"email": correo, "password": "Tienda-demo-1"}
    )
    me = cliente.get(
        "/identity/me",
        headers={"Authorization": f"Bearer {token.json()['access_token']}"},
    )
    assert me.json()["roles"] == [{"codigo": "admin_tienda", "tienda_id": 1}]


def test_siembra_sin_variable_no_crea_cuentas(datos_demo, monkeypatch) -> None:
    monkeypatch.delenv("SEED_TIENDAS_PASSWORD", raising=False)

    with SessionLocal() as session, session.begin():
        assert sembrar_admins_tienda(session) == {}

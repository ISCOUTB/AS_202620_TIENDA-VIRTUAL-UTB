"""Políticas RLS de la migración 0002, ejercidas con el rol de aplicación (ADR 0014).

Los datos se preparan como dueño (que omite RLS). Cada comprobación abre una
transacción, cambia a `tienda_app` con `SET LOCAL ROLE`, fija el principal con
el mismo `aplicar_contexto` que usa la API y al final hace ROLLBACK.
"""

import os
import uuid
from collections.abc import Iterator
from contextlib import contextmanager

import pytest
from sqlalchemy import Connection, text
from sqlalchemy.exc import DBAPIError

from app.modules.catalog.models import Producto, Tienda
from app.modules.identity.models import Usuario
from app.modules.inventory.models import Existencia
from app.modules.orders.models import Pedido
from app.shared.database import SessionLocal, engine
from app.shared.seguridad import ANONIMO, CLAVE_CONTEXTO, ContextoSeguridad, aplicar_contexto

ROL_APP = os.getenv("APP_DB_USER", "tienda_app")
PERMISO_DENEGADO = "42501"  # insufficient_privilege (GRANT o WITH CHECK de RLS)


@contextmanager
def como_app(contexto: ContextoSeguridad = ANONIMO) -> Iterator[Connection]:
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        try:
            conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
            aplicar_contexto(conexion, contexto)
            yield conexion
        finally:
            transaccion.rollback()


def _codigo(error: pytest.ExceptionInfo[DBAPIError]) -> str:
    return error.value.orig.pgcode


@pytest.fixture
def escenario() -> dict[str, int]:
    """Dos tiendas, dos compradores con un pedido cada uno en la tienda X."""
    with SessionLocal() as sesion, sesion.begin():
        tienda_x = Tienda(identificador="tienda-x", nombre="X")
        tienda_y = Tienda(identificador="tienda-y", nombre="Y")
        sesion.add_all([tienda_x, tienda_y])
        sesion.flush()
        px_activo = Producto(tienda_id=tienda_x.id, nombre="Activo X", precio_centavos=100)
        px_inactivo = Producto(
            tienda_id=tienda_x.id, nombre="Inactivo X", precio_centavos=100, activo=False
        )
        py_activo = Producto(tienda_id=tienda_y.id, nombre="Activo Y", precio_centavos=100)
        comprador_a = Usuario(nombre="Ana", correo="ana@utb.edu.co", hash_contrasena="hash-a")
        comprador_b = Usuario(nombre="Beto", correo="beto@utb.edu.co", hash_contrasena="hash-b")
        sesion.add_all([px_activo, px_inactivo, py_activo, comprador_a, comprador_b])
        sesion.flush()
        sesion.add_all(
            [
                Existencia(producto_id=px_activo.id, cantidad=10),
                Existencia(producto_id=py_activo.id, cantidad=5),
            ]
        )
        pedido_a = Pedido(
            usuario_id=comprador_a.id,
            tienda_id=tienda_x.id,
            total_centavos=100,
            clave_idempotencia=uuid.uuid4(),
        )
        pedido_b = Pedido(
            usuario_id=comprador_b.id,
            tienda_id=tienda_x.id,
            total_centavos=100,
            clave_idempotencia=uuid.uuid4(),
        )
        sesion.add_all([pedido_a, pedido_b])
        sesion.flush()
        return {
            "tienda_x": tienda_x.id,
            "tienda_y": tienda_y.id,
            "px_activo": px_activo.id,
            "px_inactivo": px_inactivo.id,
            "py_activo": py_activo.id,
            "comprador_a": comprador_a.id,
            "comprador_b": comprador_b.id,
            "pedido_a": pedido_a.id,
            "pedido_b": pedido_b.id,
        }


def _comprador(usuario_id: int) -> ContextoSeguridad:
    return ContextoSeguridad(usuario_id=usuario_id, roles=frozenset({"comprador"}))


def test_comprador_solo_ve_sus_pedidos(escenario) -> None:
    with como_app(_comprador(escenario["comprador_a"])) as conexion:
        pedidos = set(conexion.scalars(text("SELECT id FROM pedidos")))
    assert pedidos == {escenario["pedido_a"]}


def test_personal_de_la_tienda_ve_todos_sus_pedidos(escenario) -> None:
    responsable = ContextoSeguridad(
        usuario_id=99,
        roles=frozenset({"responsable_inventario"}),
        tiendas_inventario=frozenset({escenario["tienda_x"]}),
    )
    with como_app(responsable) as conexion:
        pedidos = set(conexion.scalars(text("SELECT id FROM pedidos")))
    assert pedidos == {escenario["pedido_a"], escenario["pedido_b"]}


def test_anonimo_solo_ve_productos_activos_y_ningun_usuario(escenario) -> None:
    with como_app() as conexion:
        productos = set(conexion.scalars(text("SELECT id FROM productos")))
        usuarios = conexion.scalars(text("SELECT id FROM usuarios")).all()
    assert productos == {escenario["px_activo"], escenario["py_activo"]}
    assert usuarios == []


def test_admin_de_tienda_solo_modifica_su_tienda(escenario) -> None:
    admin_x = ContextoSeguridad(
        usuario_id=50, roles=frozenset({"admin_tienda"}), tiendas_admin=frozenset({escenario["tienda_x"]})
    )
    actualizar = text("UPDATE productos SET precio_centavos = 200 WHERE id = :id")
    with como_app(admin_x) as conexion:
        assert conexion.execute(actualizar, {"id": escenario["py_activo"]}).rowcount == 0
        assert conexion.execute(actualizar, {"id": escenario["px_activo"]}).rowcount == 1
        # El inactivo de su tienda también es suyo.
        assert conexion.execute(actualizar, {"id": escenario["px_inactivo"]}).rowcount == 1

    # Tampoco puede mover un producto suyo a otra tienda.
    with como_app(admin_x) as conexion, pytest.raises(DBAPIError) as error:
        conexion.execute(
            text("UPDATE productos SET tienda_id = :otra WHERE id = :id"),
            {"otra": escenario["tienda_y"], "id": escenario["px_activo"]},
        )
    assert _codigo(error) == PERMISO_DENEGADO


def test_responsable_de_inventario_solo_ajusta_su_tienda(escenario) -> None:
    responsable_x = ContextoSeguridad(
        usuario_id=60,
        roles=frozenset({"responsable_inventario"}),
        tiendas_inventario=frozenset({escenario["tienda_x"]}),
    )
    ajustar = text("UPDATE existencias SET cantidad = 3 WHERE producto_id = :id")
    with como_app(responsable_x) as conexion:
        assert conexion.execute(ajustar, {"id": escenario["px_activo"]}).rowcount == 1
        assert conexion.execute(ajustar, {"id": escenario["py_activo"]}).rowcount == 0
        # No administra el catálogo: no puede cambiar precios.
        assert (
            conexion.execute(
                text("UPDATE productos SET precio_centavos = 1 WHERE id = :id"),
                {"id": escenario["px_activo"]},
            ).rowcount
            == 0
        )


def test_comprador_descuenta_solo_mediante_la_funcion(escenario) -> None:
    contexto = _comprador(escenario["comprador_a"])
    producto = escenario["px_activo"]
    with como_app(contexto) as conexion:
        directo = conexion.execute(
            text("UPDATE existencias SET cantidad = 0 WHERE producto_id = :id"), {"id": producto}
        )
        assert directo.rowcount == 0

        restante = conexion.scalar(
            text("SELECT inventario_descontar(:id, 3, :pedido)"),
            {"id": producto, "pedido": escenario["pedido_a"]},
        )
        assert restante == 7

        conexion.execute(text("RESET ROLE"))  # verificar como dueño
        movimiento = conexion.execute(
            text(
                "SELECT tipo, cambio, cantidad_resultante, pedido_id, usuario_id"
                " FROM movimientos_existencias WHERE producto_id = :id AND tipo = 'venta'"
            ),
            {"id": producto},
        ).one()
        version = conexion.scalar(
            text("SELECT version FROM existencias WHERE producto_id = :id"), {"id": producto}
        )
    assert tuple(movimiento) == ("venta", -3, 7, escenario["pedido_a"], escenario["comprador_a"])
    assert version == 2

    with como_app(contexto) as conexion, pytest.raises(DBAPIError) as error:
        conexion.execute(text("SELECT inventario_descontar(:id, 999, NULL)"), {"id": producto})
    assert _codigo(error) == "23514"  # check_violation: no queda negativo


def test_anonimo_no_puede_descontar(escenario) -> None:
    with como_app() as conexion, pytest.raises(DBAPIError) as error:
        conexion.execute(
            text("SELECT inventario_descontar(:id, 1, NULL)"), {"id": escenario["px_activo"]}
        )
    assert _codigo(error) == PERMISO_DENEGADO


def test_comprador_cancela_su_pedido_pero_no_cambia_otro_estado(escenario) -> None:
    contexto = _comprador(escenario["comprador_a"])
    cambiar = text("UPDATE pedidos SET estado = :estado WHERE id = :id")
    with como_app(contexto) as conexion:
        ajeno = conexion.execute(cambiar, {"estado": "cancelado", "id": escenario["pedido_b"]})
        propio = conexion.execute(cambiar, {"estado": "cancelado", "id": escenario["pedido_a"]})
    assert ajeno.rowcount == 0
    assert propio.rowcount == 1

    with como_app(contexto) as conexion, pytest.raises(DBAPIError) as error:
        conexion.execute(cambiar, {"estado": "pagado", "id": escenario["pedido_a"]})
    assert _codigo(error) == PERMISO_DENEGADO


def test_nadie_borra_pedidos_con_el_rol_de_aplicacion(escenario) -> None:
    admin_general = ContextoSeguridad(usuario_id=1, roles=frozenset({"admin_general"}))
    with como_app(admin_general) as conexion, pytest.raises(DBAPIError) as error:
        conexion.execute(text("DELETE FROM pedidos WHERE id = :id"), {"id": escenario["pedido_a"]})
    assert _codigo(error) == PERMISO_DENEGADO


def test_credenciales_se_consultan_sin_contexto(escenario) -> None:
    with como_app() as conexion:
        fila = conexion.execute(
            text("SELECT id, hash_contrasena, activo FROM identidad_buscar_credenciales(:correo)"),
            {"correo": "ANA@utb.edu.co"},
        ).one()
    assert tuple(fila) == (escenario["comprador_a"], "hash-a", True)


def test_registro_crea_comprador_y_su_rol() -> None:
    with como_app() as conexion:
        usuario_id = conexion.scalar(
            text("SELECT identidad_registrar_comprador('Carla', 'carla@utb.edu.co', 'hash-c')")
        )
        conexion.execute(text("RESET ROLE"))
        roles = conexion.scalars(
            text("SELECT rol_codigo FROM usuario_roles WHERE usuario_id = :id"), {"id": usuario_id}
        ).all()
    assert roles == ["comprador"]


def test_la_sesion_de_la_api_fija_el_contexto_en_cada_transaccion() -> None:
    contexto = ContextoSeguridad(usuario_id=7, roles=frozenset({"comprador"}))
    with SessionLocal(info={CLAVE_CONTEXTO: contexto}) as sesion:
        assert sesion.scalar(text("SELECT seg_usuario_id()")) == 7
        assert sesion.scalar(text("SELECT seg_tiene_rol('comprador')")) is True
        sesion.commit()
        # Nueva transacción: el evento after_begin vuelve a fijar el principal.
        assert sesion.scalar(text("SELECT seg_usuario_id()")) == 7
    with SessionLocal() as sesion:
        assert sesion.scalar(text("SELECT seg_usuario_id()")) is None


def test_rol_de_aplicacion_no_lee_el_hash_ni_alembic_version(escenario) -> None:
    contexto = _comprador(escenario["comprador_a"])
    with como_app(contexto) as conexion, pytest.raises(DBAPIError) as error:
        conexion.execute(text("SELECT hash_contrasena FROM usuarios"))
    assert _codigo(error) == PERMISO_DENEGADO

    with como_app(contexto) as conexion, pytest.raises(DBAPIError) as error:
        conexion.execute(text("SELECT * FROM alembic_version"))
    assert _codigo(error) == PERMISO_DENEGADO

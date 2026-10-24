"""Consulta por producto y ajustes protegidos de inventario (contrato de diseño)."""

import os

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from app.modules.catalog.models import Producto
from app.modules.inventory import repository
from app.modules.inventory.models import Existencia, MovimientoExistencias
from app.shared.database import SessionLocal, engine
from app.shared.seguridad import ContextoSeguridad, aplicar_contexto
from tests.conftest import asignar_rol, registrar_y_entrar

ROL_APP = os.getenv("APP_DB_USER", "tienda_app")


@pytest.fixture
def producto(datos_demo) -> Producto:
    """Un producto de la primera tienda con existencias sembradas."""
    with SessionLocal() as session:
        return session.scalars(select(Producto).where(Producto.tienda_id == 1).limit(1)).one()


@pytest.fixture
def responsable(cliente, producto) -> dict[str, str]:
    cabecera = registrar_y_entrar(cliente, "inventario@utb.edu.co")
    asignar_rol("inventario@utb.edu.co", "responsable_inventario", tienda_id=producto.tienda_id)
    return cabecera


def _cantidad(producto_id: int) -> int:
    with SessionLocal() as session:
        return session.get(Existencia, producto_id).cantidad


def _movimientos(producto_id: int, tipo: str) -> list[MovimientoExistencias]:
    with SessionLocal() as session:
        return list(
            session.scalars(
                select(MovimientoExistencias).where(
                    MovimientoExistencias.producto_id == producto_id,
                    MovimientoExistencias.tipo == tipo,
                )
            )
        )


def test_consulta_por_producto_exige_sesion(cliente, producto) -> None:
    assert cliente.get(f"/inventory/{producto.id}").status_code == 401

    respuesta = cliente.get(f"/inventory/{producto.id}", headers=registrar_y_entrar(cliente))

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["product_nombre"] == producto.nombre
    assert cuerpo["cantidad"] == _cantidad(producto.id)


def test_consulta_de_producto_inexistente_es_404(cliente, datos_demo) -> None:
    respuesta = cliente.get("/inventory/999999", headers=registrar_y_entrar(cliente))

    assert respuesta.status_code == 404


def test_comprador_no_puede_ajustar(cliente, producto) -> None:
    cabecera = registrar_y_entrar(cliente)

    put = cliente.put(f"/inventory/{producto.id}", json={"cantidad": 1}, headers=cabecera)
    ajuste = cliente.post(
        f"/inventory/{producto.id}/adjust", json={"delta": 1, "motivo": "x"}, headers=cabecera
    )

    assert put.status_code == ajuste.status_code == 403


def test_responsable_de_otra_tienda_no_puede_ajustar(cliente, producto) -> None:
    cabecera = registrar_y_entrar(cliente, "otro@utb.edu.co")
    asignar_rol("otro@utb.edu.co", "responsable_inventario", tienda_id=producto.tienda_id + 1)

    respuesta = cliente.put(f"/inventory/{producto.id}", json={"cantidad": 1}, headers=cabecera)

    assert respuesta.status_code == 403


def test_put_fija_la_cantidad_y_registra_el_ajuste(cliente, producto, responsable) -> None:
    respuesta = cliente.put(
        f"/inventory/{producto.id}",
        json={"cantidad": 50, "motivo": "Conteo del lunes"},
        headers=responsable,
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["cantidad"] == 50
    assert _cantidad(producto.id) == 50
    [ajuste] = _movimientos(producto.id, "ajuste")
    assert ajuste.motivo == "Conteo del lunes"
    assert ajuste.cantidad_resultante == 50
    assert ajuste.usuario_id is not None


def test_put_con_la_misma_cantidad_no_registra_movimiento(cliente, producto, responsable) -> None:
    actual = _cantidad(producto.id)

    respuesta = cliente.put(
        f"/inventory/{producto.id}", json={"cantidad": actual}, headers=responsable
    )

    assert respuesta.status_code == 200
    assert _movimientos(producto.id, "ajuste") == []


def test_put_rechaza_cantidad_negativa(cliente, producto, responsable) -> None:
    respuesta = cliente.put(f"/inventory/{producto.id}", json={"cantidad": -1}, headers=responsable)

    assert respuesta.status_code == 422


def test_ajuste_relativo(cliente, producto, responsable) -> None:
    inicial = _cantidad(producto.id)

    respuesta = cliente.post(
        f"/inventory/{producto.id}/adjust",
        json={"delta": -2, "motivo": "Merma"},
        headers=responsable,
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["cantidad"] == inicial - 2
    [ajuste] = _movimientos(producto.id, "ajuste")
    assert (ajuste.cambio, ajuste.motivo) == (-2, "Merma")


@pytest.mark.parametrize("delta", [0, -10_000])
def test_ajuste_invalido_es_400(cliente, producto, responsable, delta) -> None:
    respuesta = cliente.post(
        f"/inventory/{producto.id}/adjust",
        json={"delta": delta, "motivo": "Prueba"},
        headers=responsable,
    )

    assert respuesta.status_code == 400
    assert _movimientos(producto.id, "ajuste") == []


def test_ajuste_exige_motivo(cliente, producto, responsable) -> None:
    respuesta = cliente.post(
        f"/inventory/{producto.id}/adjust", json={"delta": 1}, headers=responsable
    )

    assert respuesta.status_code == 422


def test_admin_de_tienda_tambien_gestiona_su_inventario(cliente, producto) -> None:
    cabecera = registrar_y_entrar(cliente, "admin@utb.edu.co")
    asignar_rol("admin@utb.edu.co", "admin_tienda", tienda_id=producto.tienda_id)

    respuesta = cliente.put(f"/inventory/{producto.id}", json={"cantidad": 3}, headers=cabecera)

    assert respuesta.status_code == 200


def test_ajustes_concurrentes_no_se_pisan(producto) -> None:
    """Bloqueo optimista (F-03): el segundo ajuste sobre la misma versión falla."""
    with SessionLocal() as primera, SessionLocal() as segunda:
        # Se conservan las referencias: el mapa de identidad es débil y, sin
        # ellas, `ajustar` releería la fila ya actualizada.
        leida_primera = repository.obtener(primera, producto.id)
        leida_segunda = repository.obtener(segunda, producto.id)
        assert leida_primera.version == leida_segunda.version
        repository.ajustar(primera, producto.id, 1, motivo="A", usuario_id=None)
        primera.commit()
        with pytest.raises(StaleDataError):
            repository.ajustar(segunda, producto.id, 1, motivo="B", usuario_id=None)


def test_ajuste_funciona_con_el_rol_de_aplicacion(producto) -> None:
    """La API real corre como `tienda_app`: RLS debe permitir el ajuste del responsable."""
    with SessionLocal() as preparacion:
        usuario_id = preparacion.execute(
            text(
                "INSERT INTO usuarios (nombre, correo, hash_contrasena)"
                " VALUES ('Inv', 'inv@utb.edu.co', 'x') RETURNING id"
            )
        ).scalar_one()
        preparacion.commit()
    contexto = ContextoSeguridad(
        usuario_id=usuario_id,
        roles=frozenset({"responsable_inventario"}),
        tiendas_inventario=frozenset({producto.tienda_id}),
    )
    with engine.connect() as conexion:
        transaccion = conexion.begin()
        try:
            conexion.execute(text(f'SET LOCAL ROLE "{ROL_APP}"'))
            aplicar_contexto(conexion, contexto)
            session = Session(bind=conexion)
            existencia = repository.ajustar(
                session, producto.id, 3, motivo="Reposición", usuario_id=usuario_id
            )
            assert existencia.cantidad >= 3
        finally:
            transaccion.rollback()

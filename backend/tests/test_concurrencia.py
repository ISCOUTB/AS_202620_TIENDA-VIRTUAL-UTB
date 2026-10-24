"""Ráfagas de peticiones concurrentes sin agotar el pool (escenario 4).

Regresión de las pruebas E2E del 2026-10-24: una ráfaga de unas 300
peticiones dejaba los hilos esperando conexiones que retenían peticiones a la
espera de un hilo para validar la respuesta, y todo respondía 500 al vencer
`pool_timeout`. Ver `RutaConSesion` en `app/shared/database.py`.
"""

import anyio
import httpx
import pytest
from fastapi.routing import APIRoute
from sqlalchemy import make_url

from app.main import app
from app.shared.database import (
    RutaConSesion,
    SessionLocal,
    crear_engine,
    engine,
    get_session,
)


def _dependencias(dependant):
    for dependencia in dependant.dependencies:
        yield dependencia
        yield from _dependencias(dependencia)


def test_toda_ruta_con_sesion_la_cierra_al_terminar_su_funcion():
    rutas = [r for r in app.routes if isinstance(r, APIRoute)]
    con_sesion = [
        r for r in rutas if any(d.call is get_session for d in _dependencias(r.dependant))
    ]
    assert con_sesion
    for ruta in con_sesion:
        assert isinstance(ruta, RutaConSesion), f"{ruta.path} no usa RutaConSesion"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def pool_minimo():
    """Una sola conexión y espera corta: cualquier retención se nota enseguida."""
    chico = crear_engine(make_url(str(engine.url.render_as_string(hide_password=False))))
    chico.pool._pool.maxsize = 1  # QueuePool: tamaño 1
    chico.pool._max_overflow = 0
    chico.pool._timeout = 2
    SessionLocal.configure(bind=chico)
    try:
        yield
    finally:
        SessionLocal.configure(bind=engine)
        chico.dispose()


@pytest.mark.anyio
async def test_rafaga_concurrente_no_bloquea_el_pool(pool_minimo):
    limitador = anyio.to_thread.current_default_thread_limiter()
    hilos = limitador.total_tokens
    limitador.total_tokens = 4
    codigos: list[int] = []
    try:
        transporte = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transporte, base_url="http://api") as cliente:

            async def pedir(ruta: str) -> None:
                codigos.append((await cliente.get(ruta)).status_code)

            async with anyio.create_task_group() as grupo:
                for i in range(20):
                    grupo.start_soon(pedir, "/catalog/products" if i % 2 else "/inventory")
    finally:
        limitador.total_tokens = hilos
    assert codigos == [200] * 20

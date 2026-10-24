"""Infraestructura de pruebas: PostgreSQL real, esquema por Alembic (ADR 0013).

- `DATABASE_URL` es obligatoria y debe apuntar a una base cuyo nombre contenga
  `test`: las pruebas vacían tablas y hacen `downgrade base`.
- Se conectan como el rol dueño (superusuario en Docker/CI), que omite RLS.
  Las pruebas de RLS cambian al rol de aplicación con `SET LOCAL ROLE`.
- El rol de aplicación (`APP_DB_USER`, por defecto `tienda_app`) debe existir:
  lo crea deploy/postgres/initdb/10-rol-aplicacion.sh.
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import make_url, select, text
from sqlalchemy.orm import Session

_URL = os.getenv("DATABASE_URL")
if not _URL:
    raise pytest.UsageError(
        "Las pruebas requieren DATABASE_URL hacia un PostgreSQL de pruebas, p. ej. "
        "postgresql+psycopg2://tienda:tienda@localhost:55432/tienda_test"
    )
if "test" not in (make_url(_URL).database or ""):
    raise pytest.UsageError(
        "DATABASE_URL debe apuntar a una base cuyo nombre contenga 'test': "
        "las pruebas borran datos y deshacen migraciones."
    )

# Clave solo para pruebas; la API exige JWT_SECRET al arrancar (ADR 0016).
os.environ.setdefault("JWT_SECRET", "clave-de-pruebas-que-no-se-usa-en-produccion")

from alembic import command  # noqa: E402  (tras validar el entorno)
from alembic.config import Config  # noqa: E402

from app.modules.catalog import models as _catalogo  # noqa: E402,F401
from app.modules.identity import models as _identidad  # noqa: E402,F401
from app.modules.inventory import models as _inventario  # noqa: E402,F401
from app.modules.orders import models as _pedidos  # noqa: E402,F401
from app.main import app  # noqa: E402
from app.shared.database import Base, SessionLocal, engine  # noqa: E402

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"
# `roles` es dato de referencia que inserta la migración: no se vacía.
TABLAS_DE_DATOS = [tabla.name for tabla in Base.metadata.sorted_tables if tabla.name != "roles"]


@pytest.fixture(scope="session", autouse=True)
def esquema_migrado() -> None:
    """Aplica `alembic upgrade head` una vez por sesión."""
    command.upgrade(Config(str(ALEMBIC_INI)), "head")


@pytest.fixture(autouse=True)
def base_limpia(esquema_migrado) -> None:
    """Vacía los datos antes de cada prueba y conserva los roles."""
    with engine.begin() as conexion:
        conexion.execute(
            text(f"TRUNCATE {', '.join(TABLAS_DE_DATOS)} RESTART IDENTITY CASCADE")
        )


@pytest.fixture
def sesion() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
        session.rollback()


@pytest.fixture
def cliente() -> Iterator[TestClient]:
    with TestClient(app) as client:
        yield client


def registrar_y_entrar(
    client: TestClient, correo: str = "ana@utb.edu.co", password: str = "clave-segura-1"
) -> dict[str, str]:
    """Crea una cuenta de comprador y devuelve la cabecera `Authorization`."""
    client.post(
        "/identity/register", json={"nombre": "Ana", "email": correo, "password": password}
    )
    token = client.post("/identity/login", json={"email": correo, "password": password})
    return {"Authorization": f"Bearer {token.json()['access_token']}"}


def asignar_rol(correo: str, rol: str, tienda_id: int | None = None) -> None:
    """Asigna un rol como dueño de la base (en la API lo haría un admin general)."""
    from app.modules.identity.models import Usuario, UsuarioRol

    with SessionLocal() as session, session.begin():
        usuario_id = session.scalar(select(Usuario.id).where(Usuario.correo == correo))
        session.add(UsuarioRol(usuario_id=usuario_id, rol_codigo=rol, tienda_id=tienda_id))


@pytest.fixture
def datos_demo() -> dict[str, int]:
    """Siembra el catálogo de demostración, como `python -m app.seed`."""
    from app.seed import sembrar_demo

    with SessionLocal() as session, session.begin():
        return sembrar_demo(session)

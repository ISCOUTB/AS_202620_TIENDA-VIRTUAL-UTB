"""Las migraciones son reversibles y coinciden con los modelos (ADR 0013)."""

from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import inspect

from app.shared.database import Base, engine

ALEMBIC_INI = Path(__file__).resolve().parents[1] / "alembic.ini"


def test_upgrade_downgrade_upgrade() -> None:
    configuracion = Config(str(ALEMBIC_INI))

    command.downgrade(configuracion, "base")
    with engine.connect() as conexion:
        restantes = set(inspect(conexion).get_table_names()) - {"alembic_version"}
    assert restantes == set()

    command.upgrade(configuracion, "head")
    with engine.connect() as conexion:
        tablas = set(inspect(conexion).get_table_names())
    assert {tabla.name for tabla in Base.metadata.sorted_tables} <= tablas


def test_modelos_y_migraciones_no_difieren() -> None:
    """Equivale a `alembic check`: autogenerate no encuentra cambios."""
    with engine.connect() as conexion:
        contexto = MigrationContext.configure(conexion, opts={"compare_type": True})
        diferencias = compare_metadata(contexto, Base.metadata)

    assert diferencias == []

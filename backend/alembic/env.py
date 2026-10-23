"""Entorno de Alembic: composition root del esquema.

Importa los modelos de cada módulo para que `Base.metadata` tenga todas las
tablas y toma la conexión del mismo resolvedor que la aplicación, con las
credenciales del rol dueño (ADR 0013 y 0014).
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.modules.catalog import models as _catalogo  # noqa: F401
from app.modules.identity import models as _identidad  # noqa: F401
from app.modules.inventory import models as _inventario  # noqa: F401
from app.modules.orders import models as _pedidos  # noqa: F401
from app.shared.database import Base, resolve_database_url

config = context.config

if config.config_file_name is not None:
    # Sin desactivar los loggers ya creados (pruebas y API).
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata

_OPCIONES = {
    "target_metadata": target_metadata,
    "compare_type": True,
}


def run_migrations_offline() -> None:
    """Genera el SQL sin conectarse (`alembic upgrade head --sql`)."""
    url = resolve_database_url(migraciones=True)
    if not isinstance(url, str):
        url = url.render_as_string(hide_password=False)
    context.configure(url=url, literal_binds=True, **_OPCIONES)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Aplica las migraciones; reutiliza una conexión si la prueba la entrega."""
    conexion = config.attributes.get("connection")
    if conexion is not None:
        context.configure(connection=conexion, **_OPCIONES)
        with context.begin_transaction():
            context.run_migrations()
        return

    engine = create_engine(resolve_database_url(migraciones=True), poolclass=pool.NullPool)
    with engine.connect() as conexion:
        context.configure(connection=conexion, **_OPCIONES)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

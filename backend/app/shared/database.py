"""Acceso a la base de datos compartido por los módulos del backend.

Elemento transversal permitido por el ADR 0001: solo expone la sesión y la
base declarativa. La propiedad de cada tabla pertenece al módulo que la define.

Hay dos credenciales (ADR 0014): la API se conecta con un rol sin privilegios
de dueño y sujeto a RLS; las migraciones y la siembra usan el rol dueño.
"""

import os
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import URL, MetaData, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.shared.seguridad import (
    ANONIMO,
    CLAVE_CONTEXTO,
    ContextoSeguridad,
    aplicar_contexto,
    contexto_actual,
)

# Nombres deterministas de restricciones: Alembic y los modelos coinciden.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class ConfiguracionBaseDatosError(RuntimeError):
    """No hay datos de conexión: la API no arranca contra una base implícita."""


def _url_desde_partes(usuario: str | None, clave: str | None) -> URL:
    # URL.create escapa la contraseña; nunca se interpola en una cadena.
    return URL.create(
        drivername="postgresql+psycopg2",
        username=usuario or "tienda_app",
        password=clave,
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "tienda_utb"),
    )


def resolve_database_url(*, migraciones: bool = False) -> str | URL:
    """Resuelve la conexión sin interpolar secretos en una URL.

    Con `migraciones=True` busca primero las credenciales del rol dueño
    (`MIGRATIONS_DATABASE_URL` o `DB_MIGRATIONS_USER`/`DB_MIGRATIONS_PASSWORD`)
    y, si no existen, usa las mismas de la API.
    """
    if migraciones:
        url_migraciones = os.getenv("MIGRATIONS_DATABASE_URL")
        if url_migraciones:
            return url_migraciones
        if os.getenv("DB_HOST") and os.getenv("DB_MIGRATIONS_USER"):
            return _url_desde_partes(
                os.getenv("DB_MIGRATIONS_USER"), os.getenv("DB_MIGRATIONS_PASSWORD")
            )

    configured_url = os.getenv("DATABASE_URL")
    if configured_url:
        return configured_url

    if not os.getenv("DB_HOST"):
        raise ConfiguracionBaseDatosError(
            "No hay base de datos configurada. Define DATABASE_URL "
            "(p. ej. postgresql+psycopg2://tienda_app:clave@localhost:5432/tienda_utb) "
            "o DB_HOST junto con DB_USER, DB_PASSWORD, DB_PORT y DB_NAME."
        )
    return _url_desde_partes(os.getenv("DB_USER"), os.getenv("DB_PASSWORD"))


def crear_engine(url: str | URL):
    """Engine de PostgreSQL con un pool tolerante a reinicios del servidor."""
    # Descarta conexiones cerradas y renueva periódicamente el pool para tolerar
    # reinicios o mantenimientos de PostgreSQL.
    return create_engine(url, pool_pre_ping=True, pool_recycle=280)


DATABASE_URL = resolve_database_url()

engine = crear_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@event.listens_for(SessionLocal, "after_begin")
def _fijar_contexto(session: Session, _transaction, connection) -> None:
    """Cada transacción de la API arranca con el principal de la petición."""
    aplicar_contexto(connection, session.info.get(CLAVE_CONTEXTO, ANONIMO))


def cambiar_contexto(session: Session, contexto: ContextoSeguridad) -> None:
    """Cambia el principal de la sesión, también en la transacción ya abierta.

    Para los casos en que quien actúa cambia a mitad de la petición, como el
    alta de una cuenta, que después lee su propio perfil.
    """
    session.info[CLAVE_CONTEXTO] = contexto
    if session.in_transaction():
        aplicar_contexto(session.connection(), contexto)


class Base(DeclarativeBase):
    """Base declarativa única para el monolito modular."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def get_session(
    contexto: Annotated[ContextoSeguridad, Depends(contexto_actual)],
) -> Iterator[Session]:
    """Dependencia de FastAPI: entrega una sesión y la cierra al terminar."""
    session = SessionLocal(info={CLAVE_CONTEXTO: contexto})
    try:
        yield session
    finally:
        session.close()

"""Acceso a la base de datos compartido por los módulos del backend.

Elemento transversal permitido por el ADR 0001: solo expone la sesión y la
base declarativa. La propiedad de cada tabla pertenece al módulo que la define.
"""

import os
from collections.abc import Iterator

from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool


def resolve_database_url() -> str | URL:
    """Resolve the database connection without interpolating secrets in a URL."""
    configured_url = os.getenv("DATABASE_URL")
    if configured_url:
        return configured_url

    db_host = os.getenv("DB_HOST")
    if not db_host:
        return "sqlite+pysqlite:///:memory:"

    return URL.create(
        drivername="postgresql+psycopg2",
        username=os.getenv("DB_USER", "tienda_utb"),
        password=os.getenv("DB_PASSWORD"),
        host=db_host,
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "tienda_utb"),
    )


DATABASE_URL = resolve_database_url()

_kwargs: dict = {"future": True}
if str(DATABASE_URL).startswith("sqlite"):
    _kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in DATABASE_URL:
        # Una sola conexión compartida para que las tablas sobrevivan entre sesiones.
        _kwargs["poolclass"] = StaticPool
else:
    # Descarta conexiones cerradas y renueva periódicamente el pool para tolerar
    # reinicios o mantenimientos de PostgreSQL.
    _kwargs["pool_pre_ping"] = True
    _kwargs["pool_recycle"] = 280

engine = create_engine(DATABASE_URL, **_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base declarativa única para el monolito modular."""


def get_session() -> Iterator[Session]:
    """Dependencia de FastAPI: entrega una sesión y la cierra al terminar."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

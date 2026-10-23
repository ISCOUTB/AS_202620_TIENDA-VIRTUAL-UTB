import pytest
from sqlalchemy import URL

from app.shared.database import ConfiguracionBaseDatosError, resolve_database_url

_VARIABLES = (
    "DATABASE_URL",
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "MIGRATIONS_DATABASE_URL",
    "DB_MIGRATIONS_USER",
    "DB_MIGRATIONS_PASSWORD",
)


@pytest.fixture
def entorno_vacio(monkeypatch):
    for variable in _VARIABLES:
        monkeypatch.delenv(variable, raising=False)
    return monkeypatch


def test_database_url_has_priority(entorno_vacio) -> None:
    entorno_vacio.setenv("DATABASE_URL", "postgresql+psycopg2://app@localhost/tienda")
    entorno_vacio.setenv("DB_HOST", "database")

    assert resolve_database_url() == "postgresql+psycopg2://app@localhost/tienda"


def test_database_settings_build_safe_sqlalchemy_url(entorno_vacio) -> None:
    entorno_vacio.setenv("DB_HOST", "database")
    entorno_vacio.setenv("DB_PORT", "5432")
    entorno_vacio.setenv("DB_NAME", "tienda_utb")
    entorno_vacio.setenv("DB_USER", "tienda_utb")
    entorno_vacio.setenv("DB_PASSWORD", "clave@con:simbolos")

    url = resolve_database_url()

    assert isinstance(url, URL)
    assert url.password == "clave@con:simbolos"
    assert url.render_as_string(hide_password=False) == (
        "postgresql+psycopg2://tienda_utb:clave%40con%3Asimbolos"
        "@database:5432/tienda_utb"
    )


def test_sin_configuracion_falla_con_mensaje_claro(entorno_vacio) -> None:
    """Ya no existe el respaldo silencioso a SQLite en memoria."""
    with pytest.raises(ConfiguracionBaseDatosError, match="DATABASE_URL"):
        resolve_database_url()


def test_migraciones_usan_credenciales_del_dueno(entorno_vacio) -> None:
    entorno_vacio.setenv("DB_HOST", "database")
    entorno_vacio.setenv("DB_USER", "tienda_app")
    entorno_vacio.setenv("DB_PASSWORD", "app")
    entorno_vacio.setenv("DB_MIGRATIONS_USER", "tienda_utb")
    entorno_vacio.setenv("DB_MIGRATIONS_PASSWORD", "dueno")

    assert resolve_database_url().username == "tienda_app"
    assert resolve_database_url(migraciones=True).username == "tienda_utb"


def test_migraciones_priorizan_su_url_y_si_no_usan_la_de_la_api(entorno_vacio) -> None:
    entorno_vacio.setenv("DATABASE_URL", "postgresql://app@db/tienda")
    assert resolve_database_url(migraciones=True) == "postgresql://app@db/tienda"

    entorno_vacio.setenv("MIGRATIONS_DATABASE_URL", "postgresql://dueno@db/tienda")
    assert resolve_database_url(migraciones=True) == "postgresql://dueno@db/tienda"

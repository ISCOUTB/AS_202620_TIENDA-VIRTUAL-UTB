from sqlalchemy import URL

from app.shared.database import resolve_database_url


def test_database_url_has_priority(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "sqlite+pysqlite:///configured.db")
    monkeypatch.setenv("DB_HOST", "database")

    assert resolve_database_url() == "sqlite+pysqlite:///configured.db"


def test_database_settings_build_safe_sqlalchemy_url(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DB_HOST", "database")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "tienda_utb")
    monkeypatch.setenv("DB_USER", "tienda_utb")
    monkeypatch.setenv("DB_PASSWORD", "clave@con:simbolos")

    url = resolve_database_url()

    assert isinstance(url, URL)
    assert url.password == "clave@con:simbolos"
    assert url.render_as_string(hide_password=False) == (
        "postgresql+psycopg2://tienda_utb:clave%40con%3Asimbolos"
        "@database:5432/tienda_utb"
    )

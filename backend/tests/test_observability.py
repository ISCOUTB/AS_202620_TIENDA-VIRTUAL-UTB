"""Pruebas de observabilidad: readiness real, métricas y logs JSON."""

import json
import logging
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.main import app
from app.shared.database import get_session
from app.shared.logging import JsonFormatter


def test_health_ready_ok_con_base_de_datos() -> None:
    with TestClient(app) as client:
        response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "detalle": None}


def test_health_ready_503_si_la_base_de_datos_falla() -> None:
    sesion_rota = MagicMock(spec=Session)
    sesion_rota.execute.side_effect = SQLAlchemyError("sin conexión")
    app.dependency_overrides[get_session] = lambda: sesion_rota
    try:
        with TestClient(app) as client:
            response = client.get("/health/ready")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503
    assert response.json()["status"] == "error"


def test_metrics_expone_conteo_y_latencia_por_ruta() -> None:
    with TestClient(app) as client:
        client.get("/catalog/products")
        response = client.get("/metrics")
    assert response.status_code == 200
    cuerpo = response.json()
    assert cuerpo["uptime_segundos"] >= 0
    assert "escenario" in cuerpo["escenario_asociado"]
    catalogo = cuerpo["rutas"]["GET /catalog/products"]
    assert catalogo["peticiones"] >= 1
    assert catalogo["latencia_ms"]["p95"] >= 0


def test_json_formatter_serializa_campos_extra() -> None:
    registro = logging.LogRecord(
        "tienda.http", logging.INFO, "", 0, "http_request", (), None
    )
    registro.status_code = 200
    registro.duration_ms = 3.5
    linea = json.loads(JsonFormatter().format(registro))
    assert linea["level"] == "info"
    assert linea["message"] == "http_request"
    assert linea["status_code"] == 200
    assert linea["duration_ms"] == 3.5

"""Pruebas de que la API expone el contrato OpenAPI (generado y de diseño)."""

from fastapi.testclient import TestClient
import yaml

from app import main
from app.main import _PATH_CONTRATO_DISENO, app

RUTAS_ESPERADAS_DISENO = [
    "/health",
    "/identity/register",
    "/identity/login",
    "/identity/me",
    "/catalog/products",
    "/catalog/products/{productId}",
    "/inventory",
    "/inventory/{productId}",
    "/inventory/{productId}/adjust",
    "/orders",
    "/orders/{orderId}",
    "/orders/{orderId}/cancel",
]


def test_contrato_autogenerado_incluye_endpoints_implementados() -> None:
    openapi = app.openapi()

    assert "/health" in openapi["paths"]
    assert "/catalog/products" in openapi["paths"]
    assert "ProductOut" in openapi["components"]["schemas"]


def test_contrato_diseno_anticipa_los_cuatro_modulos() -> None:
    contenido = _PATH_CONTRATO_DISENO.read_text(encoding="utf-8")
    contrato = yaml.safe_load(contenido)

    for ruta in RUTAS_ESPERADAS_DISENO:
        assert ruta in contrato["paths"], f"Falta la ruta {ruta} en {_PATH_CONTRATO_DISENO.name}"

    # Verifica operaciones etiquetadas por módulo, no comentarios del YAML.
    for modulo, etiqueta in (
        ("identity", "identity"),
        ("catalog", "catalogo"),
        ("inventory", "inventory"),
        ("orders", "orders"),
    ):
        assert any(
            etiqueta in operacion.get("tags", [])
            for ruta, operaciones in contrato["paths"].items()
            if ruta.startswith(f"/{modulo}/") or ruta == f"/{modulo}"
            for metodo, operacion in operaciones.items()
            if metodo in {"get", "post", "put", "patch", "delete"}
        ), f"Faltan operaciones del módulo {modulo}"


def test_contrato_diseno_se_sirve_sin_variable_de_entorno(monkeypatch) -> None:
    monkeypatch.delenv("CONTRATO_DISENO", raising=False)
    with TestClient(app) as client:
        response = client.get("/openapi/diseno")
    assert response.status_code == 200
    assert response.text == _PATH_CONTRATO_DISENO.read_text(encoding="utf-8")


def test_contrato_diseno_respeta_ruta_configurada(monkeypatch, tmp_path) -> None:
    contrato = tmp_path / "contrato.yaml"
    contrato.write_text("openapi: 3.1.0\n", encoding="utf-8")
    monkeypatch.setenv("CONTRATO_DISENO", str(contrato))
    with TestClient(app) as client:
        response = client.get("/openapi/diseno")
    assert response.status_code == 200
    assert response.text == contrato.read_text(encoding="utf-8")


def test_contrato_diseno_ausente_devuelve_404(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("CONTRATO_DISENO", str(tmp_path))
    monkeypatch.setattr(main, "_PATH_CONTRATO_DISENO", tmp_path / "ausente.yaml")
    monkeypatch.setattr(main, "_PATH_CONTRATO_DISENO_DOCKER", tmp_path / "docker.yaml")
    with TestClient(app) as client:
        response = client.get("/openapi/diseno")
    assert response.status_code == 404
    assert response.text == "Contrato de diseño no encontrado."

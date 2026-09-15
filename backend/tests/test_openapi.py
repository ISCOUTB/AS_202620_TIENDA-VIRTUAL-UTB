"""Pruebas de que la API expone el contrato OpenAPI (generado y de diseño)."""

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

    for ruta in RUTAS_ESPERADAS_DISENO:
        assert ruta in contenido, f"Falta la ruta {ruta} en {_PATH_CONTRATO_DISENO.name}"

    # Cada módulo del ADR 0001 tiene contrato en diseño anticipado.
    for modulo in ("identity", "catalog", "inventory", "orders"):
        assert f"# {modulo}" in contenido or f"## {modulo}" in contenido
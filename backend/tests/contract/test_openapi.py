"""Verifica el proveedor HTTP contra el contrato guardado en el repositorio."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, ValidationError
from openapi_spec_validator import validate_spec

from app.main import app

CONTRACT = json.loads(
    (Path(__file__).resolve().parents[3] / "docs/api/openapi.json").read_text(
        encoding="utf-8"
    )
)
OPERATIONS = [
    (path, method)
    for path, item in CONTRACT["paths"].items()
    for method in item
    if method in {"get", "post", "put", "patch", "delete", "head", "options", "trace"}
]


def response_validator(path: str, method: str, status: str) -> Draft202012Validator:
    schema = CONTRACT["paths"][path][method]["responses"][status]["content"][
        "application/json"
    ]["schema"]
    # Conserva la raíz de las referencias #/components/schemas/... del contrato.
    return Draft202012Validator({"components": CONTRACT["components"], **schema})


def test_openapi_document_is_valid() -> None:
    validate_spec(CONTRACT)


def test_implementation_matches_committed_contract() -> None:
    assert app.openapi() == CONTRACT, (
        "La API cambió respecto al contrato guardado. Revisa compatibilidad, "
        "actualiza la versión si corresponde y exporta el contrato explícitamente."
    )


@pytest.mark.parametrize("path,method", OPERATIONS)
def test_http_response_matches_contract(path: str, method: str) -> None:
    # El alcance actual son consultas sin parámetros ni cuerpo. Una operación
    # nueva debe incorporar sus casos de prueba, no quedar omitida silenciosamente.
    assert method == "get" and "{" not in path
    with TestClient(app) as client:
        response = client.request(method, path)
    assert response.status_code == 200
    assert response.headers["content-type"].split(";")[0] == "application/json"
    response_validator(path, method, str(response.status_code)).validate(response.json())


@pytest.mark.parametrize("mutation", ["missing_name", "price_as_text"])
def test_contract_rejects_breaking_product_payloads(mutation: str) -> None:
    with TestClient(app) as client:
        payload = client.get("/catalog/products").json()
    assert payload, "Se requiere al menos un producto para demostrar la ruptura."
    if mutation == "missing_name":
        del payload[0]["nombre"]
    else:
        payload[0]["precio_centavos"] = "10000"
    with pytest.raises(ValidationError):
        response_validator("/catalog/products", "get", "200").validate(payload)

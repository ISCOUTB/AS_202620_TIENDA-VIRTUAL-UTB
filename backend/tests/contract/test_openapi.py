"""Verifica el proveedor HTTP contra el contrato guardado en el repositorio."""

import json
from collections.abc import Callable
from pathlib import Path

import httpx
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


# Operaciones con cuerpo, parámetros o autenticación: cada una declara cómo se
# invoca. Las demás deben ser consultas GET sin parámetros.
Caso = Callable[[TestClient], httpx.Response]
CASOS: dict[tuple[str, str], Caso] = {}


def caso(path: str, method: str) -> Callable[[Caso], Caso]:
    def registrar(funcion: Caso) -> Caso:
        CASOS[(path, method)] = funcion
        return funcion

    return registrar


def _cabecera(client: TestClient, correo: str = "contrato@utb.edu.co") -> dict[str, str]:
    from tests.conftest import registrar_y_entrar

    return registrar_y_entrar(client, correo)


@caso("/identity/register", "post")
def _registro(client: TestClient) -> httpx.Response:
    datos = {"nombre": "Contrato", "email": "nuevo@utb.edu.co", "password": "clave-segura-1"}
    return client.post("/identity/register", json=datos)


@caso("/identity/login", "post")
def _login(client: TestClient) -> httpx.Response:
    _cabecera(client)
    datos = {"email": "contrato@utb.edu.co", "password": "clave-segura-1"}
    return client.post("/identity/login", json=datos)


@caso("/identity/me", "get")
def _me(client: TestClient) -> httpx.Response:
    return client.get("/identity/me", headers=_cabecera(client))


def _responsable_de_producto(client: TestClient) -> tuple[int, dict[str, str]]:
    """Siembra el catálogo y da a una cuenta el inventario de la tienda 1."""
    from app.seed import sembrar_demo
    from app.shared.database import SessionLocal
    from tests.conftest import asignar_rol

    with SessionLocal() as session, session.begin():
        sembrar_demo(session)
    cabecera = _cabecera(client, "inventario@utb.edu.co")
    asignar_rol("inventario@utb.edu.co", "responsable_inventario", tienda_id=1)
    return client.get("/inventory").json()[0]["product_id"], cabecera


@caso("/inventory/{productId}", "get")
def _existencia(client: TestClient) -> httpx.Response:
    producto_id, cabecera = _responsable_de_producto(client)
    return client.get(f"/inventory/{producto_id}", headers=cabecera)


@caso("/inventory/{productId}", "put")
def _fijar_existencia(client: TestClient) -> httpx.Response:
    producto_id, cabecera = _responsable_de_producto(client)
    return client.put(f"/inventory/{producto_id}", json={"cantidad": 7}, headers=cabecera)


@caso("/inventory/{productId}/adjust", "post")
def _ajustar_existencia(client: TestClient) -> httpx.Response:
    producto_id, cabecera = _responsable_de_producto(client)
    datos = {"delta": 2, "motivo": "Reposición"}
    return client.post(f"/inventory/{producto_id}/adjust", json=datos, headers=cabecera)


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
    # Una operación nueva debe incorporar su caso en CASOS, no quedar omitida
    # silenciosamente.
    with TestClient(app) as client:
        if (path, method) in CASOS:
            response = CASOS[(path, method)](client)
        else:
            assert method == "get", f"{method.upper()} {path} no tiene caso de contrato"
            assert "{" not in path, f"{path} tiene parámetros y no tiene caso de contrato"
            response = client.request(method, path)
    assert 200 <= response.status_code < 300
    assert response.headers["content-type"].split(";")[0] == "application/json"
    response_validator(path, method, str(response.status_code)).validate(response.json())


@pytest.mark.parametrize("mutation", ["missing_name", "price_as_text"])
def test_contract_rejects_breaking_product_payloads(mutation: str, datos_demo) -> None:
    with TestClient(app) as client:
        payload = client.get("/catalog/products").json()
    assert payload, "Se requiere al menos un producto para demostrar la ruptura."
    if mutation == "missing_name":
        del payload[0]["nombre"]
    else:
        payload[0]["precio_centavos"] = "10000"
    validador = response_validator("/catalog/products", "get", "200")
    with pytest.raises(ValidationError):
        validador.validate(payload)

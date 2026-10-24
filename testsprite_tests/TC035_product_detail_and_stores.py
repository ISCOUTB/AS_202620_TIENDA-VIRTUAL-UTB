import requests
import sys
import json
from typing import Any

BASE_URL = "http://localhost:8000"
TIMEOUT = 30


def _find_value_recursively(obj: Any, target: str) -> bool:
    if isinstance(obj, str):
        return obj == target
    if isinstance(obj, dict):
        for k, v in obj.items():
            if _find_value_recursively(v, target):
                return True
    if isinstance(obj, list):
        for item in obj:
            if _find_value_recursively(item, target):
                return True
    return False


def test_product_detail_and_stores():
    # Login to obtain token
    login_url = f"{BASE_URL}/identity/login"
    login_payload = {"email": "ana@utb.edu.co", "password": "Comprador-2026"}
    try:
        resp = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")
    assert resp.status_code == 200, f"Login failed (status {resp.status_code}): {resp.text}"
    try:
        token_data = resp.json()
    except ValueError:
        raise AssertionError(f"Login response is not valid JSON: {resp.text}")
    access_token = token_data.get("access_token")
    assert access_token, f"No access_token returned in login response: {token_data}"

    headers = {"Authorization": f"Bearer {access_token}"}

    # GET /catalog/products/25 -> 200 and contains tienda 'punto-fit'
    prod25_url = f"{BASE_URL}/catalog/products/25"
    try:
        resp = requests.get(prod25_url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"GET {prod25_url} failed: {e}")
    assert resp.status_code == 200, f"Expected 200 for product 25, got {resp.status_code}: {resp.text}"
    try:
        prod25_json = resp.json()
    except ValueError:
        raise AssertionError(f"Product 25 response is not valid JSON: {resp.text}")

    contains_punto_fit = _find_value_recursively(prod25_json, "punto-fit")
    assert contains_punto_fit, f"Product 25 JSON does not contain tienda 'punto-fit'. Response: {json.dumps(prod25_json, ensure_ascii=False)}"

    # GET /catalog/products/999999 -> 404
    prod_missing_url = f"{BASE_URL}/catalog/products/999999"
    try:
        resp = requests.get(prod_missing_url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"GET {prod_missing_url} failed: {e}")
    assert resp.status_code == 404, f"Expected 404 for missing product, got {resp.status_code}: {resp.text}"

    # GET /catalog/tiendas -> 5 stores
    tiendas_url = f"{BASE_URL}/catalog/tiendas"
    try:
        resp = requests.get(tiendas_url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"GET {tiendas_url} failed: {e}")
    assert resp.status_code == 200, f"Expected 200 for /catalog/tiendas, got {resp.status_code}: {resp.text}"
    try:
        tiendas_json = resp.json()
    except ValueError:
        raise AssertionError(f"/catalog/tiendas response is not valid JSON: {resp.text}")
    assert isinstance(tiendas_json, list), f"/catalog/tiendas did not return a list: {type(tiendas_json).__name__}"
    assert len(tiendas_json) == 5, f"Expected 5 stores from /catalog/tiendas, got {len(tiendas_json)}. Response: {json.dumps(tiendas_json, ensure_ascii=False)}"

    print("TC035 product_detail_and_stores: PASS")


if __name__ == "__main__":
    try:
        test_product_detail_and_stores()
    except AssertionError as e:
        print(f"TC035 product_detail_and_stores: FAIL - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC035 product_detail_and_stores: ERROR - Unexpected exception: {e}")
        sys.exit(2)
    sys.exit(0)
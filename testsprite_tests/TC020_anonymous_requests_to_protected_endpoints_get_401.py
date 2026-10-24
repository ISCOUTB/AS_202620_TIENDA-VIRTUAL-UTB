import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

def assert_unauthorized(method, path, json=None, extra_headers=None):
    url = BASE_URL + path
    headers = {}
    if extra_headers:
        headers.update(extra_headers)
    try:
        resp = requests.request(method, url, headers=headers, json=json, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Request to {url} failed: {e}")
    if resp.status_code != 401:
        raise AssertionError(f"Expected 401 for {method} {path}, got {resp.status_code}. Response body: {resp.text}")
    www = resp.headers.get("WWW-Authenticate") or resp.headers.get("www-authenticate")
    if not www:
        raise AssertionError(f"Expected WWW-Authenticate header for {method} {path}, but it was missing. Headers: {resp.headers}")
    if not str(www).strip().lower().startswith("bearer"):
        raise AssertionError(f"Expected WWW-Authenticate to start with 'Bearer' for {method} {path}, got: {www}")
    return resp

def assert_ok_get(path):
    url = BASE_URL + path
    try:
        resp = requests.get(url, timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Request to {url} failed: {e}")
    if resp.status_code != 200:
        raise AssertionError(f"Expected 200 for GET {path}, got {resp.status_code}. Body: {resp.text}")
    return resp

def test_anonymous_requests_to_protected_endpoints_get_401():
    # Protected endpoints that must return 401 + WWW-Authenticate: Bearer when anonymous
    protected_checks = [
        ("GET", "/identity/me", None, None),
        ("GET", "/orders", None, None),
        # POST /orders needs an Idempotency-Key header and a valid body, but should still 401 when anonymous
        ("POST", "/orders", {"items":[{"product_id":25,"cantidad":1}], "hora_recogida":"12:00"}, {"Idempotency-Key": str(uuid.uuid4())}),
        ("GET", "/inventory/25", None, None),
        ("POST", "/inventory/25/adjust", {"delta":1, "motivo":"conteo"}, None),
        # POST /catalog/products creation payload (anonymous should get 401)
        ("POST", "/catalog/products", {"tienda":"punto-fit","nombre":"test-product-anon","descripcion":"x","precio_centavos":100000}, None),
    ]

    for method, path, body, extra_headers in protected_checks:
        try:
            assert_unauthorized(method, path, json=body, extra_headers=extra_headers)
        except AssertionError:
            raise
        except Exception as e:
            raise AssertionError(f"Unexpected error while checking {method} {path}: {e}")

    # Public endpoints that must be accessible without auth (200)
    public_paths = [
        "/catalog/products",
        "/catalog/tiendas",
        "/inventory",
        "/health"
    ]

    for path in public_paths:
        try:
            assert_ok_get(path)
        except AssertionError:
            raise
        except Exception as e:
            raise AssertionError(f"Unexpected error while checking GET {path}: {e}")

    print("TC020 passed: anonymous requests to protected endpoints return 401 with WWW-Authenticate: Bearer; public endpoints return 200.")

if __name__ == "__main__":
    try:
        test_anonymous_requests_to_protected_endpoints_get_401()
    except AssertionError as e:
        print("TC020 FAILED:", e)
        sys.exit(1)
    except Exception as e:
        print("TC020 ERROR:", e)
        sys.exit(2)
    sys.exit(0)
import requests
import sys
import traceback

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

ADMIN_EMAIL = "admin@utb.edu.co"
ADMIN_PASSWORD = "Admin-Demo-2026"

def login(email: str, password: str) -> str:
    url = f"{BASE_URL}/identity/login"
    payload = {"email": email, "password": password}
    try:
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise RuntimeError(f"Failed to connect to {url}: {e}")
    if resp.status_code != 200:
        raise AssertionError(f"Login failed: status {resp.status_code}, body: {resp.text}")
    try:
        data = resp.json()
    except ValueError:
        raise AssertionError(f"Login response is not JSON: {resp.text}")
    if "access_token" not in data:
        raise AssertionError(f"Login response missing access_token: {data}")
    return data["access_token"]

def test_general_admin_reads_any_store_queue_and_inactive_products():
    try:
        token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        headers = {"Authorization": f"Bearer {token}"}

        # Check orders for tienda_id=1 and tienda_id=4
        for tienda_id in (1, 4):
            url = f"{BASE_URL}/orders"
            try:
                resp = requests.get(url, params={"tienda_id": tienda_id}, headers=headers, timeout=TIMEOUT)
            except requests.RequestException as e:
                raise RuntimeError(f"Request to {url} failed: {e}")
            assert resp.status_code == 200, f"Expected 200 for GET /orders?tienda_id={tienda_id}, got {resp.status_code}: {resp.text}"
            try:
                orders = resp.json()
            except ValueError:
                raise AssertionError(f"GET /orders?tienda_id={tienda_id} did not return JSON: {resp.text}")
            assert isinstance(orders, list), f"Expected list for orders for tienda_id {tienda_id}, got {type(orders)}"
            # If there are orders, ensure they reference the requested tienda_id when present
            for o in orders:
                if isinstance(o, dict) and "tienda_id" in o:
                    assert int(o["tienda_id"]) == tienda_id, f"Order tienda_id mismatch: expected {tienda_id}, got {o['tienda_id']}"

        # Check catalog products including inactive
        url = f"{BASE_URL}/catalog/products"
        try:
            resp = requests.get(url, params={"incluir_inactivos": "true"}, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            raise RuntimeError(f"Request to {url} failed: {e}")
        assert resp.status_code == 200, f"Expected 200 for GET /catalog/products?incluir_inactivos=true, got {resp.status_code}: {resp.text}"
        try:
            products = resp.json()
        except ValueError:
            raise AssertionError(f"GET /catalog/products?incluir_inactivos=true did not return JSON: {resp.text}")
        assert isinstance(products, list), f"Expected list for products, got {type(products)}"
        # Verify that product items contain expected keys when present
        for p in products:
            if isinstance(p, dict):
                # at least one of these keys should exist in product dicts per PRD
                assert any(k in p for k in ("id", "nombre", "precio_centavos", "tienda")), f"Product missing expected keys: {p}"

        print("TC014 passed: general_admin_reads_any_store_queue_and_inactive_products")
    except AssertionError:
        traceback.print_exc()
        print("TC014 failed (assertion).")
        sys.exit(1)
    except Exception:
        traceback.print_exc()
        print("TC014 failed (exception).")
        sys.exit(1)

if __name__ == "__main__":
    test_general_admin_reads_any_store_queue_and_inactive_products()
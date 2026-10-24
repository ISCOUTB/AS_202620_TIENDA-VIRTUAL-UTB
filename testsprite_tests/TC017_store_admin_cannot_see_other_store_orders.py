import requests
import uuid
import sys
from requests.exceptions import RequestException

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

ANA_EMAIL = "ana@utb.edu.co"
ANA_PASSWORD = "Comprador-2026"

ADMIN_PUNTOFIT_EMAIL = "admin.punto-fit@utb.edu.co"
ADMIN_PUNTOFIT_PASSWORD = "Tienda-2026"

PRODUCT_ID_ALMUERZO_01 = 51
TIENDA_ALMUERZO_01_ID = 4

def login(email: str, password: str) -> str:
    url = f"{BASE_URL}/identity/login"
    try:
        resp = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    except RequestException as e:
        raise RuntimeError(f"Login request failed for {email}: {e}")
    if resp.status_code != 200:
        raise AssertionError(f"Login failed for {email}: status {resp.status_code}, body: {resp.text}")
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise AssertionError(f"No access_token returned for {email}: {data}")
    return token

def test_store_admin_cannot_see_other_store_orders():
    order_id = None
    # Step 1: Login as ana and create an order in Almuerzo 01 (product 51)
    ana_token = login(ANA_EMAIL, ANA_PASSWORD)
    headers_ana = {
        "Authorization": f"Bearer {ana_token}",
        "Idempotency-Key": str(uuid.uuid4()),
        "Content-Type": "application/json"
    }
    order_body = {
        "items": [
            {"product_id": PRODUCT_ID_ALMUERZO_01, "cantidad": 1}
        ],
        # hora_recogida optional; include a valid time
        "hora_recogida": "12:00"
    }

    try:
        try:
            resp = requests.post(f"{BASE_URL}/orders", json=order_body, headers=headers_ana, timeout=TIMEOUT)
        except RequestException as e:
            raise RuntimeError(f"Creating order failed: {e}")

        if not (200 <= resp.status_code < 300):
            raise AssertionError(f"Order creation failed: status {resp.status_code}, body: {resp.text}")

        data = resp.json()
        # normalize to a list of orders
        if isinstance(data, dict):
            # maybe returned wrapped or single order
            orders = data.get("orders") or data.get("data") or [data]
        elif isinstance(data, list):
            orders = data
        else:
            raise AssertionError(f"Unexpected order creation response format: {data}")

        # find the order corresponding to Almuerzo 01 (tienda_id == 4 or containing product 51)
        found = None
        for o in orders:
            try:
                tienda_id = o.get("tienda_id") if isinstance(o, dict) else None
                items = o.get("items", []) if isinstance(o, dict) else []
            except Exception:
                tienda_id = None
                items = []
            if tienda_id == TIENDA_ALMUERZO_01_ID:
                found = o
                break
            # fallback: find by product_id in items
            for it in items:
                if it.get("product_id") == PRODUCT_ID_ALMUERZO_01:
                    found = o
                    break
            if found:
                break

        if not found:
            raise AssertionError(f"Created orders did not include an order for tienda_id {TIENDA_ALMUERZO_01_ID} or product {PRODUCT_ID_ALMUERZO_01}. Response: {orders}")

        order_id = found.get("id")
        if not order_id:
            raise AssertionError(f"Could not determine order id from created order: {found}")

        # Step 2: Login as admin.punto-fit
        admin_token = login(ADMIN_PUNTOFIT_EMAIL, ADMIN_PUNTOFIT_PASSWORD)
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        # As admin.punto-fit: GET /orders?tienda_id=4 -> expect 403
        try:
            resp = requests.get(f"{BASE_URL}/orders", params={"tienda_id": TIENDA_ALMUERZO_01_ID}, headers=headers_admin, timeout=TIMEOUT)
        except RequestException as e:
            raise RuntimeError(f"GET /orders?tienda_id={TIENDA_ALMUERZO_01_ID} request failed: {e}")

        assert resp.status_code == 403, f"Expected 403 for admin accessing other store orders list, got {resp.status_code}, body: {resp.text}"

        # As admin.punto-fit: GET /orders/{id} -> expect 404 (not found / not visible)
        try:
            resp = requests.get(f"{BASE_URL}/orders/{order_id}", headers=headers_admin, timeout=TIMEOUT)
        except RequestException as e:
            raise RuntimeError(f"GET /orders/{order_id} request failed: {e}")

        assert resp.status_code == 404, f"Expected 404 for admin accessing other store order by id, got {resp.status_code}, body: {resp.text}"

        # As admin.punto-fit: POST /orders/{id}/estado {estado:'pagado'} -> expect 404
        try:
            resp = requests.post(f"{BASE_URL}/orders/{order_id}/estado", json={"estado": "pagado"}, headers=headers_admin, timeout=TIMEOUT)
        except RequestException as e:
            raise RuntimeError(f"POST /orders/{order_id}/estado request failed: {e}")

        assert resp.status_code == 404, f"Expected 404 for admin advancing other store order, got {resp.status_code}, body: {resp.text}"

        # As admin.punto-fit: POST /orders/{id}/cancel -> expect 404
        try:
            resp = requests.post(f"{BASE_URL}/orders/{order_id}/cancel", headers=headers_admin, timeout=TIMEOUT)
        except RequestException as e:
            raise RuntimeError(f"POST /orders/{order_id}/cancel request failed: {e}")

        assert resp.status_code == 404, f"Expected 404 for admin cancelling other store order, got {resp.status_code}, body: {resp.text}"

    finally:
        # Cleanup: attempt to cancel the order as ana (buyer) to remove created resource
        if order_id:
            try:
                # ensure we have a fresh token for ana
                ana_token_cleanup = login(ANA_EMAIL, ANA_PASSWORD)
                headers_cleanup = {"Authorization": f"Bearer {ana_token_cleanup}"}
                try:
                    resp = requests.post(f"{BASE_URL}/orders/{order_id}/cancel", headers=headers_cleanup, timeout=TIMEOUT)
                except RequestException as e:
                    print(f"Warning: cancel request for cleanup failed: {e}", file=sys.stderr)
                    return

                if resp.status_code not in (200, 204):
                    # If buyer cannot cancel (e.g., already advanced) try nothing else; log warning
                    print(f"Warning: cleanup cancel returned status {resp.status_code}, body: {resp.text}", file=sys.stderr)
            except Exception as e:
                print(f"Warning: cleanup login/cancel encountered error: {e}", file=sys.stderr)

if __name__ == "__main__":
    test_store_admin_cannot_see_other_store_orders()
    print("TC017 passed")
import requests
import uuid
import sys
import traceback

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

BUYER_EMAIL = "ana@utb.edu.co"
BUYER_PASSWORD = "Comprador-2026"

STORE_ADMIN_EMAIL = "admin.almuerzo-01@utb.edu.co"
STORE_ADMIN_PASSWORD = "Tienda-2026"

PRODUCT_ID_FOR_ALMUERZO_01 = 52  # from PRD example list for Almuerzo 01

def login(email: str, password: str) -> str:
    url = f"{BASE_URL}/identity/login"
    resp = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    try:
        resp.raise_for_status()
    except Exception as e:
        raise AssertionError(f"Login failed for {email}: {resp.status_code} {resp.text}") from e
    data = resp.json()
    token = data.get("access_token")
    assert token, f"No access_token in login response for {email}: {data}"
    return token

def extract_order_id(order_obj):
    # Try common keys
    if not isinstance(order_obj, dict):
        raise AssertionError(f"Order object is not a dict: {order_obj}")
    for k in ("id", "order_id", "orderId", "pedido_id"):
        if k in order_obj:
            return order_obj[k]
    # fallback: maybe top-level contains nested order
    if "pedido" in order_obj and isinstance(order_obj["pedido"], dict):
        for k in ("id", "order_id", "orderId"):
            if k in order_obj["pedido"]:
                return order_obj["pedido"][k]
    raise AssertionError(f"Could not find order id in object: keys={list(order_obj.keys())}")

def get_estado_from_response(resp_json):
    if isinstance(resp_json, dict):
        for k in ("estado", "status", "estado_actual"):
            if k in resp_json:
                return resp_json[k]
        # maybe wrapped under 'pedido'
        if "pedido" in resp_json and isinstance(resp_json["pedido"], dict):
            for k in ("estado", "status"):
                if k in resp_json["pedido"]:
                    return resp_json["pedido"][k]
    return None

def test_verify_post_orders_orderid_estado_endpoint_advances_order_status():
    order_id = None
    created_order_obj = None
    buyer_token = None
    admin_token = None

    try:
        # 1) Login as buyer and create an order with a fresh Idempotency-Key
        buyer_token = login(BUYER_EMAIL, BUYER_PASSWORD)

        idempotency_key = str(uuid.uuid4())
        create_order_url = f"{BASE_URL}/orders"
        headers = {
            "Authorization": f"Bearer {buyer_token}",
            "Idempotency-Key": idempotency_key,
            "Content-Type": "application/json"
        }
        body = {
            "items": [
                {"product_id": PRODUCT_ID_FOR_ALMUERZO_01, "cantidad": 1}
            ]
            # "hora_recogida" optional
        }
        resp = requests.post(create_order_url, json=body, headers=headers, timeout=TIMEOUT)
        assert resp.status_code in (200,201), f"Unexpected status creating order: {resp.status_code} {resp.text}"
        resp_json = resp.json()

        # POST /orders returns a LIST of orders (one per store). Find the order for our product/store.
        if isinstance(resp_json, list):
            assert len(resp_json) >= 1, f"POST /orders returned empty list: {resp_json}"
            # pick first order object
            created_order_obj = resp_json[0]
        elif isinstance(resp_json, dict):
            # Some implementations might return a single object
            created_order_obj = resp_json
        else:
            raise AssertionError(f"Unexpected create order response type: {type(resp_json)}")

        order_id = extract_order_id(created_order_obj)
        assert order_id is not None, f"Could not determine order id from response: {created_order_obj}"

        # 2) Login as store admin for Almuerzo-01
        admin_token = login(STORE_ADMIN_EMAIL, STORE_ADMIN_PASSWORD)

        # 3) Advance through the lifecycle: pagado -> en_preparacion -> listo -> entregado
        estados = ["pagado", "en_preparacion", "listo", "entregado"]
        for estado in estados:
            url = f"{BASE_URL}/orders/{order_id}/estado"
            headers_admin = {
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            }
            payload = {"estado": estado}
            resp = requests.post(url, json=payload, headers=headers_admin, timeout=TIMEOUT)
            # Expect success (200). Some backends might return 204; accept 200 or 204.
            assert resp.status_code in (200, 204), f"Advancing to '{estado}' failed: {resp.status_code} {resp.text}"
            if resp.status_code == 200:
                resp_json = resp.json()
                new_estado = get_estado_from_response(resp_json)
                # If the API returns the updated order, validate estado field
                if new_estado is not None:
                    assert new_estado == estado, f"Expected estado '{estado}', got '{new_estado}' in response: {resp_json}"
            # If 204 no body is returned, we will verify by doing a GET /orders maybe, but PRD doesn't define GET /orders/{id} reliably.
            # As minimal validation, proceed to next state.

        # If we reached here, transitions succeeded
        print(f"Order {order_id} successfully advanced through states: {estados}")

    except Exception:
        traceback.print_exc()
        raise
    finally:
        # Cleanup: attempt to cancel the order as the store admin (best-effort). Do not fail test if cancellation not allowed.
        try:
            if order_id and admin_token:
                cancel_url = f"{BASE_URL}/orders/{order_id}/cancel"
                headers_admin = {
                    "Authorization": f"Bearer {admin_token}",
                    "Content-Type": "application/json"
                }
                cancel_resp = requests.post(cancel_url, headers=headers_admin, timeout=TIMEOUT)
                if cancel_resp.status_code in (200, 204):
                    print(f"Cleanup: order {order_id} cancelled by admin (status {cancel_resp.status_code}).")
                else:
                    # If cancellation fails (e.g., 400/403/404) print info but do not raise.
                    print(f"Cleanup: cancel attempt returned {cancel_resp.status_code}: {cancel_resp.text}")
        except Exception:
            print("Cleanup: exception while attempting to cancel order:")
            traceback.print_exc()


if __name__ == "__main__":
    test_verify_post_orders_orderid_estado_endpoint_advances_order_status()
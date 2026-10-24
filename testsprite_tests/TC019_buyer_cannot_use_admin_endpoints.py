import requests
import uuid
import sys
from requests.exceptions import RequestException

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

def test_buyer_cannot_use_admin_endpoints():
    # Login as buyer
    try:
        resp = requests.post(
            f"{BASE_URL}/identity/login",
            json={"email": "ana@utb.edu.co", "password": "Comprador-2026"},
            timeout=TIMEOUT,
        )
    except RequestException as e:
        raise AssertionError(f"Login request failed: {e}") from e

    assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
    token = resp.json().get("access_token")
    assert token, f"No access_token in login response: {resp.text}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1) Buyer should get 403 when adjusting inventory for product 25
    try:
        r_inv = requests.post(
            f"{BASE_URL}/inventory/25/adjust",
            headers=headers,
            json={"delta": 1, "motivo": "conteo"},
            timeout=TIMEOUT,
        )
    except RequestException as e:
        raise AssertionError(f"Inventory adjust request failed: {e}") from e

    assert r_inv.status_code == 403, f"Expected 403 for inventory adjust, got {r_inv.status_code}: {r_inv.text}"

    # 2) Buyer should get 403 when creating a product
    unique_name = f"test-product-{uuid.uuid4()}"
    try:
        r_prod = requests.post(
            f"{BASE_URL}/catalog/products",
            headers=headers,
            json={
                "tienda": "punto-fit",
                "nombre": unique_name,
                "descripcion": "x",
                "precio_centavos": 100000,
            },
            timeout=TIMEOUT,
        )
    except RequestException as e:
        raise AssertionError(f"Create product request failed: {e}") from e

    assert r_prod.status_code == 403, f"Expected 403 for creating product, got {r_prod.status_code}: {r_prod.text}"

    # 3) Buyer should get 403 when listing orders for a store (admin endpoint)
    try:
        r_orders_list = requests.get(
            f"{BASE_URL}/orders",
            headers=headers,
            params={"tienda_id": 1},
            timeout=TIMEOUT,
        )
    except RequestException as e:
        raise AssertionError(f"Get orders by tienda_id request failed: {e}") from e

    assert r_orders_list.status_code == 403, f"Expected 403 for GET /orders?tienda_id=1, got {r_orders_list.status_code}: {r_orders_list.text}"

    # 4) Create an order as the buyer, then verify advancing its estado is forbidden (403)
    created_order_ids = []
    try:
        idempotency = str(uuid.uuid4())
        order_headers = headers.copy()
        order_headers["Idempotency-Key"] = idempotency

        # Use a known product id (Punto Fit product 29 per PRD)
        try:
            r_create = requests.post(
                f"{BASE_URL}/orders",
                headers=order_headers,
                json={"items": [{"product_id": 29, "cantidad": 1}]},
                timeout=TIMEOUT,
            )
        except RequestException as e:
            raise AssertionError(f"Create order request failed: {e}") from e

        assert r_create.status_code in (200, 201), f"Creating order failed: {r_create.status_code} {r_create.text}"
        resp_json = r_create.json()
        # Expect a list of orders (one per store)
        if isinstance(resp_json, list):
            for o in resp_json:
                if isinstance(o, dict) and "id" in o:
                    created_order_ids.append(o["id"])
        elif isinstance(resp_json, dict) and "orders" in resp_json and isinstance(resp_json["orders"], list):
            for o in resp_json["orders"]:
                if isinstance(o, dict) and "id" in o:
                    created_order_ids.append(o["id"])
        else:
            # Try to extract single order id
            if isinstance(resp_json, dict) and "id" in resp_json:
                created_order_ids.append(resp_json["id"])

        assert created_order_ids, f"No order ids returned from POST /orders: {r_create.text}"

        # Attempt to advance estado for each created order (buyer should be forbidden)
        for oid in created_order_ids:
            try:
                r_estado = requests.post(
                    f"{BASE_URL}/orders/{oid}/estado",
                    headers=headers,
                    json={"estado": "pagado"},
                    timeout=TIMEOUT,
                )
            except RequestException as e:
                raise AssertionError(f"Advance estado request failed for order {oid}: {e}") from e

            assert r_estado.status_code == 403, f"Expected 403 when buyer advances order estado for order {oid}, got {r_estado.status_code}: {r_estado.text}"

    finally:
        # Cleanup: try to cancel created orders so test data is removed
        for oid in created_order_ids:
            try:
                requests.post(f"{BASE_URL}/orders/{oid}/cancel", headers=headers, timeout=TIMEOUT)
            except Exception:
                # best-effort cleanup; do not fail the test on cleanup errors
                pass

if __name__ == "__main__":
    test_buyer_cannot_use_admin_endpoints()
    print("TC019 passed.")
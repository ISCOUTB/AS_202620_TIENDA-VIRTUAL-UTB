import requests
import uuid
import sys
import time

BASE = "http://localhost:8000"
TIMEOUT = 30.0

def test_same_idempotency_key_returns_same_orders():
    product_id = 18
    qty = 1
    email = "ana@utb.edu.co"
    password = "Comprador-2026"

    session = requests.Session()

    # Login
    try:
        r = session.post(f"{BASE}/identity/login",
                         json={"email": email, "password": password},
                         timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token")
    assert token, f"No access_token in login response: {r.text}"
    headers = {"Authorization": f"Bearer {token}"}

    def get_inventory_quantity(pid):
        # Try GET /inventory/{id}
        try:
            rr = session.get(f"{BASE}/inventory/{pid}", headers=headers, timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"GET inventory/{pid} failed: {e}")

        if rr.status_code == 200:
            data = rr.json()
            # data may be a dict with 'cantidad' or similar
            if isinstance(data, dict):
                for key in ("cantidad", "cantidad_actual", "cantidad_disponible", "stock", "existencias"):
                    if key in data:
                        return int(data[key])
                # maybe nested product
                if "producto" in data and isinstance(data["producto"], dict):
                    for key in ("cantidad", "stock"):
                        if key in data["producto"]:
                            return int(data["producto"][key])
            # if it's a list, try to find matching product id
            if isinstance(data, list):
                for item in data:
                    if item is None:
                        continue
                    if item.get("product_id") == pid or item.get("producto_id") == pid or item.get("id") == pid:
                        for key in ("cantidad", "stock", "cantidad_actual", "existencias"):
                            if key in item:
                                return int(item[key])
            raise AssertionError(f"Unexpected inventory/{pid} response structure: {data}")

        # If 404 or other, fallback to GET /inventory (list) and search
        try:
            rr2 = session.get(f"{BASE}/inventory", headers=headers, timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"GET inventory failed: {e}")
        assert rr2.status_code == 200, f"GET /inventory failed: {rr2.status_code} {rr2.text}"
        data = rr2.json()
        if not isinstance(data, list):
            raise AssertionError(f"Unexpected /inventory response structure: {data}")
        for item in data:
            if item is None:
                continue
            if item.get("product_id") == pid or item.get("producto_id") == pid or item.get("id") == pid:
                for key in ("cantidad", "stock", "cantidad_actual", "existencias"):
                    if key in item:
                        return int(item[key])
        raise AssertionError(f"Product {pid} not found in inventory list")

    # Read initial quantity
    initial_qty = get_inventory_quantity(product_id)

    idempotency_key = str(uuid.uuid4())
    order_body = {"items": [{"product_id": product_id, "cantidad": qty}]}

    created_order_ids = []

    try:
        # First POST -> expect 201
        try:
            r1 = session.post(f"{BASE}/orders",
                              headers={**headers, "Idempotency-Key": idempotency_key},
                              json=order_body,
                              timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"POST /orders (first) failed: {e}")

        assert r1.status_code == 201, f"First POST /orders expected 201, got {r1.status_code}: {r1.text}"
        resp1 = r1.json()
        assert isinstance(resp1, list), f"First POST /orders response not a list: {resp1}"
        assert len(resp1) >= 1, f"First POST /orders returned empty list: {resp1}"

        def extract_order_ids(resp_list):
            ids = []
            for o in resp_list:
                if not isinstance(o, dict):
                    continue
                oid = o.get("id") or o.get("order_id") or o.get("pedido_id") or o.get("pedido") or o.get("orderId")
                if oid is None:
                    # try deeper keys
                    for k in ("id", "order_id", "pedido_id"):
                        if k in o:
                            oid = o[k]
                            break
                if oid is None:
                    raise AssertionError(f"Could not extract order id from object: {o}")
                ids.append(str(oid))
            return ids

        created_order_ids = extract_order_ids(resp1)
        assert len(created_order_ids) == len(resp1), "Mismatch extracting order ids"

        # Check stock decreased by qty once
        after_first_qty = get_inventory_quantity(product_id)
        assert after_first_qty == initial_qty - qty, f"Expected stock {initial_qty - qty} after first order, got {after_first_qty}"

        # Second POST with same Idempotency-Key -> expect 200 and same order ids
        try:
            r2 = session.post(f"{BASE}/orders",
                              headers={**headers, "Idempotency-Key": idempotency_key},
                              json=order_body,
                              timeout=TIMEOUT)
        except requests.exceptions.RequestException as e:
            raise AssertionError(f"POST /orders (second) failed: {e}")

        assert r2.status_code == 200, f"Second POST /orders expected 200, got {r2.status_code}: {r2.text}"
        resp2 = r2.json()
        assert isinstance(resp2, list), f"Second POST /orders response not a list: {resp2}"
        assert len(resp2) == len(resp1), f"Second response list length differs from first: {len(resp2)} vs {len(resp1)}"

        second_order_ids = extract_order_ids(resp2)
        # Compare sets (order within list might be same but ensure same ids)
        assert set(second_order_ids) == set(created_order_ids), f"Order IDs differ between requests: first={created_order_ids} second={second_order_ids}"

        # Check stock did not decrease again
        after_second_qty = get_inventory_quantity(product_id)
        assert after_second_qty == after_first_qty, f"Stock decreased on second identical request: was {after_first_qty}, now {after_second_qty}"

    finally:
        # Cleanup: cancel created orders to restore stock
        # Attempt cancellation for each created order id; ignore failures but try best effort.
        for oid in created_order_ids:
            try:
                cancel_url = f"{BASE}/orders/{oid}/cancel"
                try:
                    rc = session.post(cancel_url, headers=headers, timeout=TIMEOUT)
                except requests.exceptions.RequestException:
                    rc = None
                # If cancellation returns 200 or 204 consider success. If 400/403/404, still continue.
                # Do not raise here to ensure cleanup attempts for all orders.
            except Exception:
                pass

        # After cancellations, ensure stock is restored to initial (best-effort, may depend on API behavior)
        try:
            final_qty = get_inventory_quantity(product_id)
            # final_qty should be initial_qty if cancels succeeded; if not, at least it must not be less than initial- qty*1 (we already decreased once)
            if final_qty != initial_qty:
                # it's acceptable if final_qty equals after_first_qty (if cancellation didn't run), but warn by failing the test
                raise AssertionError(f"Final stock after cleanup is {final_qty}, expected to be restored to initial {initial_qty}")
        except AssertionError:
            raise
        except Exception:
            # If we cannot verify final stock, raise to indicate incomplete cleanup verification
            raise AssertionError("Could not verify final inventory quantity after cleanup")

if __name__ == "__main__":
    test_same_idempotency_key_returns_same_orders()
    print("TC026 passed")
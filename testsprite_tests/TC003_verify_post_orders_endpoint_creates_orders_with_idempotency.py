import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

def test_verify_post_orders_endpoint_creates_orders_with_idempotency():
    session = requests.Session()
    created_order_ids = []

    def login(email, password):
        url = f"{BASE_URL}/identity/login"
        resp = session.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
        data = resp.json()
        assert "access_token" in data, f"No access_token in login response: {data}"
        return data["access_token"]

    token = login("ana@utb.edu.co", "Comprador-2026")
    auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    try:
        # 1) Unauthorized request is rejected (no Authorization)
        idemp_key = str(uuid.uuid4())
        url = f"{BASE_URL}/orders"
        headers_no_auth = {"Idempotency-Key": idemp_key, "Content-Type": "application/json"}
        resp = session.post(url, json={"items":[{"product_id":4,"cantidad":1}]}, headers=headers_no_auth, timeout=TIMEOUT)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated POST /orders, got {resp.status_code}: {resp.text}"
        www_auth = resp.headers.get("WWW-Authenticate", "")
        assert www_auth.lower().startswith("bearer"), f"Expected WWW-Authenticate: Bearer header for 401, got: {www_auth}"

        # 2) Request without Idempotency-Key is rejected (422 or 400)
        resp = session.post(url, json={"items":[{"product_id":4,"cantidad":1}]}, headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code in (400, 422), f"Expected 400 or 422 when missing Idempotency-Key, got {resp.status_code}: {resp.text}"

        # 3) Create a single-store order with a fresh Idempotency-Key
        idemp_single = str(uuid.uuid4())
        headers_single = {**auth_headers, "Idempotency-Key": idemp_single}
        body_single = {"items":[{"product_id":4,"cantidad":1}]}
        resp = session.post(url, json=body_single, headers=headers_single, timeout=TIMEOUT)
        assert resp.status_code in (200,201), f"Unexpected status creating order: {resp.status_code} {resp.text}"
        orders = resp.json()
        assert isinstance(orders, list) and len(orders) == 1, f"Expected list of 1 order, got: {orders}"
        first_order = orders[0]
        assert "id" in first_order, f"Created order missing id: {first_order}"
        assert "items" in first_order and any(item.get("product_id")==4 for item in first_order["items"]), f"Order items do not include product 4: {first_order.get('items')}"
        created_order_ids.extend([first_order["id"]])

        # 4) Repeat the same POST with the same Idempotency-Key -> should return same order(s) (no duplicate)
        resp = session.post(url, json=body_single, headers=headers_single, timeout=TIMEOUT)
        assert resp.status_code in (200,201), f"Unexpected status on idempotent POST: {resp.status_code} {resp.text}"
        orders_repeat = resp.json()
        assert isinstance(orders_repeat, list) and len(orders_repeat) == 1, f"Expected same single order, got: {orders_repeat}"
        assert orders_repeat[0].get("id") == first_order.get("id"), f"Idempotent POST returned different order id: {orders_repeat[0].get('id')} vs {first_order.get('id')}"

        # 5) Create a multi-store order (products from two different stores)
        idemp_multi = str(uuid.uuid4())
        headers_multi = {**auth_headers, "Idempotency-Key": idemp_multi}
        # product 4 -> tienda 1, product 27 -> tienda 2 (per PRD/test plan)
        body_multi = {"items":[{"product_id":4,"cantidad":1},{"product_id":27,"cantidad":2}]}
        resp = session.post(url, json=body_multi, headers=headers_multi, timeout=TIMEOUT)
        assert resp.status_code in (200,201), f"Unexpected status creating multi-store order: {resp.status_code} {resp.text}"
        orders_multi = resp.json()
        assert isinstance(orders_multi, list) and len(orders_multi) >= 2, f"Expected at least 2 orders for multi-store request, got: {orders_multi}"

        # Validate each store's order contains expected items
        # We map product_id to presence in returned orders
        found_products = set()
        multi_ids = []
        for o in orders_multi:
            assert "id" in o, f"Order missing id in multi-store response: {o}"
            multi_ids.append(o["id"])
            items = o.get("items", [])
            for it in items:
                pid = it.get("product_id")
                if pid in (4,27):
                    found_products.add(pid)
        assert 4 in found_products and 27 in found_products, f"Multi-store response missing products 4 or 27: found {found_products}"
        created_order_ids.extend(multi_ids)

    finally:
        # Cleanup: attempt to cancel all created orders
        for oid in set(created_order_ids):
            try:
                cancel_url = f"{BASE_URL}/orders/{oid}/cancel"
                resp = session.post(cancel_url, headers=auth_headers, timeout=TIMEOUT)
                # Accept 200 as success; 400/404/403 might mean already cancelled or not allowed, but log them
                if resp.status_code not in (200, 400, 404, 403):
                    print(f"Warning: cancel order {oid} returned unexpected status {resp.status_code}: {resp.text}", file=sys.stderr)
            except requests.RequestException as e:
                print(f"Error cancelling order {oid}: {e}", file=sys.stderr)

if __name__ == "__main__":
    test_verify_post_orders_endpoint_creates_orders_with_idempotency()
    print("TC003 completed")
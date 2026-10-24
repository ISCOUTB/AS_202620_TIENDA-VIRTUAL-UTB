import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

def test_multi_store_order_splits_by_store():
    session = requests.Session()
    order_ids = []
    try:
        # 1) Login as ana
        login_url = f"{BASE_URL}/identity/login"
        login_payload = {"email": "ana@utb.edu.co", "password": "Comprador-2026"}
        resp = session.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
        data = resp.json()
        assert "access_token" in data, f"No access_token in login response: {data}"
        token = data["access_token"]

        headers = {
            "Authorization": f"Bearer {token}",
            "Idempotency-Key": str(uuid.uuid4()),
            "Content-Type": "application/json"
        }

        # 2) Create an order with product 4 (Antojos -> tienda_id 1) and product 27 (Punto Fit -> tienda_id 2)
        orders_url = f"{BASE_URL}/orders"
        order_payload = {
            "items": [
                {"product_id": 4, "cantidad": 1},
                {"product_id": 27, "cantidad": 1}
            ]
        }

        resp = session.post(orders_url, json=order_payload, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Expected 201 Created, got {resp.status_code}: {resp.text}"
        orders_list = resp.json()
        assert isinstance(orders_list, list), f"Response should be a list of orders: {orders_list}"
        # Expect two orders: one per store
        assert len(orders_list) == 2, f"Expected 2 orders (one per store), got {len(orders_list)}: {orders_list}"

        found_store1 = False
        found_store2 = False

        for order in orders_list:
            # Basic structure checks
            assert "id" in order, f"Order missing id: {order}"
            assert "tienda_id" in order, f"Order missing tienda_id: {order}"
            assert "items" in order and isinstance(order["items"], list) and len(order["items"]) >= 1, f"Order items invalid: {order}"
            assert ("total_centavos" in order and isinstance(order["total_centavos"], int)), f"Order missing total_centavos or not int: {order}"

            order_id = order["id"]
            order_ids.append(order_id)

            tienda_id = order["tienda_id"]
            product_ids_in_order = [item.get("product_id") for item in order["items"]]

            # Validate mapping: product 4 -> tienda 1, product 27 -> tienda 2
            if 4 in product_ids_in_order:
                assert tienda_id == 1, f"Product 4 should be in tienda_id 1 but order {order_id} has tienda_id {tienda_id}"
                found_store1 = True
                # Ensure only product 4 is in this order (or at least that no product from other stores is mixed)
                assert 27 not in product_ids_in_order, f"Order {order_id} mixes products from different stores: {product_ids_in_order}"
            if 27 in product_ids_in_order:
                assert tienda_id == 2, f"Product 27 should be in tienda_id 2 but order {order_id} has tienda_id {tienda_id}"
                found_store2 = True
                assert 4 not in product_ids_in_order, f"Order {order_id} mixes products from different stores: {product_ids_in_order}"

        assert found_store1 and found_store2, f"Did not find expected store orders. found_store1={found_store1}, found_store2={found_store2}"

        print("Test TC027 passed: multi-store order created and split by store as expected.")
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"HTTP request failed: {e}") from e
    finally:
        # Cleanup: cancel created orders to avoid leaving test data (buyer can cancel pending orders)
        if order_ids:
            cancel_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            for oid in order_ids:
                try:
                    cancel_url = f"{BASE_URL}/orders/{oid}/cancel"
                    resp = session.post(cancel_url, headers=cancel_headers, timeout=TIMEOUT)
                    # Accept 200 or 400/404 depending on state; log unexpected failures as assertion but do not raise in finally
                    if resp.status_code == 200:
                        print(f"Cancelled order {oid}")
                    else:
                        print(f"Could not cancel order {oid}: status {resp.status_code} response: {resp.text}")
                except Exception as e:
                    print(f"Error while cancelling order {oid}: {e}", file=sys.stderr)

if __name__ == "__main__":
    test_multi_store_order_splits_by_store()
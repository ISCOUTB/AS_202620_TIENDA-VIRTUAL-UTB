import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
LOGIN_EMAIL = "ana@utb.edu.co"
LOGIN_PASSWORD = "Comprador-2026"
TIMEOUT = 30


def test_order_more_than_stock_is_rejected():
    session = requests.Session()
    created_order_ids = []

    try:
        # 1) Login as buyer (ana)
        login_url = f"{BASE_URL}/identity/login"
        r = session.post(login_url, json={"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}, timeout=TIMEOUT)
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        token = r.json().get("access_token")
        assert token, "No access_token in login response"
        auth_headers = {"Authorization": f"Bearer {token}"}

        # helper to get user's orders
        def get_orders():
            resp = session.get(f"{BASE_URL}/orders", headers=auth_headers, timeout=TIMEOUT)
            if resp.status_code == 200:
                try:
                    return resp.json()
                except Exception:
                    return []
            else:
                # For unexpected statuses raise
                resp.raise_for_status()

        # snapshot orders before attempts
        orders_before = get_orders()
        before_order_ids_with_product5 = {
            o.get("id") for o in orders_before for it in o.get("items", []) if it.get("product_id") == 5
        }

        # 2) Attempt to order product 5 (assumed 0 stock) -> expect 400 and no order created
        order_url = f"{BASE_URL}/orders"
        idempotency_key = str(uuid.uuid4())
        headers = {"Idempotency-Key": idempotency_key, **auth_headers}
        payload = {"items": [{"product_id": 5, "cantidad": 1}]}
        resp = session.post(order_url, json=payload, headers=headers, timeout=TIMEOUT)
        # Expect 400 (bad request due to insufficient stock)
        assert resp.status_code == 400, f"Expected 400 when ordering out-of-stock product, got {resp.status_code}: {resp.text}"

        # Ensure no new order containing product 5 was created
        orders_after = get_orders()
        after_order_ids_with_product5 = {
            o.get("id") for o in orders_after for it in o.get("items", []) if it.get("product_id") == 5
        }
        # The set of orders containing product 5 should not have new ids beyond the ones present before
        assert after_order_ids_with_product5.issubset(before_order_ids_with_product5), (
            "A new order containing product 5 was created despite expected rejection"
        )

        # 3) Attempt with cantidad = 0 -> expect 422
        idempotency_key = str(uuid.uuid4())
        headers = {"Idempotency-Key": idempotency_key, **auth_headers}
        payload_zero = {"items": [{"product_id": 5, "cantidad": 0}]}
        resp_zero = session.post(order_url, json=payload_zero, headers=headers, timeout=TIMEOUT)
        assert resp_zero.status_code == 422, f"Expected 422 for cantidad 0, got {resp_zero.status_code}: {resp_zero.text}"

        # 4) Attempt with cantidad negative -> expect 422
        idempotency_key = str(uuid.uuid4())
        headers = {"Idempotency-Key": idempotency_key, **auth_headers}
        payload_negative = {"items": [{"product_id": 5, "cantidad": -1}]}
        resp_neg = session.post(order_url, json=payload_negative, headers=headers, timeout=TIMEOUT)
        assert resp_neg.status_code == 422, f"Expected 422 for negative cantidad, got {resp_neg.status_code}: {resp_neg.text}"

    except AssertionError:
        raise
    except requests.RequestException as e:
        raise RuntimeError(f"HTTP request failed: {e}")
    finally:
        # If any orders were created unexpectedly, attempt to cancel them to clean up
        if created_order_ids:
            for oid in created_order_ids:
                try:
                    cancel_url = f"{BASE_URL}/orders/{oid}/cancel"
                    session.post(cancel_url, headers=auth_headers, timeout=TIMEOUT)
                except Exception:
                    pass


if __name__ == "__main__":
    try:
        test_order_more_than_stock_is_rejected()
        print("TC028 passed")
    except AssertionError as ae:
        print("TC028 failed:", ae)
        sys.exit(1)
    except Exception as e:
        print("TC028 error:", e)
        sys.exit(2)
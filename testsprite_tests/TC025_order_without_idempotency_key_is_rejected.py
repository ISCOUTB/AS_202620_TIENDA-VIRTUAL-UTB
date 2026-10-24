import requests
import sys
from typing import List

BASE_URL = "http://localhost:8000"
LOGIN_PATH = "/identity/login"
ORDERS_PATH = "/orders"
TIMEOUT = 30


def test_order_without_idempotency_key_is_rejected():
    # Login as buyer ana
    login_url = BASE_URL + LOGIN_PATH
    try:
        r = requests.post(login_url, json={"email": "ana@utb.edu.co", "password": "Comprador-2026"}, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")
    assert r.status_code == 200, f"Login failed with status {r.status_code}: {r.text}"
    token = r.json().get("access_token")
    assert token, "No access_token in login response"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    created_order_ids: List[int] = []

    try:
        # Test 1: POST /orders without Idempotency-Key header -> expect 422 or 400
        orders_url = BASE_URL + ORDERS_PATH
        body = {"items": [{"product_id": 29, "cantidad": 1}]}
        try:
            resp_no_key = requests.post(orders_url, headers=headers, json=body, timeout=TIMEOUT)
        except requests.RequestException as e:
            raise AssertionError(f"Request without Idempotency-Key failed: {e}")

        if resp_no_key.status_code in (400, 422):
            # Expected rejection
            pass
        elif resp_no_key.status_code in (200, 201):
            # Unexpectedly created orders; collect ids for cleanup and fail the test
            try:
                orders_list = resp_no_key.json()
            except ValueError:
                raise AssertionError(f"Expected JSON response but got: {resp_no_key.text}")
            if isinstance(orders_list, list):
                for o in orders_list:
                    oid = o.get("id") or o.get("order_id") or o.get("orderId")
                    if oid:
                        created_order_ids.append(oid)
            raise AssertionError(f"Expected 400/422 for missing Idempotency-Key but got {resp_no_key.status_code}")
        else:
            raise AssertionError(f"Unexpected status code for missing Idempotency-Key: {resp_no_key.status_code} - {resp_no_key.text}")

        # Test 2: POST /orders with non-UUID Idempotency-Key -> expect 422
        headers_with_invalid_key = headers.copy()
        headers_with_invalid_key["Idempotency-Key"] = "not-a-uuid"

        try:
            resp_bad_key = requests.post(orders_url, headers=headers_with_invalid_key, json=body, timeout=TIMEOUT)
        except requests.RequestException as e:
            raise AssertionError(f"Request with invalid Idempotency-Key failed: {e}")

        # Expect 422 specifically for invalid UUID; some servers might also use 400 but spec says 422 for non-UUID.
        if resp_bad_key.status_code == 422:
            pass  # expected
        elif resp_bad_key.status_code in (400,):
            # Accept 400 as alternative per test description
            pass
        elif resp_bad_key.status_code in (200, 201):
            # Unexpectedly created orders; collect ids for cleanup and fail the test
            try:
                orders_list = resp_bad_key.json()
            except ValueError:
                raise AssertionError(f"Expected JSON response but got: {resp_bad_key.text}")
            if isinstance(orders_list, list):
                for o in orders_list:
                    oid = o.get("id") or o.get("order_id") or o.get("orderId")
                    if oid:
                        created_order_ids.append(oid)
            raise AssertionError(f"Expected 422 (or 400) for non-UUID Idempotency-Key but got {resp_bad_key.status_code}")
        else:
            raise AssertionError(f"Unexpected status code for non-UUID Idempotency-Key: {resp_bad_key.status_code} - {resp_bad_key.text}")

    finally:
        # Cleanup any orders that were unexpectedly created
        for oid in created_order_ids:
            try:
                cancel_url = f"{BASE_URL}{ORDERS_PATH}/{oid}/cancel"
                # Attempt to cancel as the same buyer
                requests.post(cancel_url, headers=headers, timeout=TIMEOUT)
            except requests.RequestException:
                # Best-effort cleanup; ignore errors here
                pass


if __name__ == "__main__":
    try:
        test_order_without_idempotency_key_is_rejected()
        print("TC025 passed")
    except AssertionError as e:
        print(f"TC025 failed: {e}")
        sys.exit(1)
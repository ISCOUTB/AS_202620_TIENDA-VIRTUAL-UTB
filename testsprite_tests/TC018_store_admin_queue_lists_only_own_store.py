import requests
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30


def test_store_admin_queue_lists_only_own_store():
    login_url = f"{BASE_URL}/identity/login"
    creds = {"email": "admin.antojos@utb.edu.co", "password": "Tienda-2026"}

    try:
        resp = requests.post(login_url, json=creds, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")

    assert resp.status_code == 200, f"Login failed: status={resp.status_code}, body={resp.text}"
    try:
        token = resp.json().get("access_token")
    except ValueError:
        raise AssertionError(f"Login response is not valid JSON: {resp.text}")
    assert token, f"No access_token in login response: {resp.text}"

    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    # GET orders for tienda_id=1 (own store) -> should be 200 and every order.tienda_id == 1
    try:
        r1 = requests.get(f"{BASE_URL}/orders", headers=headers, params={"tienda_id": 1}, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"GET /orders?tienda_id=1 request failed: {e}")

    assert r1.status_code == 200, f"Expected 200 for tienda_id=1, got {r1.status_code}: {r1.text}"
    try:
        orders = r1.json()
    except ValueError:
        raise AssertionError(f"Response for tienda_id=1 is not valid JSON: {r1.text}")

    assert isinstance(orders, list), f"Expected list of orders for tienda_id=1, got {type(orders)}"

    for idx, order in enumerate(orders):
        if not isinstance(order, dict):
            raise AssertionError(f"Order at index {idx} is not an object: {order}")
        tienda_id = order.get("tienda_id")
        assert tienda_id == 1, f"Order {order.get('id', '<no id>')} has tienda_id={tienda_id}, expected 1"

    # GET orders for tienda_id=2 (other store) -> should be 403
    try:
        r2 = requests.get(f"{BASE_URL}/orders", headers=headers, params={"tienda_id": 2}, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"GET /orders?tienda_id=2 request failed: {e}")

    assert r2.status_code == 403, f"Expected 403 for tienda_id=2, got {r2.status_code}: {r2.text}"

    print("TC018 passed: store admin can list only their own store queue and is forbidden from other stores.")


if __name__ == "__main__":
    try:
        test_store_admin_queue_lists_only_own_store()
    except AssertionError as e:
        print(f"TEST FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}", file=sys.stderr)
        sys.exit(2)
    else:
        sys.exit(0)
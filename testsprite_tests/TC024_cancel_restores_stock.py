import requests
import uuid
import sys
from requests.exceptions import RequestException

BASE_URL = "http://localhost:8000"
LOGIN_EMAIL = "ana@utb.edu.co"
LOGIN_PASSWORD = "Comprador-2026"
PRODUCT_ID = 15
TIMEOUT = 30


def _raise_for_req(exc):
    raise AssertionError(f"Request error: {exc}")


def login_and_get_token(email: str, password: str) -> str:
    try:
        resp = requests.post(
            f"{BASE_URL}/identity/login",
            json={"email": email, "password": password},
            timeout=TIMEOUT,
        )
    except RequestException as e:
        _raise_for_req(e)
    assert resp.status_code == 200, f"Login failed ({resp.status_code}): {resp.text}"
    data = resp.json()
    token = data.get("access_token")
    assert token, f"No access_token in login response: {data}"
    return token


def get_inventory_quantity(product_id: int, headers: dict) -> int:
    try:
        resp = requests.get(f"{BASE_URL}/inventory/{product_id}", headers=headers, timeout=TIMEOUT)
    except RequestException as e:
        _raise_for_req(e)
    assert resp.status_code == 200, f"GET /inventory/{product_id} failed ({resp.status_code}): {resp.text}"
    data = resp.json()
    # inventory endpoint might return an object or a list; handle common keys
    item = None
    if isinstance(data, list):
        if len(data) == 0:
            raise AssertionError(f"GET /inventory/{product_id} returned empty list")
        item = data[0]
    elif isinstance(data, dict):
        item = data
    else:
        raise AssertionError(f"Unexpected inventory response shape: {data}")

    for key in ("cantidad", "existencias", "stock", "cantidad_existencias"):
        if key in item:
            val = item[key]
            if isinstance(val, int):
                return val
            # sometimes numeric in string
            try:
                return int(val)
            except Exception:
                pass
    # fallback: try to find any int value
    for v in item.values():
        if isinstance(v, int):
            return v
    raise AssertionError(f"Could not extract quantity from inventory item: {item}")


def create_order(items: list, headers: dict):
    idempotency = str(uuid.uuid4())
    hdrs = headers.copy()
    hdrs["Idempotency-Key"] = idempotency
    body = {"items": items}
    try:
        resp = requests.post(f"{BASE_URL}/orders", headers=hdrs, json=body, timeout=TIMEOUT)
    except RequestException as e:
        _raise_for_req(e)
    assert resp.status_code in (200, 201), f"POST /orders failed ({resp.status_code}): {resp.text}"
    data = resp.json()
    assert isinstance(data, list) and len(data) >= 1, f"Expected list of orders, got: {data}"
    return data


def extract_order_id(order_obj: dict):
    for key in ("id", "order_id", "pedido_id"):
        if key in order_obj:
            return order_obj[key]
    # fallback: if there's a numeric field named 'numero' or similar
    for k, v in order_obj.items():
        if k.lower().endswith("id") and isinstance(v, (int, str)):
            return v
    raise AssertionError(f"Could not extract order id from: {order_obj}")


def cancel_order(order_id, headers: dict):
    try:
        resp = requests.post(f"{BASE_URL}/orders/{order_id}/cancel", headers=headers, timeout=TIMEOUT)
    except RequestException as e:
        _raise_for_req(e)
    return resp


def test_cancel_restores_stock():
    token = login_and_get_token(LOGIN_EMAIL, LOGIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    # Read original stock
    original_qty = get_inventory_quantity(PRODUCT_ID, headers)
    assert isinstance(original_qty, int), f"Original quantity not int: {original_qty}"

    order_created = False
    order_id = None
    try:
        # Create order of 2 units of product 15
        items = [{"product_id": PRODUCT_ID, "cantidad": 2}]
        orders = create_order(items, headers)
        # pick first returned order
        order_obj = orders[0]
        order_id = extract_order_id(order_obj)
        order_created = True

        # After creation, stock should decrease by 2
        after_qty = get_inventory_quantity(PRODUCT_ID, headers)
        expected_after = original_qty - 2
        assert after_qty == expected_after, (
            f"Stock after ordering does not match expected. "
            f"original={original_qty}, after={after_qty}, expected={expected_after}"
        )

        # Cancel the order as buyer
        resp_cancel = cancel_order(order_id, headers)
        assert resp_cancel.status_code == 200, f"Cancel returned unexpected status {resp_cancel.status_code}: {resp_cancel.text}"

        # After cancel, stock should be restored to original
        restored_qty = get_inventory_quantity(PRODUCT_ID, headers)
        assert restored_qty == original_qty, (
            f"Stock after cancel not restored. expected={original_qty}, actual={restored_qty}"
        )

    finally:
        # Ensure order is cancelled (best-effort). Ignore non-200/non-4xx responses in cleanup.
        if order_created and order_id is not None:
            try:
                resp = cancel_order(order_id, headers)
                # acceptable statuses: 200 (cancelled), 400/409 if already closed, 404 if not visible
                if resp.status_code not in (200, 400, 404, 409):
                    # raise to notify unexpected cleanup failure
                    raise AssertionError(f"Unexpected status during cleanup cancel: {resp.status_code} {resp.text}")
            except RequestException:
                # don't mask original assertion errors; just print to stderr
                print("Cleanup: failed to cancel order due to request error", file=sys.stderr)


if __name__ == "__main__":
    test_cancel_restores_stock()
    print("TC024 passed")
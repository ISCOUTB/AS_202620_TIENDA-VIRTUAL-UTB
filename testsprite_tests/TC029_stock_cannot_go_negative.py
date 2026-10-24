import requests
import sys

BASE = "http://localhost:8000"
PRODUCT_ID = 14
EMAIL = "admin.antojos@utb.edu.co"
PASSWORD = "Tienda-2026"
TIMEOUT = 30.0

def login(email, password):
    url = f"{BASE}/identity/login"
    resp = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
    body = resp.json()
    assert "access_token" in body, f"No access_token in login response: {body}"
    return body["access_token"]

def get_inventory_item(product_id, headers):
    url = f"{BASE}/inventory/{product_id}"
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 200, f"GET /inventory/{product_id} failed: {resp.status_code} {resp.text}"
    body = resp.json()
    # body may be an object or a list; handle both
    if isinstance(body, dict):
        if "cantidad" in body:
            return body
        # sometimes the product may be nested
        if "data" in body and isinstance(body["data"], dict) and "cantidad" in body["data"]:
            return body["data"]
    if isinstance(body, list):
        for item in body:
            # try common keys
            if item.get("id") == product_id or item.get("product_id") == product_id or item.get("producto_id") == product_id:
                if "cantidad" in item:
                    return item
    raise AssertionError(f"Could not find inventory item {product_id} in response: {body}")

def post_adjust(product_id, payload, headers):
    url = f"{BASE}/inventory/{product_id}/adjust"
    return requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)

def put_inventory(product_id, payload, headers):
    url = f"{BASE}/inventory/{product_id}"
    return requests.put(url, json=payload, headers=headers, timeout=TIMEOUT)

def test_stock_cannot_go_negative():
    token = login(EMAIL, PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    # Read current cantidad
    item = get_inventory_item(PRODUCT_ID, headers)
    assert "cantidad" in item, f"Inventory item missing 'cantidad': {item}"
    initial_cantidad = int(item["cantidad"])

    # Attempt to reduce by more than available: delta = -(cantidad + 1)
    payload_neg_over = {"delta": -(initial_cantidad + 1), "motivo": "merma"}
    resp = post_adjust(PRODUCT_ID, payload_neg_over, headers)
    # Expect 400 for over-decrement
    assert resp.status_code == 400, f"Expected 400 when reducing below zero, got {resp.status_code}: {resp.text}"

    # Verify cantidad unchanged
    item_after = get_inventory_item(PRODUCT_ID, headers)
    assert int(item_after["cantidad"]) == initial_cantidad, (
        f"Cantidad changed after rejected over-decrement: before={initial_cantidad}, after={item_after['cantidad']}"
    )

    # Attempt to set cantidad to -1 with PUT -> expect 422
    resp_put = put_inventory(PRODUCT_ID, {"cantidad": -1}, headers)
    assert resp_put.status_code == 422, f"Expected 422 when setting negative cantidad, got {resp_put.status_code}: {resp_put.text}"

    # delta 0 should be rejected (400 or 422)
    resp_delta_zero = post_adjust(PRODUCT_ID, {"delta": 0, "motivo": "merma"}, headers)
    assert resp_delta_zero.status_code in (400, 422), (
        f"Expected 400 or 422 for delta 0, got {resp_delta_zero.status_code}: {resp_delta_zero.text}"
    )

    # Final verify cantidad unchanged
    final_item = get_inventory_item(PRODUCT_ID, headers)
    assert int(final_item["cantidad"]) == initial_cantidad, (
        f"Cantidad changed after delta=0 or invalid PUT: before={initial_cantidad}, final={final_item['cantidad']}"
    )

    print("TC029 stock_cannot_go_negative: PASSED")

if __name__ == "__main__":
    try:
        test_stock_cannot_go_negative()
    except AssertionError as e:
        print("TC029 stock_cannot_go_negative: FAILED")
        print(str(e))
        sys.exit(1)
    except requests.RequestException as e:
        print("TC029 stock_cannot_go_negative: ERROR during HTTP request")
        print(str(e))
        sys.exit(2)
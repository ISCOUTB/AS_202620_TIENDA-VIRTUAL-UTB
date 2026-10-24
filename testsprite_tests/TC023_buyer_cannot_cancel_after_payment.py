import requests
import uuid
import sys
import time

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

BUYER_EMAIL = "ana@utb.edu.co"
BUYER_PASSWORD = "Comprador-2026"

ADMIN_EMAIL = "admin.almuerzo-01@utb.edu.co"
ADMIN_PASSWORD = "Tienda-2026"

PRODUCT_ID = 53  # product in almuerzo-01 per PRD
ORDER_QUANTITY = 1

def login(email, password):
    url = f"{BASE_URL}/identity/login"
    resp = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    if resp.status_code != 200:
        raise AssertionError(f"Login failed for {email}: {resp.status_code} {resp.text}")
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise AssertionError(f"No access_token in login response for {email}: {data}")
    return token

def get_inventory_qty(product_id, token=None):
    url = f"{BASE_URL}/inventory/{product_id}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    if resp.status_code != 200:
        raise AssertionError(f"GET /inventory/{product_id} failed: {resp.status_code} {resp.text}")
    data = resp.json()
    # Expecting key 'cantidad'
    if isinstance(data, dict) and "cantidad" in data:
        return int(data["cantidad"])
    # Fallbacks if API shapes differ
    if isinstance(data, dict) and "existencias" in data:
        return int(data["existencias"])
    raise AssertionError(f"Unexpected inventory response shape: {data}")

def create_order(buyer_token, product_id, cantidad):
    url = f"{BASE_URL}/orders"
    idempotency = str(uuid.uuid4())
    headers = {
        "Authorization": f"Bearer {buyer_token}",
        "Idempotency-Key": idempotency,
        "Content-Type": "application/json",
    }
    body = {"items": [{"product_id": product_id, "cantidad": cantidad}]}
    resp = requests.post(url, json=body, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (200, 201):
        raise AssertionError(f"POST /orders failed: {resp.status_code} {resp.text}")
    return resp.json()

def find_order_for_product(orders_list, product_id):
    if not isinstance(orders_list, list):
        raise AssertionError(f"Expected list from POST /orders, got: {orders_list}")
    for order in orders_list:
        items = order.get("items") or []
        for it in items:
            # item might be dict with product_id key
            if it.get("product_id") == product_id:
                return order
    # fallback: if single order and items field missing, return first
    if len(orders_list) == 1:
        return orders_list[0]
    raise AssertionError(f"No order found for product_id {product_id} in response: {orders_list}")

def advance_order_status(order_id, estado, admin_token):
    url = f"{BASE_URL}/orders/{order_id}/estado"
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    resp = requests.post(url, json={"estado": estado}, headers=headers, timeout=TIMEOUT)
    return resp

def cancel_order(order_id, token):
    url = f"{BASE_URL}/orders/{order_id}/cancel"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, timeout=TIMEOUT)
    return resp

def test_buyer_cannot_cancel_after_payment():
    buyer_token = login(BUYER_EMAIL, BUYER_PASSWORD)
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    order_id = None
    try:
        # Read inventory before placing order
        qty_before = get_inventory_qty(PRODUCT_ID, token=admin_token)

        # Create order as buyer
        orders_resp = create_order(buyer_token, PRODUCT_ID, ORDER_QUANTITY)
        order = find_order_for_product(orders_resp, PRODUCT_ID)
        order_id = order.get("id") or order.get("order_id")
        assert order_id, f"Order id not found in response: {order}"

        # Small delay to allow backend to adjust stock
        time.sleep(0.5)

        qty_after_order = get_inventory_qty(PRODUCT_ID, token=admin_token)

        # Ensure stock decreased by at least the ordered quantity
        decreased = qty_before - qty_after_order
        assert decreased >= ORDER_QUANTITY, (
            f"Inventory did not decrease by expected amount after order. "
            f"before={qty_before}, after={qty_after_order}, expected_decrease>={ORDER_QUANTITY}"
        )

        # Admin advances order to 'pagado'
        resp_estado = advance_order_status(order_id, "pagado", admin_token)
        assert resp_estado.status_code == 200, f"Admin failed to set estado 'pagado': {resp_estado.status_code} {resp_estado.text}"

        # Buyer attempts to cancel -> should get 400
        resp_buyer_cancel = cancel_order(order_id, buyer_token)
        assert resp_buyer_cancel.status_code == 400, (
            f"Buyer cancelling a paid order should return 400, got {resp_buyer_cancel.status_code}: {resp_buyer_cancel.text}"
        )

        # Admin cancels -> should succeed (200)
        resp_admin_cancel = cancel_order(order_id, admin_token)
        assert resp_admin_cancel.status_code == 200, f"Admin cancel failed: {resp_admin_cancel.status_code} {resp_admin_cancel.text}"

        # Small delay to allow backend to restore stock
        time.sleep(0.5)

        qty_after_cancel = get_inventory_qty(PRODUCT_ID, token=admin_token)

        # Ensure stock increased by at least the ordered quantity compared to after order
        restored = qty_after_cancel - qty_after_order
        assert restored >= ORDER_QUANTITY, (
            f"Inventory was not restored after admin cancel. after_order={qty_after_order}, after_cancel={qty_after_cancel}, restored={restored}"
        )

        print("TC023 passed: buyer cannot cancel after payment, admin can cancel and stock restored.")
    finally:
        # Cleanup: ensure order is cancelled by admin if still exists and not canceled
        if order_id:
            try:
                # attempt to cancel as admin; ignore result
                cancel_order(order_id, admin_token)
            except Exception:
                pass

if __name__ == "__main__":
    test_buyer_cannot_cancel_after_payment()
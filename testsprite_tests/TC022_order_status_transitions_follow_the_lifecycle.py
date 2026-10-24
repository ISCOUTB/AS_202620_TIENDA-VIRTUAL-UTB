import requests
import uuid
import sys
import time

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

def login(email: str, password: str):
    url = f"{BASE_URL}/identity/login"
    resp = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    if resp.status_code != 200:
        raise AssertionError(f"Login failed for {email}: {resp.status_code} {resp.text}")
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise AssertionError(f"No access_token in login response for {email}: {data}")
    return token

def extract_order_id(order_obj):
    # Try common keys
    for k in ("id", "order_id", "pedido_id", "orderId", "order_id"):
        if k in order_obj:
            return order_obj[k]
    # Maybe nested
    if isinstance(order_obj, dict):
        for v in order_obj.values():
            if isinstance(v, dict):
                for k in ("id","order_id","pedido_id"):
                    if k in v:
                        return v[k]
    raise AssertionError(f"Cannot extract order id from object: {order_obj}")

def create_order(token: str, items: list, hora_recogida: str = None):
    url = f"{BASE_URL}/orders"
    idempotency = str(uuid.uuid4())
    headers = {"Authorization": f"Bearer {token}", "Idempotency-Key": idempotency}
    body = {"items": items}
    if hora_recogida:
        body["hora_recogida"] = hora_recogida
    resp = requests.post(url, json=body, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (200,201):
        raise AssertionError(f"Create order failed: {resp.status_code} {resp.text}")
    data = resp.json()
    if not isinstance(data, list) or len(data) == 0:
        raise AssertionError(f"Create order returned unexpected payload (expected non-empty list): {data}")
    # If multiple orders returned, find the one containing our product_id 52 (or just pick first)
    # Prefer an order that contains an item with product_id 52
    for o in data:
        try:
            # Some representations include items under 'items'
            items_field = o.get("items") if isinstance(o, dict) else None
            if items_field and any((it.get("product_id") == 52 or it.get("productId") == 52) for it in items_field):
                return extract_order_id(o)
        except Exception:
            continue
    # Fallback: return first order id
    return extract_order_id(data[0])

def advance_order_state(token: str, order_id, estado: str):
    url = f"{BASE_URL}/orders/{order_id}/estado"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(url, json={"estado": estado}, headers=headers, timeout=TIMEOUT)
    return resp

def cancel_order(token: str, order_id):
    url = f"{BASE_URL}/orders/{order_id}/cancel"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(url, headers=headers, timeout=TIMEOUT)
    return resp

def test_order_status_transitions_follow_the_lifecycle():
    # Login buyer (ana) and admin for almuerzo-01
    buyer_token = login("ana@utb.edu.co", "Comprador-2026")
    admin_token = login("admin.almuerzo-01@utb.edu.co", "Tienda-2026")

    order1_id = None
    order2_id = None

    try:
        # Create first order for product 52 as ana
        order1_id = create_order(buyer_token, items=[{"product_id": 52, "cantidad": 1}])
        assert order1_id is not None, "order1_id was not returned"

        # Advance lifecycle as store admin: pagado -> en_preparacion -> listo -> entregado
        for estado in ("pagado", "en_preparacion", "listo", "entregado"):
            resp = advance_order_state(admin_token, order1_id, estado)
            # Each transition along the valid path should return 200
            if resp.status_code != 200:
                raise AssertionError(f"Advancing order {order1_id} to '{estado}' failed: {resp.status_code} {resp.text}")

        # After delivered, attempting to set 'pagado' again must return 400
        resp = advance_order_state(admin_token, order1_id, "pagado")
        assert resp.status_code == 400, f"Expected 400 when setting 'pagado' on delivered order, got {resp.status_code}: {resp.text}"

        # Create a fresh order and try to jump from pendiente_pago -> entregado (invalid)
        order2_id = create_order(buyer_token, items=[{"product_id": 52, "cantidad": 1}])
        assert order2_id is not None, "order2_id was not returned"

        # Without confirming payment, admin tries to set 'entregado' directly
        resp = advance_order_state(admin_token, order2_id, "entregado")
        assert resp.status_code == 400, f"Expected 400 when jumping from pendiente_pago to 'entregado', got {resp.status_code}: {resp.text}"

        print("TC022 passed")
    finally:
        # Cleanup: attempt to cancel order2 as buyer (allowed if still pendiente_pago)
        if order2_id:
            try:
                resp = cancel_order(buyer_token, order2_id)
                # Accept 200 if cancelled, 400 if not allowed, or 404/403 if not accessible; print for visibility
                if resp.status_code == 200:
                    print(f"Cleanup: order {order2_id} cancelled successfully by buyer.")
                else:
                    print(f"Cleanup: cancel order {order2_id} response: {resp.status_code} {resp.text}")
            except Exception as e:
                print(f"Cleanup: exception when cancelling order2 {order2_id}: {e}")

        # Attempt to cancel order1 as admin (may be disallowed after delivered)
        if order1_id:
            try:
                resp = cancel_order(admin_token, order1_id)
                if resp.status_code == 200:
                    print(f"Cleanup: order {order1_id} cancelled by admin.")
                else:
                    print(f"Cleanup: cancel order {order1_id} response: {resp.status_code} {resp.text}")
            except Exception as e:
                print(f"Cleanup: exception when cancelling order1 {order1_id}: {e}")

if __name__ == "__main__":
    try:
        test_order_status_transitions_follow_the_lifecycle()
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(2)
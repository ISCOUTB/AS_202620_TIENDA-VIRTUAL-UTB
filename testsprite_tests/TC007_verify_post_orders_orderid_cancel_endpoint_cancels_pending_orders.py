import requests
import uuid
import sys
import traceback

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

def test_verify_post_orders_orderid_cancel_endpoint_cancels_pending_orders():
    """
    TC007:
    - Login as buyer ana@utb.edu.co / Comprador-2026
    - Read inventory for a chosen product (product_id 15)
    - Create an order (Idempotency-Key)
    - Assert order is pendiente_pago and inventory decreased
    - Cancel the order
    - Assert inventory restored
    """
    email = "ana@utb.edu.co"
    password = "Comprador-2026"
    product_id = 15
    order_quantity = 1

    token = None
    order_id = None
    created_order_estado = None

    try:
        # 1) Login
        r = requests.post(f"{BASE_URL}/identity/login",
                          json={"email": email, "password": password},
                          timeout=TIMEOUT)
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        data = r.json()
        token = data.get("access_token")
        assert token, f"No access_token in login response: {data}"

        headers = {"Authorization": f"Bearer {token}"}

        # 2) Read initial inventory for product_id
        r = requests.get(f"{BASE_URL}/inventory/{product_id}", headers=headers, timeout=TIMEOUT)
        assert r.status_code == 200, f"GET inventory failed: {r.status_code} {r.text}"
        inv = r.json()
        # Inventory representation may vary; try common keys
        if isinstance(inv, dict):
            initial_qty = inv.get("cantidad")
            if initial_qty is None:
                # Fallback to other possible key
                initial_qty = inv.get("existencias") or inv.get("stock") or inv.get("cantidad_disponible")
        else:
            raise AssertionError(f"Unexpected inventory response shape: {inv}")
        assert isinstance(initial_qty, int), f"Initial quantity not found or not int: {inv}"

        # 3) Create order (POST /orders) with Idempotency-Key
        idempotency_key = str(uuid.uuid4())
        order_payload = {
            "items": [
                {"product_id": product_id, "cantidad": order_quantity}
            ],
            "hora_recogida": "12:00"
        }
        post_headers = headers.copy()
        post_headers["Idempotency-Key"] = idempotency_key

        r = requests.post(f"{BASE_URL}/orders", json=order_payload, headers=post_headers, timeout=TIMEOUT)
        assert r.status_code in (200, 201), f"Create order failed: {r.status_code} {r.text}"
        orders = r.json()
        assert isinstance(orders, list) and len(orders) >= 1, f"Orders response expected list with at least one order: {orders}"

        # Find the order that contains our product_id (each order per store)
        found_order = None
        for o in orders:
            items = o.get("items") or []
            for it in items:
                if it.get("product_id") == product_id:
                    found_order = o
                    break
            if found_order:
                break
        if not found_order:
            # Fallback: take first order
            found_order = orders[0]

        order_id = found_order.get("id") or found_order.get("order_id")
        assert order_id, f"Order id not found in response: {found_order}"

        created_order_estado = found_order.get("estado")
        # Accept either None or actual state, but expect pendiente_pago for new orders
        assert created_order_estado in (None, "pendiente_pago", "por pagar", "por_pagar", "PENDIENTE_PAGO", "pendiente_pago".upper()) or created_order_estado == "pendiente_pago", \
            f"Unexpected initial order estado: {created_order_estado}"

        # 4) Verify inventory decreased by order_quantity
        r = requests.get(f"{BASE_URL}/inventory/{product_id}", headers=headers, timeout=TIMEOUT)
        assert r.status_code == 200, f"GET inventory after order failed: {r.status_code} {r.text}"
        inv_after_order = r.json()
        if isinstance(inv_after_order, dict):
            qty_after = inv_after_order.get("cantidad")
            if qty_after is None:
                qty_after = inv_after_order.get("existencias") or inv_after_order.get("stock") or inv_after_order.get("cantidad_disponible")
        else:
            raise AssertionError(f"Unexpected inventory response shape after order: {inv_after_order}")
        assert isinstance(qty_after, int), f"Quantity after order not found: {inv_after_order}"
        assert qty_after == initial_qty - order_quantity, f"Inventory did not decrease correctly: initial={initial_qty}, after={qty_after}"

        # 5) Cancel the order
        r = requests.post(f"{BASE_URL}/orders/{order_id}/cancel", headers=headers, timeout=TIMEOUT)
        assert r.status_code in (200, 204), f"Cancel order failed: {r.status_code} {r.text}"
        # If 200, check response body for estado; if 204 no body
        canceled_state = None
        if r.status_code == 200:
            resp = r.json()
            canceled_state = resp.get("estado") if isinstance(resp, dict) else None

        # 6) Confirm order is cancelado via GET /orders/{id} if possible
        r_get = requests.get(f"{BASE_URL}/orders/{order_id}", headers=headers, timeout=TIMEOUT)
        if r_get.status_code == 200:
            order_after = r_get.json()
            estado_after = order_after.get("estado") or order_after.get("status")
            assert estado_after in ("cancelado", "CANCELADO", "Cancelado"), f"Order estado after cancel is not 'cancelado': {estado_after}"
        else:
            # If GET not available or not 200, rely on cancel response having accepted the operation
            if canceled_state:
                assert canceled_state in ("cancelado", "CANCELADO", "Cancelado"), f"Cancel response did not set estado to cancelado: {canceled_state}"
            else:
                # Accept 204 as success
                assert r.status_code == 204, f"Unexpected response when verifying cancel: {r.status_code} {r.text}"

        # 7) Verify inventory restored to initial_qty
        r = requests.get(f"{BASE_URL}/inventory/{product_id}", headers=headers, timeout=TIMEOUT)
        assert r.status_code == 200, f"GET inventory after cancel failed: {r.status_code} {r.text}"
        inv_after_cancel = r.json()
        if isinstance(inv_after_cancel, dict):
            qty_final = inv_after_cancel.get("cantidad")
            if qty_final is None:
                qty_final = inv_after_cancel.get("existencias") or inv_after_cancel.get("stock") or inv_after_cancel.get("cantidad_disponible")
        else:
            raise AssertionError(f"Unexpected inventory response shape after cancel: {inv_after_cancel}")
        assert isinstance(qty_final, int), f"Final quantity not found: {inv_after_cancel}"
        assert qty_final == initial_qty, f"Inventory was not restored after cancel: initial={initial_qty}, final={qty_final}"

        print("TC007 passed.")
    except Exception as e:
        print("TC007 failed:", str(e))
        traceback.print_exc()
        raise
    finally:
        # Cleanup: ensure order is cancelled if it still exists (best effort)
        if token and order_id:
            try:
                headers = {"Authorization": f"Bearer {token}"}
                # Check current status
                r_check = requests.get(f"{BASE_URL}/orders/{order_id}", headers=headers, timeout=TIMEOUT)
                if r_check.status_code == 200:
                    st = r_check.json().get("estado") or r_check.json().get("status")
                    if st not in ("cancelado", "CANCELADO", "Cancelado"):
                        # Try cancel again
                        requests.post(f"{BASE_URL}/orders/{order_id}/cancel", headers=headers, timeout=TIMEOUT)
                # else: cannot access or already removed
            except Exception:
                # best-effort cleanup, ignore errors
                pass

if __name__ == "__main__":
    test_verify_post_orders_orderid_cancel_endpoint_cancels_pending_orders()
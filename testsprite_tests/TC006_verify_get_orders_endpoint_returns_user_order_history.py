import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_get_orders_returns_user_order_history():
    session = requests.Session()
    created_order_ids = []

    try:
        # 1) Login as buyer ana
        login_payload = {"email": "ana@utb.edu.co", "password": "Comprador-2026"}
        r = session.post(f"{BASE_URL}/identity/login", json=login_payload, timeout=TIMEOUT)
        assert r.status_code == 200, f"Login failed: {r.status_code} - {r.text}"
        token = r.json().get("access_token")
        assert token, f"No access_token in login response: {r.text}"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # 2) Create a new order for this user (use product_id 29 as demo product)
        idempotency_key = str(uuid.uuid4())
        order_payload = {
            "items": [{"product_id": 29, "cantidad": 1}],
            "hora_recogida": "12:30"
        }
        headers_post = headers.copy()
        headers_post["Idempotency-Key"] = idempotency_key

        r = session.post(f"{BASE_URL}/orders", json=order_payload, headers=headers_post, timeout=TIMEOUT)
        assert r.status_code in (200, 201), f"Order creation failed: {r.status_code} - {r.text}"
        created_orders = r.json()
        assert isinstance(created_orders, list), f"Expected list from POST /orders, got: {type(created_orders)}"

        # collect created order ids for cleanup
        for o in created_orders:
            oid = o.get("id") or o.get("order_id") or o.get("pedido_id")
            assert oid, f"Created order missing id field: {o}"
            created_order_ids.append(oid)

        assert created_order_ids, "No order ids returned by POST /orders"

        # 3) GET /orders to retrieve user's order history
        r = session.get(f"{BASE_URL}/orders", headers=headers, timeout=TIMEOUT)
        assert r.status_code == 200, f"GET /orders failed: {r.status_code} - {r.text}"
        orders = r.json()
        assert isinstance(orders, list), f"Expected list from GET /orders, got: {type(orders)}"

        # 4) Verify that at least one of the created orders appears in the history with correct details
        matched = None
        for order in orders:
            oid = order.get("id") or order.get("order_id") or order.get("pedido_id")
            if oid in created_order_ids:
                matched = order
                break

        assert matched is not None, f"Created order(s) {created_order_ids} not found in GET /orders response"

        # Validate status (estado), items, pickup time, and total
        estado = matched.get("estado") or matched.get("status")
        assert estado is not None, f"Order missing status/estado: {matched}"
        allowed_states = {"pendiente_pago", "pagado", "en_preparacion", "listo", "entregado", "cancelado"}
        assert estado in allowed_states, f"Unexpected order estado: {estado}"

        items = matched.get("items") or matched.get("detalles") or []
        assert isinstance(items, list), f"Order items is not a list: {items}"
        # find our product in items
        found_item = None
        for it in items:
            pid = it.get("product_id") or it.get("producto_id") or it.get("id_producto")
            cantidad = it.get("cantidad") or it.get("qty") or it.get("cantidad_producto")
            if pid == 29 and int(cantidad) == 1:
                found_item = it
                break
        assert found_item is not None, f"Expected product_id 29 with cantidad 1 not found in order items: {items}"

        # hora_recogida
        hora = matched.get("hora_recogida") or matched.get("pickup_time") or matched.get("hora")
        assert hora is not None, f"Order missing hora_recogida/pickup_time: {matched}"
        # Allow small formatting variations but expect "12:30" present
        assert "12:30" in str(hora), f"Expected hora_recogida to include '12:30', got: {hora}"

        # total: look for common keys and validate it's a positive integer
        total_keys = ["total", "total_centavos", "total_cents", "precio_centavos"]
        total_value = None
        for k in total_keys:
            if k in matched:
                total_value = matched[k]
                break
        # Sometimes total may be nested under resumen or similar
        if total_value is None:
            # try common nested places
            resumen = matched.get("resumen") or matched.get("summary") or {}
            if isinstance(resumen, dict):
                for k in total_keys:
                    if k in resumen:
                        total_value = resumen[k]
                        break

        assert total_value is not None, f"Order total not found in order: checked keys {total_keys} and resumen"
        # ensure it's an integer and > 0
        try:
            total_int = int(total_value)
        except Exception:
            raise AssertionError(f"Order total is not an integer: {total_value}")
        assert total_int > 0, f"Order total should be > 0, got: {total_int}"

        print("TEST PASSED: GET /orders returned the created order with expected status, items, pickup time, and total.")

    except AssertionError:
        # re-raise assertion errors for visibility
        raise
    except Exception as e:
        raise AssertionError(f"Unexpected error during test execution: {e}")
    finally:
        # cleanup: cancel created orders to restore state
        for oid in created_order_ids:
            try:
                cancel_resp = session.post(f"{BASE_URL}/orders/{oid}/cancel", headers=headers, timeout=TIMEOUT)
                # Accept 200 or 204 as success; if already cancelled, allow 400/409 but log
                if cancel_resp.status_code in (200, 204):
                    continue
                else:
                    # Not raising to ensure best-effort cleanup, but surface unexpected responses
                    print(f"Cleanup: cancel order {oid} returned {cancel_resp.status_code}: {cancel_resp.text}", file=sys.stderr)
            except Exception as e:
                print(f"Cleanup: exception cancelling order {oid}: {e}", file=sys.stderr)

if __name__ == "__main__":
    test_get_orders_returns_user_order_history()
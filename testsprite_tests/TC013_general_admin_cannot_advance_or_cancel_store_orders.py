import requests
import uuid
import sys
from requests.exceptions import RequestException

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

def login(email: str, password: str):
    url = f"{BASE_URL}/identity/login"
    payload = {"email": email, "password": password}
    try:
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
    except RequestException as e:
        raise RuntimeError(f"Login request failed for {email}: {e}")
    if resp.status_code != 200:
        raise AssertionError(f"Login for {email} failed: {resp.status_code} - {resp.text}")
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise AssertionError(f"No access_token returned for {email}: {data}")
    return token

def create_order(token: str, product_id: int, cantidad: int = 1):
    url = f"{BASE_URL}/orders"
    idemp = str(uuid.uuid4())
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": idemp,
        "Content-Type": "application/json"
    }
    payload = {"items": [{"product_id": product_id, "cantidad": cantidad}]}
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    except RequestException as e:
        raise RuntimeError(f"Create order request failed: {e}")
    if resp.status_code not in (200, 201):
        raise AssertionError(f"Failed to create order: {resp.status_code} - {resp.text}")
    data = resp.json()
    # Expecting a list of orders (one per store). Extract first order id.
    if isinstance(data, list) and len(data) > 0:
        order = data[0]
    elif isinstance(data, dict):
        # sometimes API may return a single order dict
        order = data
    else:
        raise AssertionError(f"Unexpected create order response shape: {data}")
    # Accept common id keys
    order_id = order.get("id") or order.get("order_id") or order.get("pedido_id")
    if not order_id:
        raise AssertionError(f"Could not find order id in response: {order}")
    return order_id

def admin_try_advance_and_cancel(admin_token: str, order_id):
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    estado_url = f"{BASE_URL}/orders/{order_id}/estado"
    cancel_url = f"{BASE_URL}/orders/{order_id}/cancel"
    # Attempt to advance state to 'pagado' -> expect 403
    try:
        resp_estado = requests.post(estado_url, json={"estado": "pagado"}, headers=headers, timeout=TIMEOUT)
    except RequestException as e:
        raise RuntimeError(f"Admin estado request failed: {e}")
    assert resp_estado.status_code == 403, f"Expected 403 when general admin advances order, got {resp_estado.status_code}: {resp_estado.text}"
    # assert detail message starts correctly
    try:
        detail = resp_estado.json().get("detail", "")
    except ValueError:
        detail = ""
    assert detail.startswith("El administrador general solo supervisa"), f"Expected detail starting with supervisor message, got: {detail}"

    # Attempt to cancel -> expect 403
    try:
        resp_cancel = requests.post(cancel_url, headers=headers, timeout=TIMEOUT)
    except RequestException as e:
        raise RuntimeError(f"Admin cancel request failed: {e}")
    assert resp_cancel.status_code == 403, f"Expected 403 when general admin cancels order, got {resp_cancel.status_code}: {resp_cancel.text}"
    try:
        detail2 = resp_cancel.json().get("detail", "")
    except ValueError:
        detail2 = ""
    assert detail2.startswith("El administrador general solo supervisa"), f"Expected detail starting with supervisor message on cancel, got: {detail2}"

    # GET order as general admin -> expect 200 and contain the order id
    get_url = f"{BASE_URL}/orders/{order_id}"
    try:
        resp_get = requests.get(get_url, headers=headers, timeout=TIMEOUT)
    except RequestException as e:
        raise RuntimeError(f"Admin GET order request failed: {e}")
    assert resp_get.status_code == 200, f"Expected 200 when general admin GETs order, got {resp_get.status_code}: {resp_get.text}"
    order_data = resp_get.json()
    # verify returned order contains the requested id
    returned_id = order_data.get("id") or order_data.get("order_id") or order_data.get("pedido_id")
    assert str(returned_id) == str(order_id), f"GET /orders/{order_id} returned different id: {returned_id}"

def cancel_order_as_buyer(buyer_token: str, order_id):
    url = f"{BASE_URL}/orders/{order_id}/cancel"
    headers = {"Authorization": f"Bearer {buyer_token}", "Content-Type": "application/json"}
    try:
        resp = requests.post(url, headers=headers, timeout=TIMEOUT)
    except RequestException as e:
        raise RuntimeError(f"Buyer cancel request failed: {e}")
    # Cancellation of a pending order should be allowed (200). If already cancelled or not allowed, accept 400/404 but surface in assertion.
    if resp.status_code not in (200, 204):
        raise AssertionError(f"Failed to cancel order {order_id} as buyer: {resp.status_code} - {resp.text}")

def test_TC013_general_admin_cannot_advance_or_cancel_store_orders():
    buyer_email = "ana@utb.edu.co"
    buyer_password = "Comprador-2026"
    admin_email = "admin@utb.edu.co"
    admin_password = "Admin-Demo-2026"
    created_order_id = None

    try:
        # Login as buyer and create an order
        buyer_token = login(buyer_email, buyer_password)
        created_order_id = create_order(buyer_token, product_id=29, cantidad=1)

        # Login as general admin and attempt forbidden actions
        admin_token = login(admin_email, admin_password)
        admin_try_advance_and_cancel(admin_token, created_order_id)

        # If we reach here, test succeeded for admin restrictions
        print(f"TC013 passed: general admin could not advance or cancel order {created_order_id} and could read it.")
    finally:
        # Cleanup: cancel the created order as buyer if it exists
        if created_order_id:
            try:
                # Re-login as buyer to ensure valid token (in case previous expired)
                buyer_token = login(buyer_email, buyer_password)
                cancel_order_as_buyer(buyer_token, created_order_id)
                print(f"Cleaned up order {created_order_id} by cancelling as buyer.")
            except Exception as e:
                print(f"Cleanup failed for order {created_order_id}: {e}", file=sys.stderr)

if __name__ == "__main__":
    test_TC013_general_admin_cannot_advance_or_cancel_store_orders()
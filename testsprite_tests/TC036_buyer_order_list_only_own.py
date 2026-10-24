import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30


def _login_and_get_token(email: str, password: str):
    url = f"{BASE_URL}/identity/login"
    resp = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    try:
        resp.raise_for_status()
    except requests.HTTPError:
        raise AssertionError(f"Login failed for {email}: {resp.status_code} - {resp.text}")
    data = resp.json()
    if not isinstance(data, dict) or "access_token" not in data:
        raise AssertionError(f"Login response for {email} missing access_token: {data}")
    return data["access_token"]


def _extract_order_id(order_obj):
    # Try common keys
    for key in ("id", "order_id", "pedido_id", "uuid"):
        if isinstance(order_obj, dict) and key in order_obj:
            return order_obj[key]
    # If the object itself is a string or number, assume that's the id
    if isinstance(order_obj, (str, int)):
        return order_obj
    raise AssertionError(f"Unable to extract order id from object: {order_obj}")


def test_buyer_order_list_only_own():
    # Create a unique buyer
    unique_email = f"test_buyer_{uuid.uuid4().hex[:8]}@utb.edu.co"
    password = "Password-1234"
    nombre = "Test Buyer"

    created = False
    new_buyer_token = None

    try:
        # Register new buyer
        reg_url = f"{BASE_URL}/identity/register"
        reg_payload = {"nombre": nombre, "email": unique_email, "password": password}
        r = requests.post(reg_url, json=reg_payload, timeout=TIMEOUT)
        if r.status_code not in (200, 201):
            raise AssertionError(f"Registration failed: {r.status_code} - {r.text}")
        created = True

        # Login as new buyer to get token
        new_buyer_token = _login_and_get_token(unique_email, password)
        new_buyer_headers = {"Authorization": f"Bearer {new_buyer_token}"}

        # Login as ana to get one of ana's order IDs
        ana_email = "ana@utb.edu.co"
        ana_password = "Comprador-2026"
        ana_token = _login_and_get_token(ana_email, ana_password)
        ana_headers = {"Authorization": f"Bearer {ana_token}"}

        # Get ana's orders
        ana_orders_url = f"{BASE_URL}/orders"
        r_ana_orders = requests.get(ana_orders_url, headers=ana_headers, timeout=TIMEOUT)
        try:
            r_ana_orders.raise_for_status()
        except requests.HTTPError:
            raise AssertionError(f"Failed to list ana's orders: {r_ana_orders.status_code} - {r_ana_orders.text}")
        ana_orders = r_ana_orders.json()
        if not isinstance(ana_orders, list) or len(ana_orders) == 0:
            raise AssertionError("Expected ana to have at least one order for this test, but none were found.")
        ana_order_id = _extract_order_id(ana_orders[0])

        # As new buyer, GET /orders -> should be [] (empty list)
        my_orders_url = f"{BASE_URL}/orders"
        r_my_orders = requests.get(my_orders_url, headers=new_buyer_headers, timeout=TIMEOUT)
        try:
            r_my_orders.raise_for_status()
        except requests.HTTPError:
            raise AssertionError(f"Failed to list new buyer's orders: {r_my_orders.status_code} - {r_my_orders.text}")
        my_orders = r_my_orders.json()
        assert isinstance(my_orders, list), f"/orders did not return a list for new buyer: {my_orders}"
        assert len(my_orders) == 0, f"Expected new buyer to have no orders, got: {my_orders}"

        # As new buyer, attempt to GET ana's order by id -> should be 404
        order_detail_url = f"{BASE_URL}/orders/{ana_order_id}"
        r_order_detail = requests.get(order_detail_url, headers=new_buyer_headers, timeout=TIMEOUT)
        assert r_order_detail.status_code == 404, (
            f"Expected 404 when new buyer requests another user's order (id={ana_order_id}), "
            f"got {r_order_detail.status_code} - {r_order_detail.text}"
        )

        print("TC036 passed")

    finally:
        # Best-effort cleanup: try to delete the created user if possible.
        if created and new_buyer_token:
            # Attempt DELETE /identity/me (if supported) or ignore failures
            try:
                delete_url = f"{BASE_URL}/identity/me"
                headers = {"Authorization": f"Bearer {new_buyer_token}"}
                resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                # Accept 200/204 as success; ignore other statuses
            except Exception:
                # ignore any errors during cleanup
                pass


if __name__ == "__main__":
    try:
        test_buyer_order_list_only_own()
    except AssertionError as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    except Exception as e:
        print("UNEXPECTED ERROR:", repr(e))
        sys.exit(2)
    sys.exit(0)
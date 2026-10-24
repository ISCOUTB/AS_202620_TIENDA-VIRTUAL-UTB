import requests
import sys
from requests.exceptions import RequestException
import time

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/identity/login"
INVENTORY_URL = f"{BASE_URL}/inventory"
USERNAME = "admin.punto-fit@utb.edu.co"
PASSWORD = "Tienda-2026"
TIMEOUT = 30


def test_store_admin_manages_only_own_store_stock():
    try:
        # Login
        resp = requests.post(
            LOGIN_URL,
            json={"email": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
        token_data = resp.json()
        assert "access_token" in token_data, f"No access_token in login response: {token_data}"
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        adjusted = False

        # Helper to get cantidad for a product
        def get_cantidad(product_id):
            r = requests.get(f"{INVENTORY_URL}/{product_id}", headers=headers, timeout=TIMEOUT)
            assert r.status_code == 200, f"GET /inventory/{product_id} returned {r.status_code}: {r.text}"
            data = r.json()
            assert isinstance(data, dict), f"Unexpected inventory response shape: {data}"
            assert "cantidad" in data, f"'cantidad' missing in inventory data: {data}"
            return int(data["cantidad"])

        # 1) For product 25 (punto-fit) adjust +1 should succeed and increase cantidad by 1
        product_own = 25
        before_qty = get_cantidad(product_own)

        adj_resp = requests.post(
            f"{INVENTORY_URL}/{product_own}/adjust",
            headers=headers,
            json={"delta": 1, "motivo": "conteo"},
            timeout=TIMEOUT,
        )
        assert adj_resp.status_code == 200, f"Expected 200 on adjust own product, got {adj_resp.status_code}: {adj_resp.text}"
        # verify cantidad increased by 1
        after_qty = get_cantidad(product_own)
        assert after_qty == before_qty + 1, f"Quantity did not increase by 1 for product {product_own}: before={before_qty}, after={after_qty}"
        adjusted = True

        # 2) Attempt to adjust product 14 (Antojos) -> should be forbidden 403
        product_other = 14
        adj_other_resp = requests.post(
            f"{INVENTORY_URL}/{product_other}/adjust",
            headers=headers,
            json={"delta": 1, "motivo": "conteo"},
            timeout=TIMEOUT,
        )
        assert adj_other_resp.status_code == 403, (
            f"Expected 403 when adjusting other store's product {product_other}, got {adj_other_resp.status_code}: {adj_other_resp.text}"
        )

        # 3) Attempt to PUT set cantidad on product 50 (Almuerzo 01) -> 403
        product_other_put = 50
        put_resp = requests.put(
            f"{INVENTORY_URL}/{product_other_put}",
            headers=headers,
            json={"cantidad": 3},
            timeout=TIMEOUT,
        )
        assert put_resp.status_code == 403, (
            f"Expected 403 when putting other store's product {product_other_put}, got {put_resp.status_code}: {put_resp.text}"
        )

        print("TC015 passed")

    except RequestException as e:
        print(f"HTTP request failed: {e}")
        raise
    finally:
        # revert the adjustment if we increased stock
        try:
            if 'token' in locals() and adjusted:
                # Use a fresh request to decrement the same amount we increased
                revert_resp = requests.post(
                    f"{INVENTORY_URL}/{product_own}/adjust",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"delta": -1, "motivo": "conteo"},
                    timeout=TIMEOUT,
                )
                # best-effort revert; assert only in logs if it fails
                if revert_resp.status_code != 200:
                    print(f"Warning: failed to revert adjustment for product {product_own}: {revert_resp.status_code} {revert_resp.text}")
                else:
                    # small delay to allow backend to update if needed
                    time.sleep(0.2)
        except Exception as e:
            print(f"Warning: exception during revert: {e}")


if __name__ == "__main__":
    try:
        test_store_admin_manages_only_own_store_stock()
    except AssertionError as e:
        print("AssertionError:", e)
        sys.exit(1)
    except Exception as e:
        print("Error:", e)
        sys.exit(2)
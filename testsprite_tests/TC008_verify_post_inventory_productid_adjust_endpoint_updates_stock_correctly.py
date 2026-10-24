import requests
import uuid
import sys
import time

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

def login(email, password):
    url = f"{BASE_URL}/identity/login"
    resp = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise RuntimeError("Login response did not contain access_token")
    return token

def get_inventory_entry(product_id, headers):
    # Try GET /inventory/{id}
    url = f"{BASE_URL}/inventory/{product_id}"
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    if resp.status_code == 200:
        return resp.json()
    # Fallback: GET /inventory and search
    url_all = f"{BASE_URL}/inventory"
    resp_all = requests.get(url_all, headers=headers, timeout=TIMEOUT)
    resp_all.raise_for_status()
    items = resp_all.json()
    for it in items:
        # possible keys: 'product_id' or 'id'
        if str(it.get("product_id") or it.get("id")) == str(product_id) or int(it.get("id", -1)) == int(product_id):
            return it
    # Not found
    return None

def test_verify_post_inventory_productid_adjust_endpoint_updates_stock_correctly():
    # Use a store admin for 'antojos' (store id 1)
    admin_email = "admin.antojos@utb.edu.co"
    admin_password = "Tienda-2026"
    token = login(admin_email, admin_password)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    created_product_id = None
    try:
        # 1) Create a new unique product in store 'antojos'
        unique_name = f"test-product-{uuid.uuid4()}"
        create_body = {
            "tienda": "antojos",
            "nombre": unique_name,
            "descripcion": "Producto creado por test",
            "precio_centavos": 1000
        }
        resp = requests.post(f"{BASE_URL}/catalog/products", json=create_body, headers=headers, timeout=TIMEOUT)
        assert resp.status_code in (200, 201), f"Product creation failed: {resp.status_code} {resp.text}"
        created = resp.json()
        # product id may be in 'id' or 'product_id'
        created_product_id = created.get("id") or created.get("product_id") or created.get("productId")
        assert created_product_id is not None, f"Created product id not found in response: {created}"

        # 2) Ensure known starting stock via PUT /inventory/{id}
        initial_stock = 5
        put_url = f"{BASE_URL}/inventory/{created_product_id}"
        put_body = {"cantidad": initial_stock}
        resp_put = requests.put(put_url, json=put_body, headers=headers, timeout=TIMEOUT)
        assert resp_put.status_code in (200, 204), f"PUT inventory failed: {resp_put.status_code} {resp_put.text}"
        # After PUT, GET the inventory entry to confirm cantidad
        inv = get_inventory_entry(created_product_id, headers)
        assert inv is not None, f"Inventory entry not found after PUT for product {created_product_id}"
        cantidad = int(inv.get("cantidad", inv.get("cantidad", initial_stock)))
        assert cantidad == initial_stock, f"Expected initial cantidad {initial_stock}, got {cantidad}"

        # 3) Adjust +2
        adj_url = f"{BASE_URL}/inventory/{created_product_id}/adjust"
        resp_adj_inc = requests.post(adj_url, json={"delta": 2, "motivo": "conteo"}, headers=headers, timeout=TIMEOUT)
        assert resp_adj_inc.status_code == 200, f"Adjust +2 failed: {resp_adj_inc.status_code} {resp_adj_inc.text}"
        inv_after_inc = get_inventory_entry(created_product_id, headers)
        assert inv_after_inc is not None, "Inventory entry missing after +2 adjust"
        cantidad_after_inc = int(inv_after_inc.get("cantidad"))
        assert cantidad_after_inc == initial_stock + 2, f"Expected {initial_stock+2} after +2, got {cantidad_after_inc}"

        # 4) Adjust -3
        resp_adj_dec = requests.post(adj_url, json={"delta": -3, "motivo": "merma"}, headers=headers, timeout=TIMEOUT)
        assert resp_adj_dec.status_code == 200, f"Adjust -3 failed: {resp_adj_dec.status_code} {resp_adj_dec.text}"
        inv_after_dec = get_inventory_entry(created_product_id, headers)
        assert inv_after_dec is not None, "Inventory entry missing after -3 adjust"
        cantidad_after_dec = int(inv_after_dec.get("cantidad"))
        expected_after_dec = cantidad_after_inc - 3
        assert cantidad_after_dec == expected_after_dec, f"Expected {expected_after_dec} after -3, got {cantidad_after_dec}"

        # 5) Attempt to decrement below zero - should be rejected and quantity remains unchanged
        # compute an over-decrement value
        over_decrement = -(cantidad_after_dec + 10)
        resp_over = requests.post(adj_url, json={"delta": over_decrement, "motivo": "merma"}, headers=headers, timeout=TIMEOUT)
        assert resp_over.status_code in (400, 422), f"Over-decrement should be rejected with 400/422, got {resp_over.status_code}"
        # Verify cantidad unchanged
        inv_after_over = get_inventory_entry(created_product_id, headers)
        assert inv_after_over is not None, "Inventory entry missing after over-decrement attempt"
        cantidad_after_over = int(inv_after_over.get("cantidad"))
        assert cantidad_after_over == cantidad_after_dec, f"Cantidad changed after rejected over-decrement: was {cantidad_after_dec}, now {cantidad_after_over}"

        print("TC008 passed")
    finally:
        # Cleanup: attempt to delete the created product if exists
        if created_product_id:
            try:
                del_url = f"{BASE_URL}/catalog/products/{created_product_id}"
                resp_del = requests.delete(del_url, headers=headers, timeout=TIMEOUT)
                # Accept 200/204/202/404
                if resp_del.status_code not in (200, 202, 204, 404):
                    # as fallback, try to set product off sale if delete not allowed
                    try:
                        patch_url = f"{BASE_URL}/catalog/products/{created_product_id}"
                        requests.patch(patch_url, json={"a_la_venta": False}, headers=headers, timeout=TIMEOUT)
                    except Exception:
                        pass
            except Exception:
                pass

if __name__ == "__main__":
    try:
        test_verify_post_inventory_productid_adjust_endpoint_updates_stock_correctly()
    except AssertionError as e:
        print(f"AssertionError: {e}", file=sys.stderr)
        sys.exit(1)
    except requests.RequestException as e:
        print(f"RequestException: {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(3)
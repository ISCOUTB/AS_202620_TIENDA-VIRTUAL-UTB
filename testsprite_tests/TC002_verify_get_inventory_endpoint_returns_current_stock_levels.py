import requests
import uuid
import sys
import time

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

ADMIN_EMAIL = "admin.antojos@utb.edu.co"
ADMIN_PASSWORD = "Tienda-2026"


def login(email, password):
    url = f"{BASE_URL}/identity/login"
    resp = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token")
    assert token, "Login did not return access_token"
    return token


def create_product(token, tienda_slug, nombre, descripcion="created-by-test", precio_centavos=1000):
    url = f"{BASE_URL}/catalog/products"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "tienda": tienda_slug,
        "nombre": nombre,
        "descripcion": descripcion,
        "precio_centavos": precio_centavos,
        # include common fields if accepted by the API
        "presentacion": "Unidad"
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    if resp.status_code not in (200, 201):
        raise AssertionError(f"Create product failed: {resp.status_code} {resp.text}")
    return resp.json()


def set_inventory_quantity(token, product_id, cantidad):
    url = f"{BASE_URL}/inventory/{product_id}"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.put(url, json={"cantidad": cantidad}, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def adjust_inventory(token, product_id, delta, motivo="conteo"):
    url = f"{BASE_URL}/inventory/{product_id}/adjust"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(url, json={"delta": delta, "motivo": motivo}, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def get_inventory():
    url = f"{BASE_URL}/inventory"
    resp = requests.get(url, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def normalize_inventory_list(inventory_resp):
    # If response is already a list, return it. Otherwise try common envelopes.
    if isinstance(inventory_resp, list):
        return inventory_resp
    if isinstance(inventory_resp, dict):
        for key in ("items", "data", "results", "inventory", "inventario"):
            val = inventory_resp.get(key)
            if isinstance(val, list):
                return val
        # sometimes single object
        return [inventory_resp]
    # unknown type
    return []


def find_inventory_item(inventory_list, product_id=None, product_name=None):
    for item in inventory_list:
        # try various possible keys
        if product_id is not None:
            if str(item.get("product_id") or item.get("producto_id") or item.get("id") or item.get("inventory_id") or item.get("producto") and (isinstance(item.get("producto"), (str, int)) and str(item.get("producto")) == str(product_id))) == str(product_id):
                return item
            # some APIs embed product as nested object
            prod = item.get("producto") or item.get("product") or item.get("producto_info") or item.get("product_info")
            if isinstance(prod, dict) and str(prod.get("id") or prod.get("product_id") or prod.get("producto_id")) == str(product_id):
                return item
        if product_name is not None:
            # try name fields on the item
            name = item.get("nombre") or item.get("name") or item.get("titulo") or item.get("title")
            if name and name == product_name:
                return item
            prod = item.get("producto") or item.get("product")
            if isinstance(prod, dict):
                pname = prod.get("nombre") or prod.get("name") or prod.get("titulo") or prod.get("title")
                if pname and pname == product_name:
                    return item
            # sometimes product name lives under nested inventory object
            inv = item.get("inventario") or item.get("inventory")
            if isinstance(inv, dict):
                pname = inv.get("nombre") or inv.get("name")
                if pname and pname == product_name:
                    return item
    return None


def extract_cantidad_from_item(item):
    # Try top-level keys
    possible_keys = [
        "cantidad", "stock", "cantidad_actual", "cantidad_disponible", "disponible", "available",
        "qty", "quantity", "stock_actual", "cantidad_total", "existencias", "unidades"
    ]
    if not isinstance(item, dict):
        return None
    for k in possible_keys:
        if k in item and item.get(k) is not None:
            return item.get(k)
    # Try nested common containers
    for container_key in ("producto", "product", "inventario", "inventory", "item", "data"):
        nested = item.get(container_key)
        if isinstance(nested, dict):
            for k in possible_keys:
                if k in nested and nested.get(k) is not None:
                    return nested.get(k)
            # deeper: sometimes inventory is a list under the nested object
            if isinstance(nested.get("inventario") or nested.get("inventory"), dict):
                deeper = nested.get("inventario") or nested.get("inventory")
                for k in possible_keys:
                    if k in deeper and deeper.get(k) is not None:
                        return deeper.get(k)
    # Sometimes inventory entries are lists under item
    for list_key in ("inventarios", "inventario", "inventory", "stocks", "stock_items"):
        lst = item.get(list_key)
        if isinstance(lst, list) and len(lst) > 0:
            first = lst[0]
            if isinstance(first, dict):
                for k in possible_keys:
                    if k in first and first.get(k) is not None:
                        return first.get(k)
    return None


def delete_product(token, product_id):
    headers = {"Authorization": f"Bearer {token}"}
    # Try DELETE if available
    try:
        resp = requests.delete(f"{BASE_URL}/catalog/products/{product_id}", headers=headers, timeout=TIMEOUT)
        # treat 200/204/202 as success; if 405/404 may not be supported
        if resp.status_code in (200, 202, 204):
            return True
    except requests.RequestException:
        pass
    # fallback to PATCH to disable product (best-effort cleanup)
    try:
        resp = requests.patch(f"{BASE_URL}/catalog/products/{product_id}", json={"a_la_venta": False}, headers=headers, timeout=TIMEOUT)
        if resp.status_code in (200, 204):
            return True
    except requests.RequestException:
        pass
    return False


def test_verify_get_inventory_endpoint_returns_current_stock_levels():
    token = None
    product = None
    product_id = None
    unique_name = f"test-inventory-product-{uuid.uuid4()}"
    try:
        # Login as store admin (antojos)
        token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

        # Create a new product in the antojos store so we can control its inventory
        created = create_product(token, "antojos", unique_name, descripcion="inventory-test", precio_centavos=1500)
        # The API may return the created product object or an envelope
        # Try to extract the product id
        if isinstance(created, dict):
            product_id = created.get("id") or created.get("product_id") or created.get("producto_id")
            product = created
        elif isinstance(created, list) and len(created) > 0:
            # unexpected list, pick first
            product = created[0]
            product_id = product.get("id") or product.get("product_id") or product.get("producto_id")

        assert product_id is not None, f"Could not determine created product id from response: {created}"

        # Set inventory to 5
        set_resp = set_inventory_quantity(token, product_id, 5)
        # Some APIs return the inventory object; verify cantidad at least in response if present
        if isinstance(set_resp, dict):
            cantidad = (set_resp.get("cantidad") or set_resp.get("cantidad_actual") or set_resp.get("stock") or
                        set_resp.get("cantidad_disponible") or set_resp.get("available"))
            if cantidad is not None:
                assert int(cantidad) == 5, f"Expected inventory cantidad 5, got {cantidad}"

        # GET /inventory and verify the product shows cantidad 5
        inventory = get_inventory()
        inventory_list = normalize_inventory_list(inventory)
        assert isinstance(inventory_list, list), "GET /inventory did not return a list or envelope with list"
        item = find_inventory_item(inventory_list, product_id=product_id, product_name=unique_name)
        assert item is not None, "Created product not found in GET /inventory"
        # Extract cantidad from item using robust extractor
        found_cantidad = extract_cantidad_from_item(item)
        assert found_cantidad is not None, f"Inventory item missing cantidad or equivalent; item: {item}"
        assert int(found_cantidad) == 5, f"Inventory cantidad mismatch: expected 5, got {found_cantidad}"

        # Now set low stock -> 1 and verify
        set_inventory_quantity(token, product_id, 1)
        inventory = get_inventory()
        inventory_list = normalize_inventory_list(inventory)
        item = find_inventory_item(inventory_list, product_id=product_id, product_name=unique_name)
        assert item is not None, "Product disappeared from inventory after setting low stock"
        found_cantidad = extract_cantidad_from_item(item)
        assert found_cantidad is not None, f"Inventory item missing cantidad after low-stock set; item: {item}"
        assert int(found_cantidad) == 1, f"Expected low stock cantidad 1, got {found_cantidad}"

        # Then adjust inventory by -1 to make it sold out (0)
        adjust_inventory(token, product_id, -1, motivo="conteo")
        inventory = get_inventory()
        inventory_list = normalize_inventory_list(inventory)
        item = find_inventory_item(inventory_list, product_id=product_id, product_name=unique_name)
        assert item is not None, "Product disappeared from inventory after adjusting to zero"
        found_cantidad = extract_cantidad_from_item(item)
        assert found_cantidad is not None, f"Inventory item missing cantidad after adjusting to zero; item: {item}"
        assert int(found_cantidad) == 0, f"Expected sold-out cantidad 0, got {found_cantidad}"

        # Finally set a moderate stock again (2) and verify
        set_inventory_quantity(token, product_id, 2)
        inventory = get_inventory()
        inventory_list = normalize_inventory_list(inventory)
        item = find_inventory_item(inventory_list, product_id=product_id, product_name=unique_name)
        assert item is not None, "Product missing from inventory after restocking to 2"
        found_cantidad = extract_cantidad_from_item(item)
        assert found_cantidad is not None, f"Inventory item missing cantidad after restock; item: {item}"
        assert int(found_cantidad) == 2, f"Expected cantidad 2 after restock, got {found_cantidad}"

        print("TC002 passed: GET /inventory returns up-to-date stock levels and handles low/sold-out states.")
    except Exception as e:
        print(f"TC002 failed: {e}")
        raise
    finally:
        # Cleanup: attempt to delete or deactivate the created product
        if token and product_id:
            ok = delete_product(token, product_id)
            if not ok:
                print(f"Cleanup warning: could not delete or deactivate product {product_id}", file=sys.stderr)


if __name__ == "__main__":
    test_verify_get_inventory_endpoint_returns_current_stock_levels()

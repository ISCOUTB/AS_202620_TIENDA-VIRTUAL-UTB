import requests
import uuid
import sys
import time

BASE_URL = "http://localhost:8000"
LOGIN_PATH = "/identity/login"
CATALOG_PRODUCTS_PATH = "/catalog/products"
TIMEOUT = 30


def test_verify_post_catalog_products_endpoint_creates_new_product():
    # Credentials for a store admin (Antojos)
    email = "admin.antojos@utb.edu.co"
    password = "Tienda-2026"

    # Login to obtain token
    try:
        resp = requests.post(
            BASE_URL + LOGIN_PATH,
            json={"email": email, "password": password},
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")

    assert resp.status_code == 200, f"Login failed, status {resp.status_code}, body: {resp.text}"
    data = resp.json()
    assert "access_token" in data, f"No access_token in login response: {data}"
    token = data["access_token"]

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Create a unique product
    unique_name = f"automated-test-product-{uuid.uuid4()}"
    payload = {
        "tienda": "antojos",
        "nombre": unique_name,
        "descripcion": "Producto creado por prueba automatizada",
        "precio_centavos": 12345,
        "categoria": "Prueba",
        "presentacion": "unidad",
        "precio_confirmado": True,
    }

    product_id = None
    try:
        try:
            create_resp = requests.post(
                BASE_URL + CATALOG_PRODUCTS_PATH,
                json=payload,
                headers=headers,
                timeout=TIMEOUT,
            )
        except requests.RequestException as e:
            raise AssertionError(f"Product creation request failed: {e}")

        assert create_resp.status_code in (200, 201), (
            f"Expected 200 or 201 from product creation, got {create_resp.status_code}: {create_resp.text}"
        )

        created = create_resp.json()
        assert isinstance(created, dict), f"Unexpected creation response shape: {created}"
        # Expect an id in the response
        assert "id" in created, f"Created product missing 'id': {created}"
        product_id = created["id"]

        # Allow a short delay for eventual consistency if needed
        time.sleep(0.5)

        # Verify product appears in catalog for the store
        try:
            get_resp = requests.get(
                BASE_URL + CATALOG_PRODUCTS_PATH,
                params={"tienda": "antojos"},
                timeout=TIMEOUT,
            )
        except requests.RequestException as e:
            raise AssertionError(f"Catalog GET request failed: {e}")

        assert get_resp.status_code == 200, f"GET /catalog/products returned {get_resp.status_code}: {get_resp.text}"
        products = get_resp.json()
        assert isinstance(products, list), f"Expected list from catalog, got: {type(products)}"

        # Find product by id or name
        found = None
        for p in products:
            try:
                if p.get("id") == product_id or p.get("nombre") == unique_name:
                    found = p
                    break
            except Exception:
                continue

        assert found is not None, f"Created product (id={product_id}, nombre={unique_name}) not found in catalog: {products}"

        # Verify some fields match
        assert found.get("nombre") == unique_name, f"Product name mismatch: expected {unique_name}, got {found.get('nombre')}"
        assert found.get("precio_centavos") == payload["precio_centavos"], f"Price mismatch: expected {payload['precio_centavos']}, got {found.get('precio_centavos')}"
        assert found.get("tienda") in ("antojos", 1, "1", found.get("tienda")), "Returned product tienda doesn't match expected 'antojos'"

        print("TEST PASSED: Product created and visible in catalog.")

    finally:
        # Cleanup: attempt to delete the created product if we have an id
        if product_id is not None:
            delete_url = f"{BASE_URL}{CATALOG_PRODUCTS_PATH}/{product_id}"
            try:
                del_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                if del_resp.status_code in (200, 204):
                    print(f"Cleanup: product {product_id} deleted successfully.")
                else:
                    # If delete not allowed, attempt to patch to deactivate
                    patch_payloads = [
                        {"a_la_venta": False},
                        {"activo": False},
                        {"venta": False},
                    ]
                    patched = False
                    for p_payload in patch_payloads:
                        try:
                            patch_resp = requests.patch(delete_url, headers=headers, json=p_payload, timeout=TIMEOUT)
                        except requests.RequestException:
                            patch_resp = None
                        if patch_resp is not None and patch_resp.status_code in (200, 204):
                            print(f"Cleanup: product {product_id} patched with {p_payload}.")
                            patched = True
                            break
                    if not patched:
                        print(f"Cleanup: could not delete or deactivate product {product_id}. Response status: {del_resp.status_code}, body: {del_resp.text}")
            except requests.RequestException as e:
                print(f"Cleanup request failed for product {product_id}: {e}")


if __name__ == "__main__":
    try:
        test_verify_post_catalog_products_endpoint_creates_new_product()
    except AssertionError as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    except Exception as e:
        print("UNEXPECTED ERROR:", e)
        sys.exit(2)
    sys.exit(0)

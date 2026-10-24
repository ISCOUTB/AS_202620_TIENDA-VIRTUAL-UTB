import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/identity/login"
CREATE_PRODUCT_URL = f"{BASE_URL}/catalog/products"
PATCH_PRODUCT_URL = f"{BASE_URL}/catalog/products/28"  # product 28 belongs to punto-fit per PRD
TIMEOUT = 30.0

def test_general_admin_cannot_create_or_edit_products():
    # Login as general admin
    login_payload = {"email": "admin@utb.edu.co", "password": "Admin-Demo-2026"}
    try:
        r = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")

    assert r.status_code == 200, f"Expected 200 on login, got {r.status_code}, body: {r.text}"
    token_data = r.json()
    access_token = token_data.get("access_token")
    assert access_token, f"No access_token in login response: {token_data}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Attempt to create a product in punto-fit (should be forbidden for general admin)
    unique_name = f"test-product-{uuid.uuid4().hex}"
    create_payload = {
        "tienda": "punto-fit",
        "nombre": unique_name,
        "descripcion": "x",
        "precio_centavos": 100000
    }

    try:
        r_create = requests.post(CREATE_PRODUCT_URL, json=create_payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Create product request failed: {e}")

    # Expect 403 Forbidden with detail starting 'El administrador general solo supervisa'
    assert r_create.status_code == 403, f"Expected 403 when general admin tries to create product, got {r_create.status_code}, body: {r_create.text}"
    try:
        create_json = r_create.json()
        detail = create_json.get("detail", "")
    except ValueError:
        detail = r_create.text or ""
    assert isinstance(detail, str) and detail.startswith("El administrador general solo supervisa"), f"Unexpected error detail for create: {detail}"

    # Attempt to patch product 28 (should be forbidden for general admin)
    patch_payload = {"descripcion": "x"}
    try:
        r_patch = requests.patch(PATCH_PRODUCT_URL, json=patch_payload, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Patch product request failed: {e}")

    assert r_patch.status_code == 403, f"Expected 403 when general admin tries to edit product, got {r_patch.status_code}, body: {r_patch.text}"
    try:
        patch_json = r_patch.json()
        detail_patch = patch_json.get("detail", "")
    except ValueError:
        detail_patch = r_patch.text or ""
    assert isinstance(detail_patch, str) and detail_patch.startswith("El administrador general solo supervisa"), f"Unexpected error detail for patch: {detail_patch}"

    print("TC012 passed: general admin cannot create or edit products and receives supervision 403 messages.")

if __name__ == "__main__":
    try:
        test_general_admin_cannot_create_or_edit_products()
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error during test: {e}")
        sys.exit(2)
    else:
        sys.exit(0)
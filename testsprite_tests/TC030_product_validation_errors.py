import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = "/identity/login"
PRODUCTS_ENDPOINT = "/catalog/products"
TIMEOUT = 30.0

ADMIN_EMAIL = "admin.antojos@utb.edu.co"
ADMIN_PASSWORD = "Tienda-2026"


def test_product_validation_errors():
    # Log in as store admin
    login_url = BASE_URL + LOGIN_ENDPOINT
    resp = requests.post(
        login_url,
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
    token = resp.json().get("access_token")
    assert token, f"No access_token in login response: {resp.text}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    created_product_id = None
    try:
        # 1) Negative precio_centavos -> expect 422
        payload_neg_price = {
            "tienda": "antojos",
            "nombre": f"InvalidPrice-{uuid.uuid4()}",
            "descripcion": "producto con precio negativo",
            "precio_centavos": -100,
        }
        r1 = requests.post(
            BASE_URL + PRODUCTS_ENDPOINT, json=payload_neg_price, headers=headers, timeout=TIMEOUT
        )
        assert (
            r1.status_code == 422
        ), f"Expected 422 for negative precio_centavos, got {r1.status_code}: {r1.text}"

        # 2) Empty nombre -> expect 422
        payload_empty_name = {
            "tienda": "antojos",
            "nombre": "",
            "descripcion": "producto sin nombre",
            "precio_centavos": 1000,
        }
        r2 = requests.post(
            BASE_URL + PRODUCTS_ENDPOINT, json=payload_empty_name, headers=headers, timeout=TIMEOUT
        )
        assert (
            r2.status_code == 422
        ), f"Expected 422 for empty nombre, got {r2.status_code}: {r2.text}"

        # 3) Nombre repeated in same store -> create a product then attempt to create it again -> expect 409
        dup_name = f"DuplicatedProduct-{uuid.uuid4()}"
        payload_create = {
            "tienda": "antojos",
            "nombre": dup_name,
            "descripcion": "producto para test duplicado",
            "precio_centavos": 1500,
        }
        r_create = requests.post(
            BASE_URL + PRODUCTS_ENDPOINT, json=payload_create, headers=headers, timeout=TIMEOUT
        )
        assert r_create.status_code in (200, 201), f"Failed to create product for duplicate test: {r_create.status_code} {r_create.text}"
        # Try to extract the created product id for cleanup
        try:
            created_product_id = (
                r_create.json().get("id")
                or r_create.json().get("product_id")
                or r_create.json().get("productId")
            )
        except Exception:
            created_product_id = None

        # Attempt to create the same product again; expect conflict 409
        r_dup = requests.post(
            BASE_URL + PRODUCTS_ENDPOINT, json=payload_create, headers=headers, timeout=TIMEOUT
        )
        assert (
            r_dup.status_code == 409
        ), f"Expected 409 for duplicate product name, got {r_dup.status_code}: {r_dup.text}"

        # 4) Unknown tienda 'no-existe' -> expect 404 or 403
        payload_unknown_store = {
            "tienda": "no-existe",
            "nombre": f"AnyName-{uuid.uuid4()}",
            "descripcion": "tienda desconocida",
            "precio_centavos": 1000,
        }
        r_unknown = requests.post(
            BASE_URL + PRODUCTS_ENDPOINT, json=payload_unknown_store, headers=headers, timeout=TIMEOUT
        )
        assert r_unknown.status_code in (403, 404), f"Expected 403 or 404 for unknown tienda, got {r_unknown.status_code}: {r_unknown.text}"

    finally:
        # Cleanup: attempt to delete the created product if we have an id
        if created_product_id:
            # Try delete by id
            delete_url = f"{BASE_URL}{PRODUCTS_ENDPOINT}/{created_product_id}"
            try:
                d = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
                # Accept common success statuses for delete
                if d.status_code not in (200, 202, 204):
                    # If delete by id failed, attempt to search and deactivate via PATCH (best-effort)
                    # Attempt PATCH to the same endpoint to set a flag like 'activo': False if supported
                    try:
                        patch_resp = requests.patch(
                            delete_url,
                            json={"activo": False},
                            headers=headers,
                            timeout=TIMEOUT,
                        )
                        # ignore result; this is best-effort cleanup
                    except Exception:
                        pass
            except Exception:
                pass


if __name__ == "__main__":
    try:
        test_product_validation_errors()
        print("TC030 product_validation_errors: PASSED")
    except AssertionError as e:
        print("TC030 product_validation_errors: FAILED")
        print(str(e))
        sys.exit(1)
    except Exception as exc:
        print("TC030 product_validation_errors: ERROR")
        print(str(exc))
        sys.exit(2)
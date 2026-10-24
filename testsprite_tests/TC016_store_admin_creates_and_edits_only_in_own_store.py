import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0

def test_store_admin_creates_and_edits_only_in_own_store():
    token = None
    product_id = None

    # Login as admin.alegria@utb.edu.co
    try:
        resp = requests.post(
            f"{BASE_URL}/identity/login",
            json={"email": "admin.alegria@utb.edu.co", "password": "Tienda-2026"},
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")

    assert resp.status_code == 200, f"Login failed: {resp.status_code} {resp.text}"
    data = resp.json()
    token = data.get("access_token")
    assert token, f"No access_token in login response: {data}"

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Create a unique product in 'alegria' (own store) -> expect 201
    unique_name = f"test-product-{uuid.uuid4().hex}"
    create_payload = {
        "tienda": "alegria",
        "nombre": unique_name,
        "descripcion": "x",
        "precio_centavos": 250000
    }

    try:
        resp = requests.post(
            f"{BASE_URL}/catalog/products",
            json=create_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        raise AssertionError(f"Create product request failed: {e}")

    assert resp.status_code == 201, f"Expected 201 when creating product in own store, got {resp.status_code}: {resp.text}"

    try:
        created = resp.json()
    except ValueError:
        raise AssertionError(f"Create product did not return JSON: {resp.text}")

    # extract product id if present
    product_id = created.get("id") or created.get("product_id") or created.get("uuid")
    assert product_id, f"Created product response missing id: {created}"

    # optional check: tienda in response should reflect 'alegria' or tienda_id == 3
    if "tienda" in created:
        assert str(created["tienda"]).lower() == "alegria", f"Created product tienda mismatch: {created.get('tienda')}"
    elif "tienda_id" in created:
        # store id for 'alegria' is 3 per PRD
        assert int(created["tienda_id"]) == 3, f"Created product tienda_id mismatch: {created.get('tienda_id')}"

    # Attempt to create same body but with tienda 'antojos' -> expect 403
    create_other_payload = create_payload.copy()
    create_other_payload["tienda"] = "antojos"
    try:
        resp_other = requests.post(
            f"{BASE_URL}/catalog/products",
            json=create_other_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        raise AssertionError(f"Create product in other store request failed: {e}")

    assert resp_other.status_code == 403, f"Expected 403 when creating product in other store, got {resp_other.status_code}: {resp_other.text}"

    # Attempt to PATCH product 25 (Punto Fit) -> expect 403
    patch_payload = {"descripcion": "x"}
    try:
        resp_patch = requests.patch(
            f"{BASE_URL}/catalog/products/25",
            json=patch_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        raise AssertionError(f"Patch other store product request failed: {e}")

    assert resp_patch.status_code == 403, f"Expected 403 when editing other store product, got {resp_patch.status_code}: {resp_patch.text}"

    # Cleanup: try to delete the created product; if delete not allowed, try to deactivate via PATCH
    if product_id:
        # try DELETE first
        try:
            del_resp = requests.delete(
                f"{BASE_URL}/catalog/products/{product_id}",
                headers=headers,
                timeout=TIMEOUT,
            )
        except requests.RequestException as e:
            # proceed to try patch cleanup
            del_resp = None
            delete_exception = e
        else:
            delete_exception = None

        if del_resp is not None and del_resp.status_code in (200, 204, 202):
            return  # cleaned up successfully

        # If DELETE not supported or failed, attempt PATCH to deactivate
        cleanup_candidates = [
            {"a_la_venta": False},
            {"activo": False},
            {"inactivo": True},
            {"disponible": False},
            {"venta": False},
        ]
        patched = False
        for payload in cleanup_candidates:
            try:
                p_resp = requests.patch(
                    f"{BASE_URL}/catalog/products/{product_id}",
                    json=payload,
                    headers=headers,
                    timeout=TIMEOUT,
                )
            except requests.RequestException:
                continue
            if p_resp.status_code in (200, 204):
                patched = True
                break

        if not patched:
            # As a last resort, log and raise so test harness can inspect the orphaned resource
            msg_parts = []
            if delete_exception:
                msg_parts.append(f"DELETE attempt raised exception: {delete_exception}")
            elif del_resp is not None:
                msg_parts.append(f"DELETE returned {del_resp.status_code}: {del_resp.text}")
            else:
                msg_parts.append("DELETE not attempted")
            msg_parts.append("PATCH cleanup attempts failed (no supported deactivation payload succeeded)")
            raise AssertionError(" ; ".join(msg_parts))

if __name__ == "__main__":
    try:
        test_store_admin_creates_and_edits_only_in_own_store()
    except AssertionError as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    except Exception as e:
        print("TEST ERROR:", e)
        sys.exit(2)
    else:
        print("TEST PASSED")
        sys.exit(0)
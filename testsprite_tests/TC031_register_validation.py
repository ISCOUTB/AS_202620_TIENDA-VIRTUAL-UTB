import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30


def test_register_validation():
    session = requests.Session()
    headers = {"Content-Type": "application/json"}

    # 1) Password shorter than 8 -> 422
    short_pwd_email = f"short-{uuid.uuid4().hex}@utb.edu.co"
    payload_short_pwd = {"nombre": "Short Pass", "email": short_pwd_email, "password": "Ab1"}
    try:
        r = session.post(f"{BASE_URL}/identity/register", json=payload_short_pwd, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request failed for short password case: {e}")
    assert r.status_code == 422, f"Expected 422 for short password, got {r.status_code}: {r.text}"

    # 2) Invalid email -> 422
    invalid_email = "not-an-email"
    payload_invalid_email = {"nombre": "Invalid Email", "email": invalid_email, "password": "ValidPass123"}
    try:
        r = session.post(f"{BASE_URL}/identity/register", json=payload_invalid_email, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request failed for invalid email case: {e}")
    assert r.status_code == 422, f"Expected 422 for invalid email, got {r.status_code}: {r.text}"

    # 3) Already registered email ana@utb.edu.co -> 409
    existing_email = "ana@utb.edu.co"
    payload_existing = {"nombre": "Ana Duplicate", "email": existing_email, "password": "Comprador-2026"}
    try:
        r = session.post(f"{BASE_URL}/identity/register", json=payload_existing, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request failed for existing email case: {e}")
    assert r.status_code == 409, f"Expected 409 for already registered email, got {r.status_code}: {r.text}"

    # 4) Unique valid email -> 201 with roles including {codigo: 'comprador'}
    unique_email = f"user-{uuid.uuid4().hex}@utb.edu.co"
    unique_password = "ValidPass-2026"
    payload_unique = {"nombre": "Unique User", "email": unique_email, "password": unique_password}

    created = False
    try:
        try:
            r = session.post(f"{BASE_URL}/identity/register", json=payload_unique, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            raise AssertionError(f"Request failed for unique valid email case: {e}")

        assert r.status_code == 201, f"Expected 201 for successful registration, got {r.status_code}: {r.text}"

        # Validate response contains roles with codigo 'comprador'
        try:
            body = r.json()
        except ValueError:
            raise AssertionError(f"Response is not JSON for successful registration: {r.text}")

        roles = body.get("roles") if isinstance(body, dict) else None
        assert isinstance(roles, list), f"Expected 'roles' list in response, got: {body}"

        has_comprador = any((isinstance(role, dict) and role.get("codigo") == "comprador") for role in roles)
        assert has_comprador, f"Expected a role with codigo 'comprador' in roles, got: {roles}"

        created = True

    finally:
        # Cleanup: attempt to delete the created account if it was created.
        if created:
            # Try to login as the created user to obtain token
            login_payload = {"email": unique_email, "password": unique_password}
            try:
                lr = session.post(f"{BASE_URL}/identity/login", json=login_payload, headers=headers, timeout=TIMEOUT)
            except requests.RequestException as e:
                print(f"Cleanup warning: login failed for cleanup: {e}", file=sys.stderr)
                return

            if lr.status_code != 200:
                print(f"Cleanup warning: login returned {lr.status_code}, cannot delete account. Response: {lr.text}", file=sys.stderr)
                return

            try:
                token_body = lr.json()
            except ValueError:
                print(f"Cleanup warning: login response not JSON: {lr.text}", file=sys.stderr)
                return

            access_token = token_body.get("access_token")
            if not access_token:
                print(f"Cleanup warning: no access_token in login response: {token_body}", file=sys.stderr)
                return

            auth_headers = {"Authorization": f"Bearer {access_token}"}
            # Attempt to DELETE /identity/me to remove the created account (common pattern)
            try:
                dr = session.delete(f"{BASE_URL}/identity/me", headers=auth_headers, timeout=TIMEOUT)
            except requests.RequestException as e:
                print(f"Cleanup warning: delete request failed: {e}", file=sys.stderr)
                return

            if dr.status_code not in (200, 204):
                # If deletion endpoint not available or returns different code, warn but don't fail the test
                print(f"Cleanup warning: delete returned {dr.status_code}: {dr.text}", file=sys.stderr)


if __name__ == "__main__":
    test_register_validation()
    print("TC031 register_validation completed successfully.")
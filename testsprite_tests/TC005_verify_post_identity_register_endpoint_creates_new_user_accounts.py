import requests
import uuid
import sys
from requests.exceptions import RequestException, Timeout, HTTPError

BASE_URL = "http://localhost:8000"
TIMEOUT = 30  # seconds

def test_post_identity_register_creates_new_user_accounts():
    unique_suffix = uuid.uuid4().hex
    name = f"Test User {unique_suffix}"
    email = f"testuser+{unique_suffix}@example.com"
    password = "TestPass-2026!"  # satisfies typical complexity rules

    register_url = f"{BASE_URL}/identity/register"
    login_url = f"{BASE_URL}/identity/login"
    delete_me_url = f"{BASE_URL}/identity/me"

    headers = {"Content-Type": "application/json"}

    created_token = None
    created_user_info = None

    try:
        # 1) Register the new user (API expects 'nombre' instead of 'name')
        register_payload = {"nombre": name, "email": email, "password": password}
        try:
            r = requests.post(register_url, json=register_payload, headers=headers, timeout=TIMEOUT)
        except (RequestException, Timeout) as e:
            raise AssertionError(f"Registration request failed: {e}")

        # Accept 200 or 201 for successful creation
        assert r.status_code in (200, 201), f"Unexpected status code for register: {r.status_code}, body: {r.text}"

        # If response has JSON, try to validate returned fields
        try:
            reg_json = r.json()
            # If API returns created user object, validate email/name presence
            if isinstance(reg_json, dict):
                if "email" in reg_json:
                    assert reg_json.get("email") == email, "Registered email in response does not match"
                # Accept either 'nombre' or 'name' in response
                if "nombre" in reg_json:
                    assert reg_json.get("nombre") == name, "Registered nombre in response does not match"
                elif "name" in reg_json:
                    assert reg_json.get("name") == name, "Registered name in response does not match"
                created_user_info = reg_json
        except ValueError:
            # No JSON returned; proceed to login to confirm account was created
            reg_json = None

        # 2) Attempt to login with the new credentials to ensure the account works
        login_payload = {"email": email, "password": password}
        try:
            r2 = requests.post(login_url, json=login_payload, headers=headers, timeout=TIMEOUT)
        except (RequestException, Timeout) as e:
            raise AssertionError(f"Login request after register failed: {e}")

        assert r2.status_code == 200, f"Login failed after registration. Status: {r2.status_code}, body: {r2.text}"
        try:
            login_json = r2.json()
        except ValueError:
            raise AssertionError("Login response is not valid JSON")

        assert "access_token" in login_json and login_json["access_token"], "access_token missing or empty in login response"
        assert "expires_in" in login_json, "expires_in missing in login response"

        created_token = login_json["access_token"]

        # Optional: verify that /identity/me returns the new user's info when authenticated
        me_headers = {"Authorization": f"Bearer {created_token}"}
        try:
            r3 = requests.get(delete_me_url, headers=me_headers, timeout=TIMEOUT)
        except (RequestException, Timeout) as e:
            raise AssertionError(f"GET /identity/me failed: {e}")

        assert r3.status_code == 200, f"Authenticated GET /identity/me expected 200, got {r3.status_code}. Body: {r3.text}"
        try:
            me_json = r3.json()
            # Basic checks: email present and matches
            if isinstance(me_json, dict) and "email" in me_json:
                assert me_json.get("email") == email, "Identity 'me' email does not match registered email"
        except ValueError:
            raise AssertionError("GET /identity/me did not return valid JSON")

        print("Registration and login flow succeeded for", email)

    finally:
        # Cleanup: try to delete the created account using DELETE /identity/me if supported
        if created_token:
            try:
                del_headers = {"Authorization": f"Bearer {created_token}"}
                resp = requests.delete(delete_me_url, headers=del_headers, timeout=TIMEOUT)
                # Accept 200, 202, 204 as successful deletion; 404/405 may mean endpoint not supported — ignore but log
                if resp.status_code in (200, 202, 204):
                    print("Cleanup: deleted test user account.")
                else:
                    print(f"Cleanup: DELETE /identity/me returned status {resp.status_code}, body: {resp.text}")
            except Exception as e:
                print(f"Cleanup: failed to delete test user account: {e}")
        else:
            print("No authenticated token obtained; skipping delete cleanup.")

if __name__ == "__main__":
    try:
        test_post_identity_register_creates_new_user_accounts()
        print("TEST PASSED")
    except AssertionError as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    except Exception as e:
        print("TEST ERROR:", e)
        sys.exit(2)

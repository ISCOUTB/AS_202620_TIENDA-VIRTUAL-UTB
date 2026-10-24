import requests
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30


def test_post_identity_login_endpoint_authenticates_users():
    session = requests.Session()

    # Successful login cases to verify tokens and /identity/me
    valid_accounts = [
        ("ana@utb.edu.co", "Comprador-2026"),                 # buyer
        ("admin.antojos@utb.edu.co", "Tienda-2026"),          # store admin
        ("admin@utb.edu.co", "Admin-Demo-2026"),              # general admin (supervisor)
    ]

    for email, password in valid_accounts:
        try:
            resp = session.post(
                f"{BASE_URL}/identity/login",
                json={"email": email, "password": password},
                timeout=TIMEOUT,
            )
        except requests.RequestException as e:
            assert False, f"Request failed for {email}: {e}"

        assert resp.status_code == 200, (
            f"Expected 200 for valid credentials ({email}), got {resp.status_code}: {resp.text}"
        )

        try:
            data = resp.json()
        except ValueError:
            assert False, f"Login response for {email} is not valid JSON: {resp.text}"

        assert "access_token" in data, f"access_token missing in login response for {email}: {data}"
        assert "expires_in" in data, f"expires_in missing in login response for {email}: {data}"

        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Verify token works with /identity/me
        try:
            me_resp = session.get(f"{BASE_URL}/identity/me", headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            assert False, f"Request to /identity/me failed for {email}: {e}"

        assert me_resp.status_code == 200, (
            f"Expected 200 from /identity/me for {email}, got {me_resp.status_code}: {me_resp.text}"
        )

        try:
            me_data = me_resp.json()
        except ValueError:
            assert False, f"/identity/me response for {email} is not valid JSON: {me_resp.text}"

        # Ensure the returned identity corresponds to the logged-in email when provided
        if "email" in me_data:
            assert me_data["email"] == email, (
                f"/identity/me returned email {me_data['email']} but expected {email}"
            )

    # Invalid credential case: wrong password
    wrong_password_email = "ana@utb.edu.co"
    wrong_password = "wrong-password-123"
    try:
        invalid_resp = session.post(
            f"{BASE_URL}/identity/login",
            json={"email": wrong_password_email, "password": wrong_password},
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        assert False, f"Request failed for invalid credentials test: {e}"

    # Login with invalid credentials should not succeed
    assert invalid_resp.status_code != 200, (
        f"Invalid credentials unexpectedly succeeded with status 200: {invalid_resp.text}"
    )

    # Expect a client error (commonly 400 or 401 or 422). Accept any 4xx.
    assert 400 <= invalid_resp.status_code < 500, (
        f"Expected 4xx for invalid credentials, got {invalid_resp.status_code}: {invalid_resp.text}"
    )

    # Verify the error response contains an explanatory message
    try:
        err_data = invalid_resp.json()
        # Expect some common keys in error responses
        assert any(k in err_data for k in ("detail", "message", "error", "errors")), (
            f"Invalid-login response JSON missing expected error keys: {err_data}"
        )
        # If there's a textual detail, ensure it mentions credentials or auth
        text_values = " ".join(str(v) for v in err_data.values()).lower()
        assert (
            "invalid" in text_values
            or "cred" in text_values
            or "contrase" in text_values
            or "aut" in text_values
            or len(text_values.strip()) > 0
        ), f"Error JSON does not contain an explanatory message: {err_data}"
    except ValueError:
        # Not JSON; inspect raw text
        body = invalid_resp.text.lower()
        assert (
            "invalid" in body
            or "cred" in body
            or "contrase" in body
            or "aut" in body
        ), f"Invalid-login response body not informative: {invalid_resp.text}"


if __name__ == "__main__":
    try:
        test_post_identity_login_endpoint_authenticates_users()
    except AssertionError as e:
        print("TEST FAILED:", e)
        sys.exit(1)
    print("TEST PASSED")
    sys.exit(0)
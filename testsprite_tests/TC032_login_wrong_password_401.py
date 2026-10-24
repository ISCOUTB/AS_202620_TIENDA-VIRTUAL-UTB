import requests
import uuid
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30

def test_login_wrong_password_401():
    url = f"{BASE_URL}/identity/login"
    headers = {"Content-Type": "application/json", "Accept": "application/json"}

    # Case 1: known user with wrong password
    payload_known_wrong = {"email": "ana@utb.edu.co", "password": "Comprador-WRONG-123"}
    try:
        resp_known = requests.post(url, json=payload_known_wrong, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise SystemExit(f"HTTP request failed for known user wrong password: {e}")

    assert resp_known.status_code == 401, f"Expected 401 for wrong password, got {resp_known.status_code}. Body: {resp_known.text}"
    try:
        json_known = resp_known.json()
    except ValueError:
        raise AssertionError(f"Response for wrong password is not valid JSON: {resp_known.text}")

    detail_known = json_known.get("detail")
    assert detail_known is not None, f"'detail' missing in response for wrong password: {json_known}"

    # Case 2: unknown email (must produce the same 401 detail to avoid user enumeration)
    unknown_email = f"unknown-{uuid.uuid4()}@utb.edu.co"
    payload_unknown = {"email": unknown_email, "password": "SomePassword123!"}
    try:
        resp_unknown = requests.post(url, json=payload_unknown, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise SystemExit(f"HTTP request failed for unknown email: {e}")

    assert resp_unknown.status_code == 401, f"Expected 401 for unknown email, got {resp_unknown.status_code}. Body: {resp_unknown.text}"
    try:
        json_unknown = resp_unknown.json()
    except ValueError:
        raise AssertionError(f"Response for unknown email is not valid JSON: {resp_unknown.text}")

    detail_unknown = json_unknown.get("detail")
    assert detail_unknown is not None, f"'detail' missing in response for unknown email: {json_unknown}"

    # The details must be identical to prevent user enumeration
    assert detail_known == detail_unknown, (
        "Expected identical 'detail' message for wrong password and unknown email to prevent user enumeration. "
        f"Got: known={detail_known!r}, unknown={detail_unknown!r}"
    )

    print("TC032 passed: wrong password and unknown email both returned 401 with identical detail.")

if __name__ == "__main__":
    test_login_wrong_password_401()
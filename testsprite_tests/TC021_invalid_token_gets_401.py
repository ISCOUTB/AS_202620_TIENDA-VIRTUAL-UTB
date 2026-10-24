import requests
import base64
import hmac
import hashlib
import json
import time
import sys

BASE_URL = "http://localhost:8000"
LOGIN_ENDPOINT = f"{BASE_URL}/identity/login"
ME_ENDPOINT = f"{BASE_URL}/identity/me"
TIMEOUT = 30

def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

def make_fake_hs256_jwt(payload: dict, secret: bytes = b"wrong-secret") -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = b64url_encode(json.dumps(header, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    payload_b64 = b64url_encode(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(secret, signing_input, hashlib.sha256).digest()
    sig_b64 = b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def test_invalid_token_gets_401():
    try:
        # 1) Obtain a real token (sanity check that login works)
        login_payload = {"email": "ana@utb.edu.co", "password": "Comprador-2026"}
        r = requests.post(LOGIN_ENDPOINT, json=login_payload, timeout=TIMEOUT)
        assert r.status_code == 200, f"Expected 200 from login, got {r.status_code}: {r.text}"
        data = r.json()
        assert "access_token" in data, f"Login response missing access_token: {data}"
        real_token = data["access_token"]

        # 2) Use an obviously invalid token string
        headers_invalid_string = {"Authorization": "Bearer not-a-token"}
        r_invalid = requests.get(ME_ENDPOINT, headers=headers_invalid_string, timeout=TIMEOUT)
        assert r_invalid.status_code == 401, (
            f"Expected 401 for 'not-a-token', got {r_invalid.status_code}: {r_invalid.text}"
        )
        # Optionally check WWW-Authenticate header presence
        if "WWW-Authenticate" in r_invalid.headers:
            assert r_invalid.headers["WWW-Authenticate"].lower().startswith("bearer"), (
                "WWW-Authenticate header does not indicate Bearer"
            )

        # 3) Use a JWT-looking token signed with a different secret (should fail signature verification)
        fake_payload = {
            "sub": "attacker",
            "email": "attacker@utb.edu.co",
            "exp": int(time.time()) + 3600
        }
        fake_token = make_fake_hs256_jwt(fake_payload, secret=b"another-secret-key")
        headers_fake_jwt = {"Authorization": f"Bearer {fake_token}"}
        r_fake = requests.get(ME_ENDPOINT, headers=headers_fake_jwt, timeout=TIMEOUT)
        assert r_fake.status_code == 401, (
            f"Expected 401 for JWT signed with another secret, got {r_fake.status_code}: {r_fake.text}"
        )
        if "WWW-Authenticate" in r_fake.headers:
            assert r_fake.headers["WWW-Authenticate"].lower().startswith("bearer"), (
                "WWW-Authenticate header does not indicate Bearer for fake JWT response"
            )

        print("TC021 invalid_token_gets_401: PASSED")
    except requests.RequestException as e:
        print(f"Network error during test: {e}", file=sys.stderr)
        raise
    except AssertionError as e:
        print(f"Assertion failed: {e}", file=sys.stderr)
        raise

if __name__ == "__main__":
    test_invalid_token_gets_401()
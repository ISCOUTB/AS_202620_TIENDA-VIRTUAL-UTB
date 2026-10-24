import requests
import sys
from typing import Any, Dict, List

BASE = "http://localhost:8000"
TIMEOUT = 30.0

def login(email: str, password: str) -> str:
    url = f"{BASE}/identity/login"
    try:
        resp = requests.post(url, json={"email": email, "password": password}, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed for {email}: {e}") from e

    if resp.status_code != 200:
        raise AssertionError(f"Expected 200 from {url} for {email}, got {resp.status_code}: {resp.text}")

    try:
        body = resp.json()
    except ValueError:
        raise AssertionError(f"Login response for {email} is not valid JSON: {resp.text}")

    token = body.get("access_token")
    if not token:
        raise AssertionError(f"No access_token in login response for {email}: {body}")

    return token

def get_me(token: str) -> Dict[str, Any]:
    url = f"{BASE}/identity/me"
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"GET /identity/me request failed: {e}") from e

    if resp.status_code != 200:
        raise AssertionError(f"Expected 200 from {url}, got {resp.status_code}: {resp.text}")

    try:
        return resp.json()
    except ValueError:
        raise AssertionError(f"/identity/me response is not valid JSON: {resp.text}")

def assert_role_present(roles: List[Dict[str, Any]], codigo: str, tienda_id: int = None) -> None:
    if not isinstance(roles, list):
        raise AssertionError(f"roles is not a list: {roles}")

    for r in roles:
        if not isinstance(r, dict):
            continue
        if r.get("codigo") != codigo:
            continue
        if tienda_id is None:
            # only codigo required
            return
        # handle tienda_id possibly as int or str
        try:
            rid = r.get("tienda_id")
            if rid is None:
                continue
            if int(rid) == tienda_id:
                return
        except (ValueError, TypeError):
            continue

    if tienda_id is None:
        raise AssertionError(f"Role with codigo '{codigo}' not found in roles: {roles}")
    else:
        raise AssertionError(f"Role with codigo '{codigo}' and tienda_id {tienda_id} not found in roles: {roles}")

def test_me_returns_roles_per_store():
    # Store admin: admin.almuerzo-01@utb.edu.co / Tienda-2026 -> tienda_id 4, admin_tienda role
    store_admin_email = "admin.almuerzo-01@utb.edu.co"
    store_admin_password = "Tienda-2026"

    token_store_admin = login(store_admin_email, store_admin_password)
    me_store_admin = get_me(token_store_admin)

    roles_sa = me_store_admin.get("roles")
    assert roles_sa is not None, f"/identity/me did not include 'roles' for {store_admin_email}: {me_store_admin}"
    assert_role_present(roles_sa, "admin_tienda", tienda_id=4)

    print(f"Store admin {store_admin_email} has admin_tienda role for tienda_id 4.")

    # General admin: admin@utb.edu.co / Admin-Demo-2026 -> roles include admin_general
    general_admin_email = "admin@utb.edu.co"
    general_admin_password = "Admin-Demo-2026"

    token_general_admin = login(general_admin_email, general_admin_password)
    me_general_admin = get_me(token_general_admin)

    roles_ga = me_general_admin.get("roles")
    assert roles_ga is not None, f"/identity/me did not include 'roles' for {general_admin_email}: {me_general_admin}"
    assert_role_present(roles_ga, "admin_general")

    print(f"General admin {general_admin_email} has admin_general role.")

if __name__ == "__main__":
    try:
        test_me_returns_roles_per_store()
        print("TC033 passed.")
    except AssertionError as e:
        print(f"TC033 failed: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"TC033 unexpected error: {e}", file=sys.stderr)
        sys.exit(2)
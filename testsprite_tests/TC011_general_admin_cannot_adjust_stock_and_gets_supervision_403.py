import requests
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30


def test_general_admin_cannot_adjust_stock_and_gets_supervision_403():
    session = requests.Session()

    # 1) Login as general admin
    login_url = f"{BASE_URL}/identity/login"
    creds = {"email": "admin@utb.edu.co", "password": "Admin-Demo-2026"}
    try:
        r = session.post(login_url, json=creds, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise RuntimeError(f"Login request failed: {e}")
    assert r.status_code == 200, f"Login failed, expected 200 got {r.status_code}, body: {r.text}"
    try:
        token = r.json().get("access_token")
    except ValueError:
        raise AssertionError(f"Login response is not valid JSON: {r.text}")
    assert token, f"No access_token in login response: {r.text}"

    headers = {"Authorization": f"Bearer {token}"}

    inventory_id = 27
    inventory_url = f"{BASE_URL}/inventory/{inventory_id}"

    # Helper to get cantidad
    def get_cantidad():
        try:
            resp = session.get(inventory_url, headers=headers, timeout=TIMEOUT)
        except requests.RequestException as e:
            raise RuntimeError(f"GET {inventory_url} failed: {e}")
        assert resp.status_code == 200, f"Expected 200 from GET {inventory_url}, got {resp.status_code}, body: {resp.text}"
        try:
            j = resp.json()
        except ValueError:
            raise AssertionError(f"GET {inventory_url} did not return JSON: {resp.text}")
        assert "cantidad" in j, f"'cantidad' not in GET {inventory_url} response: {j}"
        cantidad = j["cantidad"]
        assert isinstance(cantidad, int), f"'cantidad' should be int, got {type(cantidad)}: {cantidad}"
        return cantidad

    # 2) Read original cantidad
    original_cantidad = get_cantidad()

    # 3) Attempt POST adjust -> expect 403 with supervision detail
    adjust_url = f"{inventory_url}/adjust"
    adjust_payload = {"delta": 1, "motivo": "conteo"}
    try:
        resp_adjust = session.post(adjust_url, headers=headers, json=adjust_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise RuntimeError(f"POST {adjust_url} failed: {e}")
    assert resp_adjust.status_code == 403, f"Expected 403 from POST {adjust_url}, got {resp_adjust.status_code}, body: {resp_adjust.text}"
    # parse detail
    detail_text = None
    try:
        jd = resp_adjust.json()
        if isinstance(jd, dict):
            detail_text = jd.get("detail") or jd.get("message") or str(jd)
        else:
            detail_text = str(jd)
    except ValueError:
        detail_text = resp_adjust.text or ""
    assert detail_text is not None, f"No detail in 403 response: {resp_adjust.text}"
    expected_prefix = "El administrador general solo supervisa"
    assert detail_text.startswith(expected_prefix), f"403 detail should start with '{expected_prefix}', got: '{detail_text}'"

    # 4) GET again and verify cantidad unchanged
    cantidad_after_adjust = get_cantidad()
    assert cantidad_after_adjust == original_cantidad, f"cantidad changed after forbidden adjust: was {original_cantidad}, now {cantidad_after_adjust}"

    # 5) Attempt PUT set cantidad -> expect 403 with same supervision detail
    put_payload = {"cantidad": 5}
    try:
        resp_put = session.put(inventory_url, headers=headers, json=put_payload, timeout=TIMEOUT)
    except requests.RequestException as e:
        raise RuntimeError(f"PUT {inventory_url} failed: {e}")
    assert resp_put.status_code == 403, f"Expected 403 from PUT {inventory_url}, got {resp_put.status_code}, body: {resp_put.text}"
    # parse detail
    detail_text_put = None
    try:
        jp = resp_put.json()
        if isinstance(jp, dict):
            detail_text_put = jp.get("detail") or jp.get("message") or str(jp)
        else:
            detail_text_put = str(jp)
    except ValueError:
        detail_text_put = resp_put.text or ""
    assert detail_text_put is not None, f"No detail in 403 response for PUT: {resp_put.text}"
    assert detail_text_put.startswith(expected_prefix), f"PUT 403 detail should start with '{expected_prefix}', got: '{detail_text_put}'"

    # 6) Final GET to ensure cantidad unchanged
    final_cantidad = get_cantidad()
    assert final_cantidad == original_cantidad, f"cantidad changed after forbidden PUT: was {original_cantidad}, now {final_cantidad}"

    print("TC011 passed: General admin cannot adjust or set stock and receives supervision 403; cantidad unchanged.")


if __name__ == "__main__":
    try:
        test_general_admin_cannot_adjust_stock_and_gets_supervision_403()
    except AssertionError as ae:
        print("AssertionError:", ae)
        sys.exit(1)
    except Exception as e:
        print("Error:", e)
        sys.exit(2)
    sys.exit(0)
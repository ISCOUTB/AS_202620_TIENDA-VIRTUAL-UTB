import requests
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30


def test_health_ready_and_metrics():
    try:
        # GET /health
        resp_health = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Request to /health failed: {e}")
    assert resp_health.status_code == 200, f"/health returned {resp_health.status_code}"

    try:
        # GET /health/ready
        resp_ready = requests.get(f"{BASE_URL}/health/ready", timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Request to /health/ready failed: {e}")
    assert resp_ready.status_code == 200, f"/health/ready returned {resp_ready.status_code}"

    try:
        # GET /metrics
        resp_metrics = requests.get(f"{BASE_URL}/metrics", timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"Request to /metrics failed: {e}")
    assert resp_metrics.status_code == 200, f"/metrics returned {resp_metrics.status_code}"

    # Validate content-type is JSON-ish
    content_type = resp_metrics.headers.get("Content-Type", "")
    assert "application/json" in content_type or "json" in content_type.lower(), (
        f"/metrics Content-Type not JSON-like: {content_type}"
    )

    # Parse JSON
    try:
        metrics = resp_metrics.json()
    except ValueError as e:
        raise AssertionError(f"/metrics did not return valid JSON: {e}")

    # uptime_segundos present and numeric (int/float >= 0)
    assert "uptime_segundos" in metrics, "metrics missing 'uptime_segundos'"
    uptime = metrics["uptime_segundos"]
    assert isinstance(uptime, (int, float)), f"uptime_segundos is not numeric: {type(uptime)}"
    assert uptime >= 0, f"uptime_segundos is negative: {uptime}"

    # rutas present and object/dict
    assert "rutas" in metrics, "metrics missing 'rutas'"
    rutas = metrics["rutas"]
    assert isinstance(rutas, dict), f"'rutas' is not an object/dict: {type(rutas)}"

    # Helper to find route entry by case-insensitive key matching
    def find_route_entry(rutas_dict, expected_key):
        lower_map = {k.lower(): k for k in rutas_dict.keys()}
        return rutas_dict.get(lower_map.get(expected_key.lower()))

    expected_routes = ["get /health", "get /health/ready", "get /metrics"]

    for expected in expected_routes:
        entry = find_route_entry(rutas, expected)
        assert entry is not None, f"metrics.rutas missing entry for '{expected}'"
        # Each entry must have peticiones, errores_5xx, latencia_ms
        for field in ("peticiones", "errores_5xx", "latencia_ms"):
            assert field in entry, f"metrics.rutas['{expected}'] missing field '{field}'"
            val = entry[field]
            # peticiones and errores_5xx expected integers (>=0), latencia_ms numeric (>=0) or dict of numerics
            if field in ("peticiones", "errores_5xx"):
                assert isinstance(val, int), (
                    f"metrics.rutas['{expected}']['{field}'] expected int, got {type(val)}"
                )
                assert val >= 0, f"metrics.rutas['{expected}']['{field}'] is negative: {val}"
            else:  # latencia_ms
                if isinstance(val, (int, float)):
                    assert val >= 0, f"metrics.rutas['{expected}']['{field}'] is negative: {val}"
                elif isinstance(val, dict):
                    # Accept a dict with numeric latency breakdowns (e.g., min/max/avg/p50/p95)
                    assert len(val) > 0, f"metrics.rutas['{expected}']['{field}'] is an empty dict"
                    for subk, subv in val.items():
                        assert isinstance(subv, (int, float)), (
                            f"metrics.rutas['{expected}']['{field}']['{subk}'] expected numeric, got {type(subv)}"
                        )
                        assert subv >= 0, (
                            f"metrics.rutas['{expected}']['{field}']['{subk}'] is negative: {subv}"
                        )
                else:
                    assert False, (
                        f"metrics.rutas['{expected}']['{field}'] expected numeric or dict, got {type(val)}"
                    )

    print("TC034 health_ready_and_metrics: PASSED")


if __name__ == "__main__":
    try:
        test_health_ready_and_metrics()
    except AssertionError as e:
        print(f"TC034 health_ready_and_metrics: FAILED - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"TC034 health_ready_and_metrics: ERROR - {e}")
        sys.exit(2)
    sys.exit(0)
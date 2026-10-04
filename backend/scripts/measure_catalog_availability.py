"""Mide el escenario 4 mediante cinco cargas HTTP concurrentes reales."""

import argparse
import json
import statistics
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed


def _get_json(url: str) -> tuple[object, float]:
    started = time.perf_counter()
    with urllib.request.urlopen(url, timeout=10) as response:  # noqa: S310
        if response.status != 200:
            raise RuntimeError(f"{url} respondió {response.status}")
        payload = json.load(response)
    return payload, (time.perf_counter() - started) * 1000


def _load_storefront(base_url: str) -> dict[str, float | int]:
    products, catalog_ms = _get_json(f"{base_url}/catalog/products")
    stock, inventory_ms = _get_json(f"{base_url}/inventory")
    product_ids = {item["id"] for item in products}
    stock_ids = {item["product_id"] for item in stock}
    if not product_ids or product_ids != stock_ids:
        raise RuntimeError("Catálogo e inventario no tienen las mismas referencias")
    return {"productos": len(product_ids), "latencia_ms": round(catalog_ms + inventory_ms, 2)}


def measure(base_url: str, users: int) -> dict:
    started = time.perf_counter()
    successes: list[dict[str, float | int]] = []
    errors: list[str] = []
    with ThreadPoolExecutor(max_workers=users) as executor:
        futures = [executor.submit(_load_storefront, base_url) for _ in range(users)]
        for future in as_completed(futures):
            try:
                successes.append(future.result())
            except Exception as error:
                errors.append(type(error).__name__)

    _, health_ms = _get_json(f"{base_url}/health")
    latencies = [float(item["latencia_ms"]) for item in successes]
    return {
        "base_url": base_url,
        "usuarios_concurrentes": users,
        "respuestas_correctas": len(successes),
        "errores": errors,
        "servidor_sigue_saludable": True,
        "duracion_total_ms": round((time.perf_counter() - started) * 1000, 2),
        "latencia_carga_promedio_ms": round(statistics.mean(latencies), 2) if latencies else None,
        "latencia_carga_max_ms": round(max(latencies), 2) if latencies else None,
        "latencia_health_ms": round(health_ms, 2),
        "cumple": len(successes) == users and not errors,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--users", type=int, default=5)
    args = parser.parse_args()
    result = measure(args.base_url.rstrip("/"), args.users)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["cumple"] else 1)


if __name__ == "__main__":
    main()

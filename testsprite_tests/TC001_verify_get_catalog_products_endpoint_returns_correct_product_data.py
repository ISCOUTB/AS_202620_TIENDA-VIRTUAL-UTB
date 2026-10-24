import requests
import sys

BASE_URL = "http://localhost:8000"
TIMEOUT = 30


def _extract_field(obj, candidates):
    for k in candidates:
        if k in obj:
            return obj[k], k
    return None, None


def test_get_catalog_products_returns_correct_product_data():
    try:
        resp = requests.get(f"{BASE_URL}/catalog/products", timeout=TIMEOUT)
    except requests.RequestException as e:
        raise AssertionError(f"Request to /catalog/products failed: {e}")

    assert resp.status_code == 200, f"/catalog/products returned {resp.status_code}: {resp.text}"
    try:
        products = resp.json()
    except ValueError:
        raise AssertionError("/catalog/products did not return valid JSON")

    assert isinstance(products, list), f"/catalog/products should return a list, got {type(products)}"
    assert len(products) > 0, "/catalog/products returned an empty list; expected demo data"

    # Try to fetch inventory to cross-check stock levels (optional, but helpful)
    inventory_by_product = {}
    try:
        inv_resp = requests.get(f"{BASE_URL}/inventory", timeout=TIMEOUT)
        if inv_resp.status_code == 200:
            try:
                inventory = inv_resp.json()
                if isinstance(inventory, list):
                    for item in inventory:
                        # common inventory field names
                        pid, _ = _extract_field(item, ["product_id", "producto_id", "id", "producto"])
                        qty, _ = _extract_field(item, ["cantidad", "cantidad_actual", "cantidad_disponible", "quantity"])
                        try:
                            if pid is not None:
                                pid_int = int(pid)
                                if qty is not None:
                                    inventory_by_product[pid_int] = int(qty)
                        except Exception:
                            # skip if conversion fails
                            continue
            except ValueError:
                # ignore parsing errors for inventory
                pass
    except requests.RequestException:
        # inventory endpoint may be temporarily unreachable; continue with product-only checks
        pass

    # Define candidate field names
    id_keys = ["id", "product_id", "producto_id"]
    name_keys = ["nombre", "name", "titulo", "producto"]
    price_keys = ["precio_centavos", "price_centavos", "precio", "price"]
    reference_keys = [
        "precio_referencia_centavos",
        "precio_referencia",
        "precio_referencia_pesos",
        "referencia_precio_centavos",
        "referencia",
        "precio_anterior_centavos",
        "precio_antes_centavos",
    ]
    stock_label_keys = ["stock_estado", "stock_label", "disponible", "agotado", "cantidad", "stock"]

    # Validate several products (limit to first 50 to avoid huge loops)
    for idx, prod in enumerate(products[:50]):
        assert isinstance(prod, dict), f"Each product must be an object, item {idx} is {type(prod)}"

        pid, pid_key = _extract_field(prod, id_keys)
        assert pid is not None, f"Product at index {idx} missing id (tried {id_keys})"
        try:
            pid_int = int(pid)
        except Exception:
            raise AssertionError(f"Product id value is not an integer-convertible for product index {idx}: {pid}")

        name, name_key = _extract_field(prod, name_keys)
        assert name is not None and isinstance(name, str) and name.strip() != "", (
            f"Product {pid_int} missing a valid name (tried {name_keys})"
        )

        price, price_key = _extract_field(prod, price_keys)
        assert price is not None, f"Product {pid_int} missing a price field (tried {price_keys})"
        try:
            price_int = int(price)
        except Exception:
            raise AssertionError(f"Product {pid_int} price is not integer-convertible: {price}")
        assert price_int >= 0, f"Product {pid_int} has negative precio_centavos: {price_int}"

        # Reference price is optional but if present should be integer >= 0
        ref_price, ref_key = _extract_field(prod, reference_keys)
        if ref_price is not None:
            try:
                ref_int = int(ref_price)
            except Exception:
                raise AssertionError(f"Product {pid_int} reference price {ref_price} is not integer-convertible")
            assert ref_int >= 0, f"Product {pid_int} has negative reference price: {ref_int}"

        # Cross-check inventory if available
        if pid_int in inventory_by_product:
            inv_qty = inventory_by_product[pid_int]
            assert isinstance(inv_qty, int) and inv_qty >= 0, f"Inventory for product {pid_int} must be non-negative int"
            # If product exposes a cantidad or stock field, verify consistency
            prod_qty, prod_qty_key = _extract_field(prod, ["cantidad", "stock", "available", "disponible", "existencias"])
            if prod_qty is not None:
                try:
                    prod_qty_int = int(prod_qty)
                    assert prod_qty_int == inv_qty, (
                        f"Product {pid_int} reported cantidad {prod_qty_int} but inventory shows {inv_qty}"
                    )
                except Exception:
                    # If conversion fails, still report a meaningful error
                    raise AssertionError(f"Product {pid_int} cantidad field {prod_qty} is not integer-convertible")

        # If product contains explicit stock label, ensure it is a non-empty string
        stock_label, stock_label_key = _extract_field(prod, stock_label_keys)
        if stock_label is not None:
            # Accept both numeric quantities and descriptive labels
            if isinstance(stock_label, str):
                assert stock_label.strip() != "", f"Product {pid_int} has empty stock label"
            else:
                # if numeric, ensure non-negative
                try:
                    sval = int(stock_label)
                    assert sval >= 0, f"Product {pid_int} has negative stock label value {sval}"
                except Exception:
                    # allow other types but ensure not None
                    pass

    print("TC001: /catalog/products returned a valid products list with prices and (where available) consistent stock and reference pricing.")


if __name__ == "__main__":
    try:
        test_get_catalog_products_returns_correct_product_data()
    except AssertionError as e:
        print(f"TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}")
        sys.exit(2)
    print("TEST PASSED")
    sys.exit(0)
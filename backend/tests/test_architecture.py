"""Comprobaciones estáticas de los límites del monolito modular."""

import ast
from importlib import import_module
from importlib.util import resolve_name
from pathlib import Path

MODULES = ("identity", "catalog", "inventory", "orders")
MODULES_ROOT = Path(__file__).resolve().parents[1] / "app" / "modules"


def test_adr_module_packages_exist() -> None:
    packages = tuple(f"app.modules.{name}" for name in MODULES) + ("app.shared",)

    for package in packages:
        assert import_module(package) is not None


def _imports(tree: ast.AST, package: str) -> list[tuple[str, tuple[str, ...]]]:
    names: list[tuple[str, tuple[str, ...]]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.extend((alias.name, ()) for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                relative = "." * node.level + (node.module or "")
                names.append((resolve_name(relative, package), tuple(alias.name for alias in node.names)))
            elif node.module:
                names.append((node.module, tuple(alias.name for alias in node.names)))
    return names


def test_modules_do_not_import_other_modules_internals() -> None:
    """Permite APIs de paquete y contratos `public`; rechaza detalles internos.

    Es análisis AST: no cubre imports dinámicos, SQL textual ni propiedad de
    columnas. Esa última regla se prueba por separado en test_inventory.py.
    """
    violations: list[str] = []
    for owner in MODULES:
        for source in (MODULES_ROOT / owner).rglob("*.py"):
            tree = ast.parse(source.read_text(encoding="utf-8"), filename=str(source))
            for imported, imported_names in _imports(tree, f"app.modules.{owner}"):
                prefix = "app.modules."
                if not imported.startswith(prefix):
                    continue
                parts = imported.split(".")
                target = parts[2] if len(parts) > 2 else ""
                is_public_contract = (
                    len(parts) == 3
                    and bool(imported_names)
                    and set(imported_names) <= {"initialize", "router"}
                ) or (len(parts) == 4 and parts[3] == "public")
                if target and target != owner and not is_public_contract:
                    violations.append(f"{source.relative_to(MODULES_ROOT)} -> {imported}")

    assert not violations, "Imports cruzados de internos:\n" + "\n".join(violations)

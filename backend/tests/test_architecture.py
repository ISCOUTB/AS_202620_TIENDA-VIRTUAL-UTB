from importlib import import_module


def test_adr_module_packages_exist() -> None:
    packages = (
        "app.modules.identity",
        "app.modules.catalog",
        "app.modules.inventory",
        "app.modules.orders",
        "app.shared",
    )

    for package in packages:
        assert import_module(package) is not None

"""Exporta a JSON las tablas del esquema anterior a Alembic.

Debe ejecutarse ANTES de `alembic upgrade head`: la migración 0001 elimina
`catalog_products` e `inventory_stock`. Solo lee (no modifica la base), usa la
misma resolución de conexión que la aplicación (credenciales del rol dueño si
existen) y tolera que las tablas ya no existan. Cada ejecución escribe un
archivo nuevo con marca de tiempo; `datos_legado/` está fuera de Git.

Uso, desde `backend/`:

    python scripts/exportar_datos_legado.py
    python scripts/exportar_datos_legado.py --salida -          # a stdout

Lee las tablas por reflexión, no con los modelos nuevos.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import MetaData, Table, create_engine, inspect, select

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.shared.database import resolve_database_url  # noqa: E402  (path preparado arriba)

TABLAS_LEGADO = ("catalog_products", "inventory_stock")


def exportar() -> dict:
    """Devuelve el contenido de las tablas antiguas que existan."""
    engine = create_engine(resolve_database_url(migraciones=True))
    resultado: dict = {
        "formato": "tienda-utb-legado/1",
        "exportado_en": datetime.now(timezone.utc).isoformat(),
        "tablas": {},
    }
    try:
        with engine.connect() as conexion:
            inspector = inspect(conexion)
            for nombre in TABLAS_LEGADO:
                if not inspector.has_table(nombre):
                    resultado["tablas"][nombre] = {"existe": False, "columnas": [], "filas": []}
                    continue
                tabla = Table(nombre, MetaData(), autoload_with=conexion)
                filas = [dict(fila) for fila in conexion.execute(select(tabla)).mappings()]
                resultado["tablas"][nombre] = {
                    "existe": True,
                    "columnas": [columna.name for columna in tabla.columns],
                    "filas": filas,
                }
    finally:
        engine.dispose()
    return resultado


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--salida",
        help="Archivo de salida, o '-' para stdout. Por defecto datos_legado/legado_<marca>.json.",
    )
    args = parser.parse_args()

    datos = exportar()
    if args.salida == "-":
        # ASCII puro: sobrevive a las tuberías de PowerShell sin perder tildes.
        print(json.dumps(datos, ensure_ascii=True, indent=2, default=str))
        return

    marca = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    destino = Path(args.salida) if args.salida else BACKEND / "datos_legado" / f"legado_{marca}.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        json.dumps(datos, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8"
    )
    resumen = {nombre: len(tabla["filas"]) for nombre, tabla in datos["tablas"].items()}
    print(f"Exportado {destino} {resumen}")


if __name__ == "__main__":
    main()

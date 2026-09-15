"""Script de desarrollo que exporta el contrato OpenAPI real de FastAPI.

Genera `docs/openapi/openapi.generado.json` a partir de la aplicación en
ejecución, de modo que el contrato generado quede versionado junto con el
diseño anticipado de `tienda-virtual.yaml`.

Uso:

    python scripts/exportar_openapi.py

Requiere estar en el directorio `backend` y tener el ambiente instalado.
"""

import json
from pathlib import Path

from app.main import app

RUTA_SALIDA = Path(__file__).resolve().parents[1] / "docs" / "openapi" / "openapi.generado.json"


def main() -> None:
    contrato = app.openapi()
    RUTA_SALIDA.parent.mkdir(parents=True, exist_ok=True)
    RUTA_SALIDA.write_text(json.dumps(contrato, ensure_ascii=False, indent=2) + "\n")
    print(f"Contrato exportado en {RUTA_SALIDA}")


if __name__ == "__main__":
    main()
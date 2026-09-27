"""Exporta el contrato para revisión; nunca se ejecuta automáticamente en CI."""

import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.main import app

if __name__ == "__main__":
    target = BACKEND.parent / "docs" / "api" / "openapi.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Contrato exportado: {target}")

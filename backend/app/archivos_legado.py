"""Lectura de exportaciones desde una carpeta administrada, nunca desde una ruta CLI."""

import json
import re
from pathlib import Path
from typing import Any


DIRECTORIO_LEGADO = Path(__file__).resolve().parents[1] / "datos_legado"


def leer_json_legado(nombre: str) -> dict[str, Any]:
    """Acepta solo un nombre JSON simple dentro de backend/datos_legado.

    La carpeta y sus archivos deben ser administrados por el operador, sin
    permisos de escritura para usuarios externos. No se permiten symlinks.
    """
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*\.json", nombre) or ".." in nombre:
        raise ValueError("Indica solo el nombre del archivo .json, sin rutas ni '..'.")

    if DIRECTORIO_LEGADO.is_symlink():
        raise ValueError("La carpeta datos_legado no puede ser un enlace simbólico.")
    directorio = DIRECTORIO_LEGADO.resolve(strict=True)
    candidato = directorio / nombre
    if candidato.is_symlink():
        raise ValueError("El archivo de importación no puede ser un enlace simbólico.")
    archivo = candidato.resolve(strict=True)
    if archivo.parent != directorio or not archivo.is_file():
        raise ValueError("La importación debe ser un archivo dentro de datos_legado.")

    # utf-8-sig tolera el BOM que añade PowerShell 5 al exportar.
    datos = json.loads(archivo.read_text(encoding="utf-8-sig"))
    if not isinstance(datos, dict):
        raise ValueError("La exportación JSON debe contener un objeto en su raíz.")
    return datos

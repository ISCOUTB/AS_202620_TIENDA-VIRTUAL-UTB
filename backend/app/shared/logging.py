"""Logging estructurado en JSON para todos los logs del proceso.

Una línea JSON por evento permite consultar los logs en la plataforma de
despliegue (que captura stdout del contenedor) sin parsear texto libre, y
deja los campos estables para filtrar por ruta, estado o latencia.
"""

import json
import logging
from datetime import datetime, timezone

# Atributos que todo LogRecord trae de fábrica; el resto son campos extra
# añadidos vía `extra={...}` y se serializan en el JSON.
_ATRIBUTOS_ESTANDAR = frozenset(
    logging.LogRecord("", 0, "", 0, "", (), None).__dict__
)


class JsonFormatter(logging.Formatter):
    """Serializa cada registro como una línea JSON con campos estables."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        for clave, valor in record.__dict__.items():
            if clave not in _ATRIBUTOS_ESTANDAR:
                payload[clave] = valor
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging(level: str = "INFO") -> None:
    """Instala el formateador JSON en los handlers ya existentes.

    Se invoca desde el lifespan: para entonces uvicorn ya configuró sus
    loggers (`uvicorn`, `uvicorn.access`, `uvicorn.error`), así que basta con
    reemplazar el formatter de sus handlers en lugar de reconfigurar el árbol
    de logging completo. Bajo TestClient (sin uvicorn) se crea un handler en
    la raíz para que los tests y scripts locales también emitan JSON.
    """
    formatter = JsonFormatter()
    raiz = logging.getLogger()
    if not raiz.handlers:
        raiz.addHandler(logging.StreamHandler())
    raiz.setLevel(level)
    for nombre in ("", "uvicorn", "uvicorn.access", "uvicorn.error"):
        for handler in logging.getLogger(nombre).handlers:
            handler.setFormatter(formatter)

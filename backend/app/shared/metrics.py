"""Observabilidad HTTP: log JSON por petición y métricas consultables.

El middleware registra cada petición con método, ruta, estado y latencia, y
alimenta un registro en memoria que `GET /metrics` expone. La métrica está
ligada al escenario 4 de `docs/escenarios-calidad.md` (disponibilidad: ~5
consultas concurrentes al catálogo, todas con respuesta correcta): conteo de
peticiones, errores 5xx y percentiles de latencia por ruta.

Las muestras viven en el proceso (deque acotado): una métrica consultable
suficiente para el alcance académico, sin Prometheus ni servicio externo.
"""

import logging
import time
from collections import deque
from dataclasses import dataclass, field

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("tienda.http")

_CAPACIDAD_MUESTRAS = 500
_inicio = time.monotonic()


@dataclass
class _Ruta:
    total: int = 0
    errores_5xx: int = 0
    duraciones_ms: deque = field(default_factory=lambda: deque(maxlen=_CAPACIDAD_MUESTRAS))


_registro: dict[str, _Ruta] = {}


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """Mide y registra cada petición HTTP con su latencia y estado."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        inicio = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duracion = round((time.perf_counter() - inicio) * 1000, 2)
            _observar(request, 500, duracion)
            logger.exception("http_request", extra=_campos(request, 500, duracion))
            raise
        duracion = round((time.perf_counter() - inicio) * 1000, 2)
        _observar(request, response.status_code, duracion)
        logger.info("http_request", extra=_campos(request, response.status_code, duracion))
        return response


def _etiqueta_ruta(request: Request) -> str:
    """Etiqueta por plantilla de ruta (/orders/{id}), no por URL concreta."""
    ruta = request.scope.get("route")
    return getattr(ruta, "path", request.url.path)


def _campos(request: Request, status: int, duracion_ms: float) -> dict:
    return {
        "method": request.method,
        "path": request.url.path,
        "route": _etiqueta_ruta(request),
        "status_code": status,
        "duration_ms": duracion_ms,
    }


def _observar(request: Request, status: int, duracion_ms: float) -> None:
    clave = f"{request.method} {_etiqueta_ruta(request)}"
    ruta = _registro.setdefault(clave, _Ruta())
    ruta.total += 1
    if status >= 500:
        ruta.errores_5xx += 1
    ruta.duraciones_ms.append(duracion_ms)


def _percentil(muestras: list[float], p: float) -> float:
    if not muestras:
        return 0.0
    ordenadas = sorted(muestras)
    indice = min(round(p * (len(ordenadas) - 1)), len(ordenadas) - 1)
    return ordenadas[indice]


def snapshot() -> dict:
    """Resumen consultable: totales, errores 5xx y latencias por ruta."""
    por_ruta = {}
    for clave, ruta in _registro.items():
        duraciones = list(ruta.duraciones_ms)
        por_ruta[clave] = {
            "peticiones": ruta.total,
            "errores_5xx": ruta.errores_5xx,
            "latencia_ms": {
                "promedio": round(sum(duraciones) / len(duraciones), 2)
                if duraciones
                else 0.0,
                "p50": _percentil(duraciones, 0.50),
                "p95": _percentil(duraciones, 0.95),
                "max": max(duraciones) if duraciones else 0.0,
            },
        }
    return {
        "uptime_segundos": round(time.monotonic() - _inicio, 1),
        "escenario_asociado": (
            "disponibilidad — ~5 consultas concurrentes al catálogo "
            "(docs/escenarios-calidad.md, escenario 4)"
        ),
        "rutas": por_ruta,
    }

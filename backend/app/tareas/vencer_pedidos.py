"""Compensación de la saga: `python -m app.tareas.vencer_pedidos`.

Cancela los pedidos `pendiente_pago` con más de 24 horas y repone su stock
(F-01, docs/idempotencia-saga-s11.md). Es idempotente y segura en paralelo
(`SKIP LOCKED`): se programa como Schedule de Dokploy cada 15 minutos sobre
el servicio `backend` (docs/despliegue-dokploy.md).

Corre con la conexión de la API (rol sujeto a RLS) y el principal del
sistema (`sistema=True`, sin usuario; ADR 0017), de modo que historial y
movimientos quedan con `usuario_id` NULL.
"""

import logging

from app.modules.orders.public import vencer_pendientes
from app.shared.database import SessionLocal
from app.shared.logging import configure_logging
from app.shared.seguridad import CLAVE_CONTEXTO, ContextoSeguridad

SISTEMA = ContextoSeguridad(sistema=True)

logger = logging.getLogger("tienda.tareas")


def main() -> int:
    configure_logging()
    with SessionLocal(info={CLAVE_CONTEXTO: SISTEMA}) as session, session.begin():
        cancelados = vencer_pendientes(session)
    logger.info("pedidos_vencidos", extra={"cancelados": cancelados})
    return cancelados


if __name__ == "__main__":
    main()

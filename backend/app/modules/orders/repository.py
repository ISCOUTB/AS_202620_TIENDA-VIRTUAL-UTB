"""Acceso a datos del módulo de pedidos."""

import uuid
from collections import defaultdict
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.orders.models import Pedido, PedidoHistorial, PedidoLinea


def por_llave(session: Session, usuario_id: int, clave: uuid.UUID) -> Sequence[Pedido]:
    """Pedidos hermanos creados con la misma `Idempotency-Key` por la cuenta."""
    return session.scalars(
        select(Pedido)
        .where(Pedido.usuario_id == usuario_id, Pedido.clave_idempotencia == clave)
        .order_by(Pedido.id)
    ).all()


def obtener(session: Session, pedido_id: int) -> Pedido | None:
    return session.get(Pedido, pedido_id)


def listar(
    session: Session,
    *,
    usuario_id: int | None = None,
    tienda_id: int | None = None,
    estado: str | None = None,
) -> Sequence[Pedido]:
    """Pedidos más recientes primero, filtrados por cuenta, tienda o estado."""
    consulta = select(Pedido).order_by(Pedido.creado_en.desc(), Pedido.id.desc())
    if usuario_id is not None:
        consulta = consulta.where(Pedido.usuario_id == usuario_id)
    if tienda_id is not None:
        consulta = consulta.where(Pedido.tienda_id == tienda_id)
    if estado is not None:
        consulta = consulta.where(Pedido.estado == estado)
    return session.scalars(consulta).all()


def lineas_de(session: Session, pedido_ids: list[int]) -> dict[int, list[PedidoLinea]]:
    lineas: dict[int, list[PedidoLinea]] = defaultdict(list)
    for linea in session.scalars(
        select(PedidoLinea)
        .where(PedidoLinea.pedido_id.in_(pedido_ids))
        .order_by(PedidoLinea.pedido_id, PedidoLinea.linea)
    ):
        lineas[linea.pedido_id].append(linea)
    return lineas


def pendientes_vencidos(session: Session, limite: datetime) -> Sequence[Pedido]:
    """Pedidos sin pago creados antes de `limite`.

    `SKIP LOCKED`: si dos ejecuciones del vencimiento coinciden, cada pedido lo
    procesa una sola.
    """
    return session.scalars(
        select(Pedido)
        .where(Pedido.estado == "pendiente_pago", Pedido.creado_en < limite)
        .order_by(Pedido.id)
        .with_for_update(skip_locked=True)
    ).all()


def registrar_historial(
    session: Session,
    pedido: Pedido,
    *,
    anterior: str | None,
    usuario_id: int | None,
    comentario: str | None = None,
) -> None:
    session.add(
        PedidoHistorial(
            pedido_id=pedido.id,
            estado_anterior=anterior,
            estado_nuevo=pedido.estado,
            usuario_id=usuario_id,
            comentario=comentario,
        )
    )

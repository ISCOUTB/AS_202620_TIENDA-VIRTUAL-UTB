"""Tablas propiedad del módulo de pedidos."""

import uuid
from datetime import datetime, time

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    SmallInteger,
    String,
    Time,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base

# Única fuente de los estados del pedido: los CHECK se construyen desde aquí.
ESTADOS_PEDIDO = (
    "pendiente_pago",
    "pagado",
    "en_preparacion",
    "listo",
    "entregado",
    "cancelado",
)
ESTADO_INICIAL = "pendiente_pago"


def _en_estados(columna: str) -> str:
    return f"{columna} IN ({', '.join(repr(estado) for estado in ESTADOS_PEDIDO)})"


class Pedido(Base):
    """Un pedido pertenece a una sola tienda: el checkout divide el carrito."""

    __tablename__ = "pedidos"
    __table_args__ = (
        CheckConstraint(_en_estados("estado"), name="estado_valido"),
        CheckConstraint("total_centavos >= 0", name="total_no_negativo"),
        UniqueConstraint("usuario_id", "clave_idempotencia", "tienda_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    # Referencias lógicas a Identidad y Catálogo.
    usuario_id: Mapped[int] = mapped_column(Integer, nullable=False)
    tienda_id: Mapped[int] = mapped_column(Integer, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=text(f"'{ESTADO_INICIAL}'")
    )
    total_centavos: Mapped[int] = mapped_column(BigInteger, nullable=False)
    hora_recogida: Mapped[time | None] = mapped_column(Time, nullable=True)
    clave_idempotencia: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __mapper_args__ = {"version_id_col": version}


class PedidoLinea(Base):
    __tablename__ = "pedido_lineas"
    __table_args__ = (
        CheckConstraint("linea >= 1", name="linea_positiva"),
        CheckConstraint("precio_unitario_centavos >= 0", name="precio_no_negativo"),
        CheckConstraint("cantidad >= 1", name="cantidad_positiva"),
        Index("ix_pedido_lineas_producto_id", "producto_id"),
    )

    pedido_id: Mapped[int] = mapped_column(
        ForeignKey("pedidos.id", ondelete="CASCADE"), primary_key=True
    )
    linea: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=False)
    # Referencia lógica y copia del producto al momento de la compra.
    producto_id: Mapped[int] = mapped_column(Integer, nullable=False)
    producto_nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    precio_unitario_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    subtotal_centavos: Mapped[int] = mapped_column(
        BigInteger,
        Computed("CAST(precio_unitario_centavos AS bigint) * cantidad", persisted=True),
    )
    notas: Mapped[str | None] = mapped_column(String(140), nullable=True)


class PedidoHistorial(Base):
    """Trazabilidad de cada cambio de estado; base de las métricas operativas."""

    __tablename__ = "pedido_historial"
    __table_args__ = (
        CheckConstraint(_en_estados("estado_anterior"), name="estado_anterior_valido"),
        CheckConstraint(_en_estados("estado_nuevo"), name="estado_nuevo_valido"),
        CheckConstraint(
            "estado_nuevo <> 'cancelado' OR comentario IS NOT NULL",
            name="cancelacion_con_comentario",
        ),
        Index("ix_pedido_historial_pedido_id_creado_en", "pedido_id", "creado_en"),
        Index("ix_pedido_historial_estado_nuevo_creado_en", "estado_nuevo", "creado_en"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    pedido_id: Mapped[int] = mapped_column(
        ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False
    )
    estado_anterior: Mapped[str | None] = mapped_column(String(16), nullable=True)
    estado_nuevo: Mapped[str] = mapped_column(String(16), nullable=False)
    # Referencia lógica a Identidad; NULL = sistema.
    usuario_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comentario: Mapped[str | None] = mapped_column(String(200), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


Index(
    "ix_pedidos_usuario_id_creado_en",
    Pedido.usuario_id,
    Pedido.creado_en.desc(),
)
Index(
    "ix_pedidos_tienda_id_estado_creado_en",
    Pedido.tienda_id,
    Pedido.estado,
    Pedido.creado_en.desc(),
)

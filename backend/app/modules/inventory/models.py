"""Tablas propiedad del módulo de inventario."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base

# Única fuente de los tipos de movimiento: el CHECK se construye desde aquí.
TIPOS_MOVIMIENTO = ("inicial", "ajuste", "venta", "devolucion")


def _valores_sql(valores: tuple[str, ...]) -> str:
    return ", ".join(f"'{valor}'" for valor in valores)


class Existencia(Base):
    __tablename__ = "existencias"
    __table_args__ = (CheckConstraint("cantidad >= 0", name="cantidad_no_negativa"),)

    # Referencia lógica a `productos` de Catálogo: sin FK ni relación ORM (ADR 0008).
    producto_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    # Bloqueo optimista (F-03): SQLAlchemy incrementa y verifica la versión.
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __mapper_args__ = {"version_id_col": version}


class MovimientoExistencias(Base):
    __tablename__ = "movimientos_existencias"
    __table_args__ = (
        CheckConstraint(f"tipo IN ({_valores_sql(TIPOS_MOVIMIENTO)})", name="tipo_valido"),
        CheckConstraint("tipo = 'inicial' OR cambio <> 0", name="cambio_no_nulo"),
        CheckConstraint("cantidad_resultante >= 0", name="resultante_no_negativa"),
        CheckConstraint("tipo <> 'ajuste' OR motivo IS NOT NULL", name="ajuste_con_motivo"),
        Index(
            "ix_movimientos_existencias_pedido_id",
            "pedido_id",
            # Con paréntesis, como PostgreSQL devuelve el predicado al reflejarlo.
            postgresql_where=text("(pedido_id IS NOT NULL)"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    producto_id: Mapped[int] = mapped_column(
        ForeignKey("existencias.producto_id", ondelete="RESTRICT"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(12), nullable=False)
    cambio: Mapped[int] = mapped_column(Integer, nullable=False)
    cantidad_resultante: Mapped[int] = mapped_column(Integer, nullable=False)
    motivo: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Referencias lógicas a Pedidos e Identidad; usuario NULL = sistema.
    pedido_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    usuario_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


Index(
    "ix_movimientos_existencias_producto_id_creado_en",
    MovimientoExistencias.producto_id,
    MovimientoExistencias.creado_en.desc(),
)

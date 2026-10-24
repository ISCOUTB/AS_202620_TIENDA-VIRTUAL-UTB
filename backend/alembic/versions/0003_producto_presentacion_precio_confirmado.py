"""Presentación y precio confirmado de los productos (docs/api/tiendas-catalogo.md).

- `presentacion`: "Grande", "Personal", "Entero"... distingue variantes de un
  mismo producto en la vitrina.
- `precio_confirmado`: false = precio de referencia que la tienda aún no
  confirmó; el frontend lo marca y no indexa la tienda. Reemplaza el booleano
  `esMuestra` que vivía en `frontend/lib/catalogo.ts`.

Los GRANT de la 0002 son por tabla, así que el rol de aplicación ya alcanza
las columnas nuevas y las políticas RLS de `productos` no cambian.

Revision ID: 0003_producto_presentacion
Revises: 0002_politicas_rls
Create Date: 2026-10-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_producto_presentacion"
down_revision: str | None = "0002_politicas_rls"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("productos", sa.Column("presentacion", sa.String(40), nullable=True))
    op.add_column(
        "productos",
        sa.Column(
            "precio_confirmado", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
    )


def downgrade() -> None:
    op.drop_column("productos", "precio_confirmado")
    op.drop_column("productos", "presentacion")

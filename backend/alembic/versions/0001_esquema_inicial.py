"""Esquema inicial de los cuatro módulos (ADR 0013).

Sustituye a `Base.metadata.create_all` y a la migración SQL manual
`0001_move_stock_to_inventory.sql`. Elimina las tablas del esquema anterior
(`catalog_products`, `inventory_stock`): exportar antes sus datos con
`scripts/exportar_datos_legado.py`.

Escrita a mano: los nombres de restricciones siguen la `naming_convention` de
`Base.metadata` y se fijan con `op.f()`. Los CHECK repiten literalmente los
valores de `ESTADOS_PEDIDO` y `TIPOS_MOVIMIENTO`: una migración es una foto
del esquema y no importa código de la aplicación.

Revision ID: 0001_esquema_inicial
Revises:
Create Date: 2026-10-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_esquema_inicial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ESTADOS = (
    "'pendiente_pago', 'pagado', 'en_preparacion', 'listo', 'entregado', 'cancelado'"
)


def _creado_en() -> sa.Column:
    return sa.Column(
        "creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


def _actualizado_en() -> sa.Column:
    return sa.Column(
        "actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


def upgrade() -> None:
    # Esquema anterior a Alembic (create_all): sus datos se exportan antes.
    op.execute("DROP TABLE IF EXISTS inventory_stock")
    op.execute("DROP TABLE IF EXISTS catalog_products")

    # ───────────────────────────── identity ─────────────────────────────
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("correo", sa.String(254), nullable=False),
        sa.Column("hash_contrasena", sa.Text(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        _creado_en(),
        sa.CheckConstraint(
            "char_length(btrim(nombre)) >= 2", name=op.f("ck_usuarios_nombre_minimo")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_usuarios")),
    )
    op.create_index(
        "ix_usuarios_correo_lower",
        "usuarios",
        [sa.text("lower((correo)::text)")],
        unique=True,
    )

    roles = op.create_table(
        "roles",
        sa.Column("codigo", sa.String(32), nullable=False),
        sa.Column("nombre", sa.String(80), nullable=False),
        sa.CheckConstraint("codigo ~ '^[a-z_]+$'", name=op.f("ck_roles_codigo_formato")),
        sa.PrimaryKeyConstraint("codigo", name=op.f("pk_roles")),
    )
    op.bulk_insert(
        roles,
        [
            {"codigo": "comprador", "nombre": "Comprador"},
            {"codigo": "admin_general", "nombre": "Administrador general"},
            {"codigo": "admin_tienda", "nombre": "Administrador de tienda"},
            {"codigo": "responsable_inventario", "nombre": "Responsable de inventario"},
        ],
    )

    op.create_table(
        "usuario_roles",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("rol_codigo", sa.String(32), nullable=False),
        # Referencia lógica a tiendas (Catálogo); NULL = todas las tiendas.
        sa.Column("tienda_id", sa.Integer(), nullable=True),
        sa.Column(
            "asignado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name=op.f("fk_usuario_roles_usuario_id_usuarios"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["rol_codigo"],
            ["roles.codigo"],
            name=op.f("fk_usuario_roles_rol_codigo_roles"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_usuario_roles")),
        sa.UniqueConstraint(
            "usuario_id",
            "rol_codigo",
            "tienda_id",
            name=op.f("uq_usuario_roles_usuario_id_rol_codigo_tienda_id"),
            postgresql_nulls_not_distinct=True,
        ),
    )

    # ───────────────────────────── catalog ──────────────────────────────
    op.create_table(
        "tiendas",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("identificador", sa.String(40), nullable=False),
        sa.Column("nombre", sa.String(80), nullable=False),
        sa.Column("descripcion", sa.String(400), server_default=sa.text("''"), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("activa", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        _creado_en(),
        sa.CheckConstraint(
            "identificador ~ '^[a-z0-9]+(-[a-z0-9]+)*$'",
            name=op.f("ck_tiendas_identificador_formato"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tiendas")),
        sa.UniqueConstraint("identificador", name=op.f("uq_tiendas_identificador")),
    )

    op.create_table(
        "categorias",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("tienda_id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(60), nullable=False),
        sa.ForeignKeyConstraint(
            ["tienda_id"],
            ["tiendas.id"],
            name=op.f("fk_categorias_tienda_id_tiendas"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categorias")),
        sa.UniqueConstraint("tienda_id", "nombre", name=op.f("uq_categorias_tienda_id_nombre")),
        sa.UniqueConstraint("id", "tienda_id", name=op.f("uq_categorias_id_tienda_id")),
    )

    op.create_table(
        "productos",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("tienda_id", sa.Integer(), nullable=False),
        sa.Column("categoria_id", sa.Integer(), nullable=True),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("descripcion", sa.String(400), server_default=sa.text("''"), nullable=False),
        sa.Column("precio_centavos", sa.Integer(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        _creado_en(),
        _actualizado_en(),
        sa.CheckConstraint("btrim(nombre) <> ''", name=op.f("ck_productos_nombre_no_vacio")),
        sa.CheckConstraint("precio_centavos >= 0", name=op.f("ck_productos_precio_no_negativo")),
        sa.ForeignKeyConstraint(
            ["tienda_id"],
            ["tiendas.id"],
            name=op.f("fk_productos_tienda_id_tiendas"),
            ondelete="RESTRICT",
        ),
        # MATCH SIMPLE (por defecto): con categoria_id NULL no se evalúa.
        sa.ForeignKeyConstraint(
            ["categoria_id", "tienda_id"],
            ["categorias.id", "categorias.tienda_id"],
            name=op.f("fk_productos_categoria_id_tienda_id_categorias"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_productos")),
    )
    op.create_index(
        "ix_productos_tienda_id_nombre_lower",
        "productos",
        ["tienda_id", sa.text("lower((nombre)::text)")],
        unique=True,
    )
    op.create_index("ix_productos_categoria_id", "productos", ["categoria_id"])

    op.create_table(
        "imagenes_producto",
        sa.Column("id", sa.Integer(), sa.Identity(always=False), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column(
            "texto_alternativo", sa.String(200), server_default=sa.text("''"), nullable=False
        ),
        sa.Column("orden", sa.SmallInteger(), server_default=sa.text("0"), nullable=False),
        sa.Column("es_principal", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.CheckConstraint("orden >= 0", name=op.f("ck_imagenes_producto_orden_no_negativo")),
        sa.ForeignKeyConstraint(
            ["producto_id"],
            ["productos.id"],
            name=op.f("fk_imagenes_producto_producto_id_productos"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_imagenes_producto")),
    )
    op.create_index(
        "ix_imagenes_producto_principal",
        "imagenes_producto",
        ["producto_id"],
        unique=True,
        postgresql_where=sa.text("es_principal"),
    )
    op.create_index(
        "ix_imagenes_producto_producto_id_orden", "imagenes_producto", ["producto_id", "orden"]
    )

    # ──────────────────────────── inventory ─────────────────────────────
    op.create_table(
        "existencias",
        # Referencia lógica a productos (Catálogo), sin FK (ADR 0008).
        sa.Column("producto_id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("cantidad", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        _actualizado_en(),
        sa.CheckConstraint("cantidad >= 0", name=op.f("ck_existencias_cantidad_no_negativa")),
        sa.PrimaryKeyConstraint("producto_id", name=op.f("pk_existencias")),
    )

    op.create_table(
        "movimientos_existencias",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(12), nullable=False),
        sa.Column("cambio", sa.Integer(), nullable=False),
        sa.Column("cantidad_resultante", sa.Integer(), nullable=False),
        sa.Column("motivo", sa.String(200), nullable=True),
        sa.Column("pedido_id", sa.BigInteger(), nullable=True),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        _creado_en(),
        sa.CheckConstraint(
            "tipo IN ('inicial', 'ajuste', 'venta', 'devolucion')",
            name=op.f("ck_movimientos_existencias_tipo_valido"),
        ),
        sa.CheckConstraint(
            "tipo = 'inicial' OR cambio <> 0",
            name=op.f("ck_movimientos_existencias_cambio_no_nulo"),
        ),
        sa.CheckConstraint(
            "cantidad_resultante >= 0",
            name=op.f("ck_movimientos_existencias_resultante_no_negativa"),
        ),
        sa.CheckConstraint(
            "tipo <> 'ajuste' OR motivo IS NOT NULL",
            name=op.f("ck_movimientos_existencias_ajuste_con_motivo"),
        ),
        sa.ForeignKeyConstraint(
            ["producto_id"],
            ["existencias.producto_id"],
            name=op.f("fk_movimientos_existencias_producto_id_existencias"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_movimientos_existencias")),
    )
    op.create_index(
        "ix_movimientos_existencias_producto_id_creado_en",
        "movimientos_existencias",
        ["producto_id", sa.text("creado_en DESC")],
    )
    op.create_index(
        "ix_movimientos_existencias_pedido_id",
        "movimientos_existencias",
        ["pedido_id"],
        postgresql_where=sa.text("(pedido_id IS NOT NULL)"),
    )

    # ───────────────────────────── orders ───────────────────────────────
    op.create_table(
        "pedidos",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("tienda_id", sa.Integer(), nullable=False),
        sa.Column(
            "estado", sa.String(16), server_default=sa.text("'pendiente_pago'"), nullable=False
        ),
        sa.Column("total_centavos", sa.BigInteger(), nullable=False),
        sa.Column("hora_recogida", sa.Time(), nullable=True),
        sa.Column("clave_idempotencia", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        _creado_en(),
        _actualizado_en(),
        sa.CheckConstraint(f"estado IN ({_ESTADOS})", name=op.f("ck_pedidos_estado_valido")),
        sa.CheckConstraint("total_centavos >= 0", name=op.f("ck_pedidos_total_no_negativo")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pedidos")),
        sa.UniqueConstraint(
            "usuario_id",
            "clave_idempotencia",
            "tienda_id",
            name=op.f("uq_pedidos_usuario_id_clave_idempotencia_tienda_id"),
        ),
    )
    op.create_index(
        "ix_pedidos_usuario_id_creado_en", "pedidos", ["usuario_id", sa.text("creado_en DESC")]
    )
    op.create_index(
        "ix_pedidos_tienda_id_estado_creado_en",
        "pedidos",
        ["tienda_id", "estado", sa.text("creado_en DESC")],
    )

    op.create_table(
        "pedido_lineas",
        sa.Column("pedido_id", sa.BigInteger(), nullable=False),
        sa.Column("linea", sa.SmallInteger(), autoincrement=False, nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("producto_nombre", sa.String(120), nullable=False),
        sa.Column("precio_unitario_centavos", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column(
            "subtotal_centavos",
            sa.BigInteger(),
            sa.Computed("CAST(precio_unitario_centavos AS bigint) * cantidad", persisted=True),
            nullable=False,
        ),
        sa.Column("notas", sa.String(140), nullable=True),
        sa.CheckConstraint("linea >= 1", name=op.f("ck_pedido_lineas_linea_positiva")),
        sa.CheckConstraint(
            "precio_unitario_centavos >= 0", name=op.f("ck_pedido_lineas_precio_no_negativo")
        ),
        sa.CheckConstraint("cantidad >= 1", name=op.f("ck_pedido_lineas_cantidad_positiva")),
        sa.ForeignKeyConstraint(
            ["pedido_id"],
            ["pedidos.id"],
            name=op.f("fk_pedido_lineas_pedido_id_pedidos"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("pedido_id", "linea", name=op.f("pk_pedido_lineas")),
    )
    op.create_index("ix_pedido_lineas_producto_id", "pedido_lineas", ["producto_id"])

    op.create_table(
        "pedido_historial",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("pedido_id", sa.BigInteger(), nullable=False),
        sa.Column("estado_anterior", sa.String(16), nullable=True),
        sa.Column("estado_nuevo", sa.String(16), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("comentario", sa.String(200), nullable=True),
        _creado_en(),
        sa.CheckConstraint(
            f"estado_anterior IN ({_ESTADOS})",
            name=op.f("ck_pedido_historial_estado_anterior_valido"),
        ),
        sa.CheckConstraint(
            f"estado_nuevo IN ({_ESTADOS})", name=op.f("ck_pedido_historial_estado_nuevo_valido")
        ),
        sa.CheckConstraint(
            "estado_nuevo <> 'cancelado' OR comentario IS NOT NULL",
            name=op.f("ck_pedido_historial_cancelacion_con_comentario"),
        ),
        sa.ForeignKeyConstraint(
            ["pedido_id"],
            ["pedidos.id"],
            name=op.f("fk_pedido_historial_pedido_id_pedidos"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pedido_historial")),
    )
    op.create_index(
        "ix_pedido_historial_pedido_id_creado_en", "pedido_historial", ["pedido_id", "creado_en"]
    )
    op.create_index(
        "ix_pedido_historial_estado_nuevo_creado_en",
        "pedido_historial",
        ["estado_nuevo", "creado_en"],
    )


def downgrade() -> None:
    # Orden inverso a las dependencias; las tablas antiguas no se recrean.
    for tabla in (
        "pedido_historial",
        "pedido_lineas",
        "pedidos",
        "movimientos_existencias",
        "existencias",
        "imagenes_producto",
        "productos",
        "categorias",
        "tiendas",
        "usuario_roles",
        "roles",
        "usuarios",
    ):
        op.drop_table(tabla)

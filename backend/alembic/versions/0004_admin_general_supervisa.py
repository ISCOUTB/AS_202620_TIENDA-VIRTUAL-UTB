"""El admin general supervisa; cada tienda la gestiona su admin (ADR 0017).

- `seg_administra_tienda` deja de incluir al `admin_general`: ya no crea ni
  edita productos, no mueve stock ni avanza o cancela pedidos de tienda.
- `seg_supervisa_tienda` (admin general o quien gestiona la tienda) abre las
  **lecturas** que el general necesita para supervisar: productos inactivos,
  pedidos de cualquier tienda y movimientos de inventario.
- `seg_es_sistema` es el principal de las tareas programadas
  (`app.tareas.vencer_pedidos`), que antes se hacían pasar por admin general.
  Administra todas las tiendas y puede mover inventario sin usuario.

Las políticas de `usuarios`, `usuario_roles` y `tiendas` no cambian: el admin
general sigue gestionando cuentas, roles y tiendas.

Revision ID: 0004_admin_general_supervisa
Revises: 0003_producto_presentacion
Create Date: 2026-10-24
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004_admin_general_supervisa"
down_revision: str | None = "0003_producto_presentacion"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TIENDA_DEL_PRODUCTO = "catalogo_tienda_de_producto(producto_id)"

# (tabla, política, USING con la función de lectura)
_LECTURAS = (
    (
        "productos",
        "productos_lectura",
        "(activo AND EXISTS (SELECT 1 FROM tiendas t WHERE t.id = productos.tienda_id"
        " AND t.activa)) OR {funcion}(tienda_id)",
    ),
    ("pedidos", "pedidos_lectura", "usuario_id = seg_usuario_id() OR {funcion}(tienda_id)"),
    ("movimientos_existencias", "movimientos_lectura", "{funcion}(" + _TIENDA_DEL_PRODUCTO + ")"),
)

# Cuerpo de `inventario_aplicar_movimiento` (0002) con la guarda parametrizada:
# solo cambia quién puede mover inventario sin usuario autenticado.
_MOVIMIENTO = """
CREATE OR REPLACE FUNCTION inventario_aplicar_movimiento(
    p_producto_id integer, p_cambio integer, p_tipo text, p_pedido_id bigint
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_resultante integer;
BEGIN
    IF seg_usuario_id() IS NULL AND NOT {sin_usuario}() THEN
        RAISE EXCEPTION USING
            MESSAGE = 'Se requiere un usuario autenticado para mover inventario',
            ERRCODE = 'insufficient_privilege';
    END IF;
    UPDATE existencias
       SET cantidad = cantidad + p_cambio, version = version + 1, actualizado_en = now()
     WHERE producto_id = p_producto_id AND cantidad + p_cambio >= 0
    RETURNING cantidad INTO v_resultante;
    IF NOT FOUND THEN
        IF EXISTS (SELECT 1 FROM existencias WHERE producto_id = p_producto_id) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'Existencias insuficientes para el producto ' || p_producto_id,
                ERRCODE = 'check_violation';
        END IF;
        RAISE EXCEPTION USING
            MESSAGE = 'El producto ' || p_producto_id || ' no tiene existencias registradas',
            ERRCODE = 'no_data_found';
    END IF;
    INSERT INTO movimientos_existencias
        (producto_id, tipo, cambio, cantidad_resultante, pedido_id, usuario_id)
    VALUES (p_producto_id, p_tipo, p_cambio, v_resultante, p_pedido_id, seg_usuario_id());
    RETURN v_resultante;
END
$$;
"""


def _rehacer_lecturas(funcion: str) -> None:
    for tabla, nombre, usar in _LECTURAS:
        op.execute(f"DROP POLICY IF EXISTS {nombre} ON {tabla}")
        op.execute(
            f"CREATE POLICY {nombre} ON {tabla} FOR SELECT USING ({usar.format(funcion=funcion)})"
        )


def upgrade() -> None:
    op.execute(
        """
-- Tareas programadas: sin usuario y con alcance sobre todas las tiendas.
CREATE FUNCTION seg_es_sistema() RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(current_setting('app.es_sistema', true), '') = 'true'
$$;

-- Escribir en una tienda: su admin (o el sistema). El admin general ya no.
CREATE OR REPLACE FUNCTION seg_administra_tienda(p_tienda integer) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT seg_es_sistema()
        OR COALESCE(p_tienda = ANY (seg_ids('app.tiendas_admin')), false)
$$;

-- Leer lo de una tienda para supervisarla: el admin general o quien la gestiona.
CREATE FUNCTION seg_supervisa_tienda(p_tienda integer) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT seg_es_admin_general() OR seg_gestiona_inventario_tienda(p_tienda)
$$;
"""
    )
    op.execute(_MOVIMIENTO.format(sin_usuario="seg_es_sistema"))
    _rehacer_lecturas("seg_supervisa_tienda")


def downgrade() -> None:
    _rehacer_lecturas("seg_gestiona_inventario_tienda")
    op.execute(_MOVIMIENTO.format(sin_usuario="seg_es_admin_general"))
    op.execute(
        """
CREATE OR REPLACE FUNCTION seg_administra_tienda(p_tienda integer) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT seg_es_admin_general()
        OR COALESCE(p_tienda = ANY (seg_ids('app.tiendas_admin')), false)
$$;
"""
    )
    op.execute("DROP FUNCTION IF EXISTS seg_supervisa_tienda(integer)")
    op.execute("DROP FUNCTION IF EXISTS seg_es_sistema()")

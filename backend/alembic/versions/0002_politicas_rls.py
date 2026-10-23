"""Row Level Security, privilegios mínimos y funciones de seguridad (ADR 0014).

- La API se conecta con un rol de aplicación (por defecto `tienda_app`) que no
  es dueño, no es superusuario y no tiene BYPASSRLS. Esta migración solo le da
  GRANT; el rol y su contraseña los crea `deploy/postgres/initdb/10-rol-aplicacion.sh`.
- Las 12 tablas de los módulos quedan con ENABLE + FORCE ROW LEVEL SECURITY
  (`alembic_version` queda fuera y sin privilegios para la aplicación).
- Las políticas leen el principal con las funciones `seg_*`, alimentadas por
  `set_config(..., true)` desde `app/shared/seguridad.py`.
- Las operaciones que cruzan una frontera (login, registro, descontar stock,
  saber la tienda de un producto) son funciones SECURITY DEFINER pequeñas.

El rol de aplicación se toma de `-x rol_app=...`, de `APP_DB_USER` o vale
`tienda_app`.

Revision ID: 0002_politicas_rls
Revises: 0001_esquema_inicial
Create Date: 2026-10-22
"""

import os
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import context, op

revision: str = "0002_politicas_rls"
down_revision: str | None = "0001_esquema_inicial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLAS = (
    "usuarios",
    "roles",
    "usuario_roles",
    "tiendas",
    "categorias",
    "productos",
    "imagenes_producto",
    "existencias",
    "movimientos_existencias",
    "pedidos",
    "pedido_lineas",
    "pedido_historial",
)

# ─────────────────────── funciones de contexto (shared) ───────────────────────
FUNCIONES_CONTEXTO = """
CREATE FUNCTION seg_usuario_id() RETURNS integer
LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.usuario_id', true), '')::integer
$$;

CREATE FUNCTION seg_tiene_rol(p_rol text) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT p_rol = ANY (string_to_array(COALESCE(current_setting('app.roles', true), ''), ','))
$$;

CREATE FUNCTION seg_es_admin_general() RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(current_setting('app.es_admin_general', true), '') = 'true'
$$;

CREATE FUNCTION seg_ids(p_parametro text) RETURNS integer[]
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        string_to_array(NULLIF(current_setting(p_parametro, true), ''), ',')::integer[],
        '{}'::integer[]
    )
$$;

-- admin_general administra todas las tiendas.
CREATE FUNCTION seg_administra_tienda(p_tienda integer) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT seg_es_admin_general()
        OR COALESCE(p_tienda = ANY (seg_ids('app.tiendas_admin')), false)
$$;

-- Quien administra la tienda también gestiona su inventario.
CREATE FUNCTION seg_gestiona_inventario_tienda(p_tienda integer) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT seg_administra_tienda(p_tienda)
        OR COALESCE(p_tienda = ANY (seg_ids('app.tiendas_inventario')), false)
$$;
"""

# ─────────────────── funciones SECURITY DEFINER por módulo ────────────────────
# (nombre con firma, ¿se concede EXECUTE al rol de aplicación?)
FUNCIONES_DEFINER = (
    ("catalogo_tienda_de_producto(integer)", True),
    ("identidad_buscar_credenciales(text)", True),
    ("identidad_registrar_comprador(text, text, text)", True),
    ("inventario_aplicar_movimiento(integer, integer, text, bigint)", False),
    ("inventario_descontar(integer, integer, bigint)", True),
    ("inventario_reponer(integer, integer, bigint)", True),
)

FUNCIONES_MODULOS = """
-- catalog: Inventario no lee tablas de Catálogo; pregunta por esta función.
CREATE FUNCTION catalogo_tienda_de_producto(p_producto_id integer) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT tienda_id FROM productos WHERE id = p_producto_id
$$;

-- identity: el login ocurre antes de existir un contexto de usuario.
CREATE FUNCTION identidad_buscar_credenciales(p_correo text)
RETURNS TABLE (id integer, hash_contrasena text, activo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT u.id, u.hash_contrasena, u.activo
    FROM usuarios u
    WHERE lower(u.correo::text) = lower(p_correo)
$$;

-- identity: alta pública con el rol `comprador`, en una sola transacción.
CREATE FUNCTION identidad_registrar_comprador(
    p_nombre text, p_correo text, p_hash_contrasena text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_id integer;
BEGIN
    INSERT INTO usuarios (nombre, correo, hash_contrasena)
    VALUES (p_nombre, p_correo, p_hash_contrasena)
    RETURNING usuarios.id INTO v_id;
    INSERT INTO usuario_roles (usuario_id, rol_codigo) VALUES (v_id, 'comprador');
    RETURN v_id;
END
$$;

-- inventory: movimiento atómico. Sube `version` para que el bloqueo optimista
-- del ORM detecte la concurrencia (F-03). No se concede al rol de aplicación.
CREATE FUNCTION inventario_aplicar_movimiento(
    p_producto_id integer, p_cambio integer, p_tipo text, p_pedido_id bigint
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_resultante integer;
BEGIN
    IF seg_usuario_id() IS NULL AND NOT seg_es_admin_general() THEN
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

-- inventory: checkout del comprador, que no tiene UPDATE directo.
CREATE FUNCTION inventario_descontar(p_producto_id integer, p_cantidad integer, p_pedido_id bigint)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RAISE EXCEPTION USING
            MESSAGE = 'La cantidad a descontar debe ser positiva',
            ERRCODE = 'invalid_parameter_value';
    END IF;
    RETURN inventario_aplicar_movimiento(p_producto_id, -p_cantidad, 'venta', p_pedido_id);
END
$$;

-- inventory: compensación de la saga (pedido cancelado o vencido).
CREATE FUNCTION inventario_reponer(p_producto_id integer, p_cantidad integer, p_pedido_id bigint)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
        RAISE EXCEPTION USING
            MESSAGE = 'La cantidad a reponer debe ser positiva',
            ERRCODE = 'invalid_parameter_value';
    END IF;
    RETURN inventario_aplicar_movimiento(p_producto_id, p_cantidad, 'devolucion', p_pedido_id);
END
$$;
"""

# Privilegios mínimos del rol de aplicación ({rol} se sustituye ya citado).
# Sin DELETE en inventario ni pedidos (trazabilidad), sin nada en alembic_version.
GRANTS = """
GRANT USAGE ON SCHEMA public TO {rol};
GRANT SELECT ON roles TO {rol};
GRANT SELECT (id, nombre, correo, activo, creado_en) ON usuarios TO {rol};
GRANT UPDATE (nombre, correo, hash_contrasena, activo) ON usuarios TO {rol};
GRANT SELECT, INSERT, UPDATE, DELETE ON usuario_roles TO {rol};
GRANT SELECT, INSERT, UPDATE, DELETE ON tiendas, categorias, productos, imagenes_producto TO {rol};
GRANT SELECT, INSERT, UPDATE ON existencias TO {rol};
GRANT SELECT, INSERT ON movimientos_existencias TO {rol};
GRANT SELECT, INSERT ON pedidos TO {rol};
GRANT UPDATE (estado, version, actualizado_en) ON pedidos TO {rol};
GRANT SELECT, INSERT ON pedido_lineas, pedido_historial TO {rol};
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO {rol};
"""

_TIENDA_DEL_PRODUCTO = "seg_gestiona_inventario_tienda(catalogo_tienda_de_producto(producto_id))"
_PEDIDO_VISIBLE = "EXISTS (SELECT 1 FROM pedidos p WHERE p.id = {tabla}.pedido_id)"
_IMAGEN_ADMINISTRABLE = (
    "EXISTS (SELECT 1 FROM productos p WHERE p.id = imagenes_producto.producto_id"
    " AND seg_administra_tienda(p.tienda_id))"
)

# (tabla, política, comando, USING, WITH CHECK). Las subconsultas a tablas del
# mismo módulo también pasan por RLS, así que "visible" se hereda.
POLITICAS = (
    ("roles", "roles_lectura", "SELECT", "true", None),
    ("usuarios", "usuarios_lectura", "SELECT",
     "id = seg_usuario_id() OR seg_es_admin_general()", None),
    ("usuarios", "usuarios_actualizacion", "UPDATE",
     "id = seg_usuario_id() OR seg_es_admin_general()",
     "id = seg_usuario_id() OR seg_es_admin_general()"),
    ("usuario_roles", "usuario_roles_lectura", "SELECT",
     "usuario_id = seg_usuario_id() OR seg_es_admin_general()", None),
    ("usuario_roles", "usuario_roles_insercion", "INSERT", None, "seg_es_admin_general()"),
    ("usuario_roles", "usuario_roles_actualizacion", "UPDATE",
     "seg_es_admin_general()", "seg_es_admin_general()"),
    ("usuario_roles", "usuario_roles_borrado", "DELETE", "seg_es_admin_general()", None),
    ("tiendas", "tiendas_lectura", "SELECT", "activa OR seg_gestiona_inventario_tienda(id)", None),
    ("tiendas", "tiendas_insercion", "INSERT", None, "seg_es_admin_general()"),
    ("tiendas", "tiendas_actualizacion", "UPDATE",
     "seg_administra_tienda(id)", "seg_administra_tienda(id)"),
    ("tiendas", "tiendas_borrado", "DELETE", "seg_es_admin_general()", None),
    ("categorias", "categorias_lectura", "SELECT",
     "EXISTS (SELECT 1 FROM tiendas t WHERE t.id = categorias.tienda_id)", None),
    ("categorias", "categorias_insercion", "INSERT", None, "seg_administra_tienda(tienda_id)"),
    ("categorias", "categorias_actualizacion", "UPDATE",
     "seg_administra_tienda(tienda_id)", "seg_administra_tienda(tienda_id)"),
    ("categorias", "categorias_borrado", "DELETE", "seg_administra_tienda(tienda_id)", None),
    ("productos", "productos_lectura", "SELECT",
     "(activo AND EXISTS (SELECT 1 FROM tiendas t WHERE t.id = productos.tienda_id AND t.activa))"
     " OR seg_gestiona_inventario_tienda(tienda_id)", None),
    ("productos", "productos_insercion", "INSERT", None, "seg_administra_tienda(tienda_id)"),
    ("productos", "productos_actualizacion", "UPDATE",
     "seg_administra_tienda(tienda_id)", "seg_administra_tienda(tienda_id)"),
    ("productos", "productos_borrado", "DELETE", "seg_administra_tienda(tienda_id)", None),
    ("imagenes_producto", "imagenes_lectura", "SELECT",
     "EXISTS (SELECT 1 FROM productos p WHERE p.id = imagenes_producto.producto_id)", None),
    ("imagenes_producto", "imagenes_insercion", "INSERT", None, _IMAGEN_ADMINISTRABLE),
    ("imagenes_producto", "imagenes_actualizacion", "UPDATE",
     _IMAGEN_ADMINISTRABLE, _IMAGEN_ADMINISTRABLE),
    ("imagenes_producto", "imagenes_borrado", "DELETE", _IMAGEN_ADMINISTRABLE, None),
    ("existencias", "existencias_lectura", "SELECT", "true", None),
    ("existencias", "existencias_insercion", "INSERT", None, _TIENDA_DEL_PRODUCTO),
    ("existencias", "existencias_actualizacion", "UPDATE",
     _TIENDA_DEL_PRODUCTO, _TIENDA_DEL_PRODUCTO),
    ("movimientos_existencias", "movimientos_lectura", "SELECT", _TIENDA_DEL_PRODUCTO, None),
    # Ventas y devoluciones solo entran por inventario_descontar/reponer.
    ("movimientos_existencias", "movimientos_insercion", "INSERT", None,
     "tipo IN ('inicial', 'ajuste') AND usuario_id IS NOT DISTINCT FROM seg_usuario_id()"
     f" AND {_TIENDA_DEL_PRODUCTO}"),
    ("pedidos", "pedidos_lectura", "SELECT",
     "usuario_id = seg_usuario_id() OR seg_gestiona_inventario_tienda(tienda_id)", None),
    ("pedidos", "pedidos_insercion", "INSERT", None,
     "usuario_id = seg_usuario_id() AND estado = 'pendiente_pago'"),
    ("pedidos", "pedidos_gestion_tienda", "UPDATE",
     "seg_gestiona_inventario_tienda(tienda_id)", "seg_gestiona_inventario_tienda(tienda_id)"),
    # El comprador solo puede cancelar su pedido mientras no esté cerrado.
    ("pedidos", "pedidos_cancelacion_comprador", "UPDATE",
     "usuario_id = seg_usuario_id() AND estado NOT IN ('entregado', 'cancelado')",
     "usuario_id = seg_usuario_id() AND estado = 'cancelado'"),
    ("pedido_lineas", "pedido_lineas_lectura", "SELECT",
     _PEDIDO_VISIBLE.format(tabla="pedido_lineas"), None),
    ("pedido_lineas", "pedido_lineas_insercion", "INSERT", None,
     "EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_lineas.pedido_id"
     " AND p.usuario_id = seg_usuario_id() AND p.estado = 'pendiente_pago')"),
    ("pedido_historial", "pedido_historial_lectura", "SELECT",
     _PEDIDO_VISIBLE.format(tabla="pedido_historial"), None),
    # usuario_id NULL solo en contexto de sistema (sin usuario).
    ("pedido_historial", "pedido_historial_insercion", "INSERT", None,
     _PEDIDO_VISIBLE.format(tabla="pedido_historial")
     + " AND usuario_id IS NOT DISTINCT FROM seg_usuario_id()"),
)


def _rol_aplicacion() -> str:
    argumentos = context.get_x_argument(as_dictionary=True)
    return argumentos.get("rol_app") or os.getenv("APP_DB_USER") or "tienda_app"


def _verificar_roles(conexion: sa.Connection, rol: str) -> None:
    """Falla con un mensaje claro antes de tocar nada."""
    fila = conexion.execute(
        sa.text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = :rol"),
        {"rol": rol},
    ).first()
    if fila is None:
        raise RuntimeError(
            f"El rol de aplicación '{rol}' no existe. Créalo antes de migrar con "
            "deploy/postgres/initdb/10-rol-aplicacion.sh (ver ADR 0014) o indica otro "
            "nombre con APP_DB_USER o `alembic -x rol_app=<rol> upgrade head`."
        )
    if fila.rolsuper or fila.rolbypassrls:
        raise RuntimeError(
            f"El rol de aplicación '{rol}' es SUPERUSER o BYPASSRLS: RLS no lo limitaría."
        )
    dueno_omite_rls = conexion.execute(
        sa.text("SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user")
    ).scalar()
    if not dueno_omite_rls:
        raise RuntimeError(
            "Las migraciones deben ejecutarse con el rol dueño SUPERUSER o BYPASSRLS: "
            "con FORCE ROW LEVEL SECURITY las funciones SECURITY DEFINER dependen de ello."
        )


def _crear_politica(tabla: str, nombre: str, comando: str, usar: str | None, chequeo: str | None) -> None:
    sql = f"CREATE POLICY {nombre} ON {tabla} FOR {comando}"
    if usar is not None:
        sql += f" USING ({usar})"
    if chequeo is not None:
        sql += f" WITH CHECK ({chequeo})"
    op.execute(sql)


def upgrade() -> None:
    conexion = op.get_bind()
    rol_nombre = _rol_aplicacion()
    _verificar_roles(conexion, rol_nombre)
    rol = conexion.dialect.identifier_preparer.quote(rol_nombre)

    op.execute(FUNCIONES_CONTEXTO)
    op.execute(FUNCIONES_MODULOS)
    for firma, concedida in FUNCIONES_DEFINER:
        op.execute(f"REVOKE ALL ON FUNCTION {firma} FROM PUBLIC")
        if concedida:
            op.execute(f"GRANT EXECUTE ON FUNCTION {firma} TO {rol}")

    op.execute(GRANTS.format(rol=rol))

    for tabla in TABLAS:
        op.execute(f"ALTER TABLE {tabla} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {tabla} FORCE ROW LEVEL SECURITY")
    for politica in POLITICAS:
        _crear_politica(*politica)


def downgrade() -> None:
    conexion = op.get_bind()
    rol_nombre = _rol_aplicacion()

    for tabla, nombre, *_ in reversed(POLITICAS):
        op.execute(f"DROP POLICY IF EXISTS {nombre} ON {tabla}")
    for tabla in TABLAS:
        op.execute(f"ALTER TABLE {tabla} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {tabla} DISABLE ROW LEVEL SECURITY")

    existe = conexion.execute(
        sa.text("SELECT 1 FROM pg_roles WHERE rolname = :rol"), {"rol": rol_nombre}
    ).first()
    if existe:
        rol = conexion.dialect.identifier_preparer.quote(rol_nombre)
        # Revocar a nivel de tabla también retira los privilegios por columna.
        op.execute(f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {rol}")
        op.execute(f"REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM {rol}")
        op.execute(f"REVOKE USAGE ON SCHEMA public FROM {rol}")

    for firma, _ in reversed(FUNCIONES_DEFINER):
        op.execute(f"DROP FUNCTION IF EXISTS {firma}")
    for firma in (
        "seg_gestiona_inventario_tienda(integer)",
        "seg_administra_tienda(integer)",
        "seg_ids(text)",
        "seg_es_admin_general()",
        "seg_tiene_rol(text)",
        "seg_usuario_id()",
    ):
        op.execute(f"DROP FUNCTION IF EXISTS {firma}")

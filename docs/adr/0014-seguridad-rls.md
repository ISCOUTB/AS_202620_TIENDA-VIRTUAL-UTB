# ADR 0014: Row Level Security en PostgreSQL y rol de aplicación con privilegios mínimos

- **Estado:** Propuesta — pendiente de revisión y ratificación del equipo
- **Fecha:** 2026-10-22
- **Relacionada:** [ADR 0013](0013-migraciones-alembic-y-esquema.md) (esquema),
  [ADR 0001](0001-monolito-modular.md) (una sola base con dueño por módulo),
  [ADR 0011](0011-sesion-localstorage.md) (sesión del frontend) y el escenario
  de seguridad 1 de [`escenarios-calidad.md`](../escenarios-calidad.md).

## Contexto

Con el esquema del ADR 0013 la base guarda cuentas, roles por tienda, stock y
pedidos de varios compradores. Hasta ahora la API se conectaba con el usuario
dueño de la base (el `POSTGRES_USER` de la imagen, superusuario): un error de
filtrado en cualquier consulta —un `WHERE` olvidado— expondría pedidos de otros
compradores o permitiría editar productos de otra tienda.

Los endpoints de identidad todavía no existen, pero las reglas de visibilidad
ya están definidas por el modelo de roles: comprador, `admin_tienda` y
`responsable_inventario` (por tienda) y `admin_general`.

## Alternativas consideradas

1. **Filtrar solo en la aplicación.** Simple, pero cada consulta nueva es una
   oportunidad de fuga y nada lo verifica en la base. Rechazada como única barrera.
2. **Una conexión por usuario final (roles de PostgreSQL por persona).**
   Aislamiento fuerte, pero incompatible con un pool compartido y con el alta
   de cuentas desde la web. Rechazada.
3. **RLS con un rol de aplicación y el principal en variables de transacción.**
   La API conserva un pool; cada transacción declara quién actúa
   (`set_config(..., true)`) y las políticas filtran. Seleccionada, como
   defensa en profundidad sobre los controles de la aplicación.

## Decisión

### Roles de base de datos

| Rol | Atributos | Uso |
|---|---|---|
| Dueño (`POSTGRES_USER`, por defecto `tienda_utb`) | Dueño de las tablas; SUPERUSER en la imagen de Docker | `alembic upgrade`, `python -m app.seed`, exportación de datos |
| Aplicación (`APP_DB_USER`, por defecto `tienda_app`) | `LOGIN NOSUPERUSER NOBYPASSRLS`, no es dueño | Conexión de la API |

- El rol de aplicación y su contraseña los crea
  `deploy/postgres/initdb/10-rol-aplicacion.sh` (montado en
  `/docker-entrypoint-initdb.d` en ambos Compose). Es idempotente; en una base
  ya inicializada se ejecuta a mano (ver README). Ninguna migración contiene
  contraseñas.
- `0002_politicas_rls` solo concede privilegios al rol (nombre por
  `-x rol_app=…`, `APP_DB_USER` o `tienda_app`) y falla con un mensaje claro si
  no existe, si es SUPERUSER/BYPASSRLS o si el dueño no omite RLS.
- Configuración: la API usa `DATABASE_URL` o `DB_HOST` + `DB_USER`/`DB_PASSWORD`
  (rol de aplicación). Alembic y la siembra usan `MIGRATIONS_DATABASE_URL` o
  `DB_MIGRATIONS_USER`/`DB_MIGRATIONS_PASSWORD`; si faltan, recurren a las de la API.

### Contexto por transacción

`app/shared/seguridad.py` define `ContextoSeguridad` y `aplicar_contexto`, que
fija `app.usuario_id`, `app.roles`, `app.tiendas_admin`,
`app.tiendas_inventario` y `app.es_admin_general` con `set_config(..., true)`.
`get_session` guarda el contexto en la sesión y un evento `after_begin` lo
aplica al inicio de **cada** transacción; al terminar la transacción los
valores desaparecen, así que una conexión devuelta al pool no arrastra el
principal anterior. La dependencia `contexto_actual` devuelve hoy un anónimo;
el punto de enganche del JWT está marcado como `TODO(identity)`.

Las políticas leen ese contexto con funciones `STABLE`: `seg_usuario_id()`,
`seg_tiene_rol(text)`, `seg_es_admin_general()`,
`seg_administra_tienda(int)` (incluye a `admin_general`) y
`seg_gestiona_inventario_tienda(int)` (incluye a quien administra la tienda).

### Funciones SECURITY DEFINER

Pequeñas, con `search_path` fijo, sin `EXECUTE` para `PUBLIC`:

| Función | Módulo | Para qué |
|---|---|---|
| `catalogo_tienda_de_producto(producto_id)` | catalog | Las políticas de Inventario conocen la tienda de un producto sin leer tablas de Catálogo |
| `identidad_buscar_credenciales(correo)` | identity | Login antes de que exista un usuario en contexto; no abre `SELECT` sobre `usuarios` |
| `identidad_registrar_comprador(nombre, correo, hash)` | identity | Alta pública con el rol `comprador` en una sola transacción |
| `inventario_descontar(producto_id, cantidad, pedido_id)` / `inventario_reponer(...)` | inventory | Checkout y compensación: el comprador no tiene `UPDATE` sobre `existencias`. Exigen usuario, no dejan stock negativo, suben `version` y registran el movimiento |

### Políticas (ENABLE + FORCE RLS en las 12 tablas)

`S` = SELECT, `I` = INSERT, `U` = UPDATE, `D` = DELETE. "Propio" = filas del
usuario en contexto; "su tienda" = tienda en `app.tiendas_admin` (admin) o en
`app.tiendas_inventario` (responsable). `—` = sin privilegio o sin política.

| Tabla | Anónimo | Comprador | Responsable inventario (su tienda) | Admin de tienda (su tienda) | Admin general |
|---|---|---|---|---|---|
| `roles` | S | S | S | S | S |
| `usuarios` | — (login por función) | S/U propio (sin leer el hash) | S/U propio | S/U propio | S/U todos |
| `usuario_roles` | — | S propio | S propio | S propio | S/I/U/D |
| `tiendas` | S activas | S activas | S + inactiva propia | S, U propia | S/I/U/D |
| `categorias` | S de tiendas visibles | ídem | ídem | + I/U/D | S/I/U/D |
| `productos` | S activos de tiendas activas | ídem | + S inactivos | + I/U/D | S/I/U/D |
| `imagenes_producto` | S de productos visibles | ídem | ídem | + I/U/D | S/I/U/D |
| `existencias` | S | S; cambios solo por funciones | S, I/U | S, I/U | S/I/U |
| `movimientos_existencias` | — | — (los crea la función) | S, I (`inicial`/`ajuste` a su nombre) | ídem | S, I |
| `pedidos` | — | S/I propios; U solo a `cancelado` | S/U de su tienda | S/U de su tienda | S/U |
| `pedido_lineas` | — | S de sus pedidos; I en pedido propio pendiente | S | S | S |
| `pedido_historial` | — | S/I en sus pedidos, a su nombre | S/I | S/I | S/I (`usuario_id` NULL = sistema) |

Además, por `GRANT`: ningún `DELETE` en inventario ni pedidos (trazabilidad);
`UPDATE` de `pedidos` limitado a `estado`, `version` y `actualizado_en`;
`SELECT` de `usuarios` sin `hash_contrasena`; nada sobre `alembic_version` ni
DDL.

## Consecuencias

- Una consulta de la API sin filtro ya no fuga datos de otro comprador ni de
  otra tienda: la base lo impide aunque el código falle.
- **El dueño omite RLS.** En la imagen de Docker es SUPERUSER; `FORCE ROW
  LEVEL SECURITY` solo afectaría a un dueño sin SUPERUSER ni BYPASSRLS, y la
  migración exige que el dueño omita RLS porque las funciones SECURITY DEFINER
  dependen de ello. La barrera real es que la API usa otro rol. La siembra y
  las migraciones, que usan el dueño, deben mantenerse fuera del alcance web.
- Hay una variable de entorno más (`APP_DB_PASSWORD`) y un paso manual para
  bases ya inicializadas.
- Cada transacción hace una ida y vuelta extra (`set_config`).
- El futuro código de identidad no debe cargar entidades `Usuario` completas
  con el rol de aplicación (no puede leer `hash_contrasena`): usa la función
  de credenciales y columnas explícitas.
- Las pruebas de RLS ejecutan como `tienda_app` con `SET LOCAL ROLE`; la API
  en pruebas sigue conectada como dueño.

## Revisión humana pendiente

El equipo debe ratificar o rechazar esta propuesta y cambiar su estado.

# ADR 0017: Un admin por tienda; el administrador general solo supervisa

- **Estado:** Propuesta — pendiente de revisión y ratificación del equipo
- **Fecha:** 2026-10-24
- **Relacionada:** [ADR 0014](0014-seguridad-rls.md) (RLS y funciones de
  seguridad, que esta decisión amplía), [ADR 0016](0016-autenticacion-jwt.md)
  (roles leídos en cada petición), [ADR 0008](0008-separar-catalogo-inventario.md)
  (catálogo e inventario separados) y el escenario de seguridad 1 de
  [`escenarios-calidad.md`](../escenarios-calidad.md).

## Contexto

Hasta la API 0.4.0 el modelo de roles tenía `admin_tienda` y
`responsable_inventario` por tienda y un `admin_general` que **administraba
todas las tiendas**: `ContextoSeguridad.administra_tienda` y la función SQL
`seg_administra_tienda` devolvían verdadero para él. En la práctica:

- Solo existía el administrador general sembrado (`SEED_ADMIN_*`). No había
  cuentas de tienda, así que una sola persona cambiaba el stock, los precios y
  los pedidos de las cinco cafeterías.
- Cualquier error de esa cuenta, o su robo, afectaba a todas las tiendas a la vez.
- No quedaba claro quién respondía por los datos de cada tienda: el historial de
  movimientos mezclaba los cambios del general con los de la tienda.
- La tarea programada que vence pedidos (`app.tareas.vencer_pedidos`) se hacía
  pasar por admin general para cancelar pedidos y reponer stock sin usuario.

El negocio pide que **cada tienda gestione lo suyo**: el admin de una tienda no
debe poder tocar el stock, los productos ni los pedidos de otra.

## Alternativas consideradas

1. **Mantener al general como superusuario de tiendas.** Sin cambios, pero no
   cumple el pedido: una cuenta concentra todo el poder sobre los datos de cada
   tienda. Rechazada.
2. **Eliminar al administrador general.** Simplifica el modelo, pero nadie
   podría ver el estado de todas las tiendas ni gestionar cuentas, roles y
   tiendas. Rechazada.
3. **General en modo supervisión y un admin por tienda.** El general lee todo
   (inventario, productos inactivos, colas de pedidos, movimientos) y sigue
   gestionando cuentas, roles y tiendas. Las escrituras sobre los datos de una
   tienda quedan solo para quien la administra. **Seleccionada.**

## Decisión

### Tres predicados en lugar de dos

| Predicado (Python y SQL) | Quién | Uso |
|---|---|---|
| `administra_tienda(t)` / `seg_administra_tienda(t)` | Principal **sistema** o `admin_tienda` de `t` | Crear y editar productos; avanzar y cancelar pedidos de la tienda |
| `gestiona_inventario(t)` / `seg_gestiona_inventario_tienda(t)` | Quien administra `t` o `responsable_inventario` de `t` | Ajustar y fijar existencias |
| `supervisa_tienda(t)` / `seg_supervisa_tienda(t)` (nuevo) | `admin_general` o quien gestiona `t` | **Lecturas**: productos inactivos, cola de pedidos, pedido de otro, movimientos |

El `admin_general` ya no aparece en `administra_tienda`. Conserva
`es_admin_general` para lo que es suyo: cuentas (`usuarios`, `usuario_roles`)
y tiendas (`tiendas`). Esas políticas no cambian.

### API

- `app/shared/seguridad.py`:
  - `ContextoSeguridad` gana `sistema: bool = False` y `supervisa_tienda`.
  - `aplicar_contexto` publica además `app.es_sistema`.
  - `prohibido_en_tienda(contexto, detalle)` construye el 403. Al general le
    responde con el mensaje fijo `SOLO_SUPERVISA` («El administrador general
    solo supervisa: los cambios los hace el admin de la tienda») para que la
    interfaz y quien integre sepan por qué.
- Routers:
  - **Lecturas** con `supervisa_tienda`: ver productos inactivos
    (`GET /catalog/products?incluir_inactivos=true`, `GET /catalog/products/{id}`),
    la cola por tienda (`GET /orders?tienda_id=`) y el pedido de otro
    (`GET /orders/{id}`).
  - **Escrituras** con `administra_tienda` o `gestiona_inventario`: crear y
    editar producto, ajustar y fijar stock, avanzar estado, cancelar un pedido
    ajeno.
- El comprador sigue cancelando **su** pedido. Un admin de otra tienda recibe
  404 sobre pedidos que no ve (no se revela que existen), y 403 sobre productos
  y stock (el catálogo es público).

### Base de datos (migración `0004_admin_general_supervisa`)

- `seg_es_sistema()` lee `app.es_sistema`.
- `seg_administra_tienda(p)` pasa a ser `seg_es_sistema() OR p = ANY(tiendas_admin)`.
- `seg_supervisa_tienda(p)` = `seg_es_admin_general() OR seg_gestiona_inventario_tienda(p)`.
- Se rehacen las políticas de **lectura** `productos_lectura`, `pedidos_lectura`
  y `movimientos_lectura` con `seg_supervisa_tienda`. Las de escritura no
  cambian de texto: como usan `seg_administra_tienda`, dejan fuera al general
  automáticamente.
- `inventario_aplicar_movimiento` (SECURITY DEFINER) solo admite el contexto sin
  usuario si es el **sistema** (antes: si era admin general).
- `downgrade` restaura exactamente las definiciones de `0002_politicas_rls`.

### Principal sistema para tareas programadas

`app.tareas.vencer_pedidos` usa `SISTEMA = ContextoSeguridad(sistema=True)`:
sin usuario y con alcance de escritura sobre todas las tiendas. No es un rol
de `usuario_roles` ni se puede obtener desde la API: solo existe en código que
corre fuera del alcance web (comando o Schedule de Dokploy).

### Cuentas

- `identity.public.asegurar_cuenta_con_rol` generaliza el alta idempotente
  (no pisa contraseñas existentes). `asegurar_admin_general` y
  `asegurar_admin_tienda` la envuelven.
- `python -m app.seed` crea `admin.<tienda>@utb.edu.co` («Admin <Tienda>»), con
  `admin_tienda` de esa tienda, **solo si** está definida
  `SEED_TIENDAS_PASSWORD` (8 caracteres o más). Sin la variable no crea
  cuentas, igual que `SEED_ADMIN_*`. La contraseña nunca se versiona y se
  cambia tras el primer ingreso.

### Frontend

- `lib/roles.ts` replica los tres predicados (`administraTienda`,
  `gestionaInventario`, `supervisaTienda`).
- El panel `/admin` muestra al general «Supervisas 5 tiendas» y el aviso
  «Modo supervisión»: ve inventario y colas de todas las tiendas, sin «Producto
  nuevo», sin «Editar», con − / + y el campo de stock deshabilitados y sin
  botones de acción en la cola (`ColaPedidos` recibe `puedeGestionar`).
- Un admin de tienda solo ve su tienda en filtros, inventario y cola.

## Consecuencias

- **Positivas**
  - Cumple el aislamiento entre tiendas en dos capas: API (403/404) y RLS (0 filas).
  - Una cuenta comprometida solo afecta a una tienda.
  - El historial de movimientos identifica a la tienda que hizo cada cambio.
  - La tarea programada deja de depender de un rol de persona.
- **Negativas y riesgos**
  - **Cambio de comportamiento en producción**: tras migrar, el admin general
    pierde la edición. Hay que crear los admins de tienda **antes** de
    desplegar (runbook en [`despliegue-dokploy.md`](../despliegue-dokploy.md#subir-050)).
  - Una tienda sin admin no puede cambiar su stock hasta que el general le
    asigne uno (asignar roles sigue siendo del general, por SQL o siembra; aún
    no hay pantalla de gestión de roles).
  - Una variable de entorno más (`SEED_TIENDAS_PASSWORD`) que hay que tratar
    como secreto.
- Pruebas: `backend/tests/test_admin_por_tienda.py` cubre la matriz de la API
  (admin de la tienda, de otra tienda y general), el RLS directo con el rol de
  aplicación, el principal sistema y la siembra. `frontend/tests/roles.test.ts`
  cubre los predicados del cliente.

## Condiciones de reapertura

- Si el negocio necesita que el general corrija datos de una tienda en una
  emergencia, se evaluará un rol temporal y auditado, no devolverle la escritura
  permanente.
- Si aparece una pantalla de gestión de roles, este ADR se actualiza con su flujo.

## Revisión humana pendiente

El equipo debe ratificar o rechazar esta propuesta y cambiar su estado.

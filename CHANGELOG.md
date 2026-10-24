# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
La versión es la de la API (`info.version` en
[`docs/api/openapi.json`](docs/api/openapi.json)); el frontend se despliega con
ella.

## [0.5.0] — 2026-10-24 (sin desplegar)

Runbook de subida: [`docs/despliegue-dokploy.md#subir-050`](docs/despliegue-dokploy.md#subir-050).

### Cambiado: un admin por tienda, el administrador general solo supervisa

Decisión en el [ADR 0017](docs/adr/0017-admin-general-supervisa.md).

- **Comportamiento.** El `admin_general` ya no crea ni edita productos, no
  ajusta ni fija stock y no avanza ni cancela pedidos de tienda: recibe `403`
  con «El administrador general solo supervisa: los cambios los hace el admin
  de la tienda». Sigue leyendo todo: inventario, productos inactivos, colas de
  pedidos de cualquier tienda y movimientos.
- **Base de datos.** La migración `0004_admin_general_supervisa`:
  - redefine `seg_administra_tienda` (solo el admin de la tienda o el sistema);
  - añade `seg_supervisa_tienda` y `seg_es_sistema`;
  - rehace las políticas de lectura de `productos`, `pedidos` y
    `movimientos_existencias`;
  - solo deja mover inventario sin usuario al principal sistema.

  No cambia tablas ni datos y tiene `downgrade`.
- **Tareas programadas.** `python -m app.tareas.vencer_pedidos` actúa como el
  principal `sistema` (`ContextoSeguridad(sistema=True)`) en lugar de hacerse
  pasar por admin general.
- **Cuentas.** `python -m app.seed` crea un admin por tienda,
  `admin.<tienda>@utb.edu.co`, si se define `SEED_TIENDAS_PASSWORD` (variable
  nueva y secreta, añadida a `compose.yaml`, `deploy/compose.lab.yaml` y
  `.env.example`).
- **Frontend.**
  - El panel `/admin` del general muestra «Supervisas 5 tiendas» y el aviso
    «Modo supervisión», sin «Producto nuevo», sin «Editar», con − / + y el
    campo de stock deshabilitados y sin botones en la cola de pedidos.
  - Un admin de tienda solo ve su tienda.
  - `lib/roles.ts` replica la regla (`administraTienda`, `gestionaInventario`,
    `supervisaTienda`).
- **Documentación.**
  - Matriz rol × endpoint en [`docs/api/contrato-api.md`](docs/api/contrato-api.md#51-matriz-de-permisos-por-rol-api-050-adr-0017).
  - Contrato de diseño `docs/openapi/tienda-virtual.yaml` y contrato
    ejecutable `docs/api/openapi.json` en 0.5.0.
  - Nota de ampliación en el ADR 0014.

### Corregido (hallazgos de las pruebas E2E con TestSprite)

Detalle en [`docs/pruebas-e2e-testsprite.md`](docs/pruebas-e2e-testsprite.md).

- **Pool de conexiones agotado bajo concurrencia** (con varias peticiones simultáneas
  la API dejaba de responder hasta agotar la espera del pool).
  - Causa: FastAPI valida la respuesta de las rutas síncronas en el threadpool
    antes de cerrar las dependencias con `yield`, y la sesión retenía la
    conexión mientras otro hilo esperaba.
  - Arreglo: `RutaConSesion` (`app/shared/database.py`) cierra la sesión en el
    mismo hilo al terminar cada ruta.
  - Prueba: `backend/tests/test_concurrencia.py`.
- **`/login` y `/registro` daban 404.** Ahora redirigen a `/auth/ingresar` y
  `/auth/crear-cuenta` (`next.config.ts`).
- **Entrar se quedaba colgado en algunos navegadores.**
  - Tras el login se navega con `window.location.assign`.
  - `destinoSeguro` filtra `?next=` para evitar redirecciones abiertas a
    `//otro-sitio`.
- **Catálogo viejo tras editar un producto.**
  - El buscador de la portada recibe los productos de la página.
  - Los enlaces del panel no se precargan (`prefetch={false}`), así la caché
    del router de Next no sirve datos de hace minutos.
- **Stock en solo lectura donde no se gestiona.** El admin general veía − / +
  y el campo de conteo deshabilitados; ahora ve el número con «solo lectura».
- **Lista de pedidos desactualizada tras un error 400** (por ejemplo, cancelar
  un pedido que ya había cambiado): «Mis pedidos» y la cola del panel recargan
  la lista al fallar.

## [0.4.0] — 2026-10-24

- **Identidad** ([ADR 0016](docs/adr/0016-autenticacion-jwt.md)): registro,
  login con JWT HS256, contraseñas Argon2id y `/identity/me`. El contexto de
  seguridad viaja a RLS en cada transacción.
- **Inventario:** consulta por producto, `PUT` (conteo) y `POST …/adjust`
  protegidos por tienda, con movimiento registrado y bloqueo optimista (`409`).
- **Pedidos:** `POST /orders` idempotente (`Idempotency-Key`), un pedido por
  tienda, ciclo `pendiente_pago → pagado → en_preparacion → listo → entregado`,
  cancelación con reposición de stock y vencimiento a las 24 h por tarea
  programada.
- **Catálogo completo:** detalle, tiendas, creación y edición de productos
  (migración `0003_producto_presentacion`).
- **Frontend:** catálogo, pedidos y panel de administración con datos reales
  de la API por el proxy interno.

Versiones anteriores: ver los ADR 0001–0015 y el historial de git.

[0.5.0]: docs/despliegue-dokploy.md#subir-050
[0.4.0]: docs/api/openapi.json

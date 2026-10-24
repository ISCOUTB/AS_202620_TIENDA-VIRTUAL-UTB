# Despliegue en Dokploy

La fuente de producción es `deploy/compose.lab.yaml`. El stack ejecuta Next.js,
FastAPI y PostgreSQL en una red privada; solo Next.js recibe tráfico público.

## Crear el servicio

1. En Dokploy, crear un proyecto y un servicio de tipo **Docker Compose** (no
   Docker Stack).
2. Conectar este repositorio y la rama que se quiera desplegar.
3. Establecer **Compose Path** en `./deploy/compose.lab.yaml`.
4. Activar **Isolated Deployments**.
5. En **Environment**, definir dos contraseñas largas, únicas y distintas (la
   del rol dueño, para migraciones y siembra, y la del rol de la API, sujeto a
   RLS, [ADR 0014](adr/0014-seguridad-rls.md)) y la clave de firma de los
   tokens ([ADR 0016](adr/0016-autenticacion-jwt.md)); la API no arranca sin
   ella:

   ```dotenv
   POSTGRES_PASSWORD=valor-secreto
   APP_DB_PASSWORD=otro-valor-secreto
   JWT_SECRET=salida-de-openssl-rand-hex-32
   # Opcionales:
   # POSTGRES_USER=tienda_utb
   # POSTGRES_DB=tienda_utb
   # APP_DB_USER=tienda_app
   # JWT_TTL_SEGUNDOS=3600
   # SEED_ON_DEPLOY=true
   # SEED_ADMIN_CORREO=admin@utb.edu.co
   # SEED_ADMIN_PASSWORD=otra-clave-larga
   # SEED_TIENDAS_PASSWORD=clave-inicial-de-los-admins-de-tienda
   ```

   Con `SEED_ADMIN_CORREO` y `SEED_ADMIN_PASSWORD`, la siembra crea el
   administrador general inicial (solo si `SEED_ON_DEPLOY=true`; volver a
   sembrar no cambia su contraseña). Desde la API 0.5.0 ese administrador
   **solo supervisa** ([ADR 0017](adr/0017-admin-general-supervisa.md)); con
   `SEED_TIENDAS_PASSWORD` la siembra crea además un admin por tienda,
   `admin.<tienda>@utb.edu.co`, que es quien cambia stock, productos y pedidos.
   Cambiar `JWT_SECRET` cierra todas las sesiones abiertas.

   `SEED_ON_DEPLOY=true` hace que el servicio `seed` siembre los datos de
   demostración en **cada** despliegue. La siembra es idempotente, pero
   reinicia el precio, la descripción y la categoría de los productos demo a
   los valores de `app/seed.py` (no toca existencias ya creadas). Se recomienda
   `true` en el primer despliegue y luego `false` (o quitarla; el valor por
   defecto es `false`).

6. Desplegar y comprobar que `database` queda saludable, `migrate` termina con
   código 0 (`alembic upgrade head`), `seed` termina con código 0 (siembra u
   omite según `SEED_ON_DEPLOY`) y `backend` y `frontend` quedan saludables.
7. Opcional, datos de demostración: definir `SEED_ON_DEPLOY=true` (paso 5) y
   redesplegar. Alternativa manual, en la terminal del servidor desde la
   carpeta del despliegue:
   `docker compose -f deploy/compose.lab.yaml run --rm migrate python -m app.seed`.

**Volumen creado antes del ADR 0013.** El script que crea el rol de la API
solo corre al inicializar un volumen vacío, y `0001_esquema_inicial` borra
`catalog_products` e `inventory_stock`. Antes del primer despliegue con
migraciones, en este orden:

1. Si se quieren conservar, exportar los datos anteriores con
   `backend/scripts/exportar_datos_legado.py` (ver README).
2. Con `APP_DB_PASSWORD` ya definida, crear el rol de la API:
   `docker compose -f deploy/compose.lab.yaml exec database sh /docker-entrypoint-initdb.d/10-rol-aplicacion.sh`.
3. Redesplegar.

Los datos cargados en local con `python -m app.seed --desde-json` **no** viajan
en la imagen (`backend/datos_legado` no se copia). Para llevarlos a
producción: `pg_dump`/`pg_restore` de la base local, o ejecutar una vez esa
carga en el servidor montando la carpeta, por ejemplo
`docker compose -f deploy/compose.lab.yaml run --rm -v "$PWD/backend/datos_legado:/datos" migrate python -m app.seed --desde-json /datos/<archivo>.json`.

## Publicar el frontend

En **Domains**, crear o generar un dominio con estos valores:

- Service: `frontend`
- Container Port: `3000`
- Path: `/`
- HTTPS y Let's Encrypt cuando el DNS definitivo ya apunte al servidor

El dominio vigente es
`https://tiendautb-sistema-n0ojjk-fde272-144-24-4-187.sslip.io/`, generado por
la plataforma (`sslip.io` resuelve el nombre hacia la IP del servidor). Es un
dominio temporal: sirve para la demostración, pero para la entrega conviene
registrar uno propio y apuntarlo por DNS. Mientras tanto, si Traefik no
consigue emitir el certificado, presenta su **certificado autofirmado** y el
navegador avisa de que la conexión no es privada: es un aviso del navegador,
no un fallo del despliegue.

No se debe crear dominio ni mapeo de puerto para `database`. Mientras la API
sea privada, tampoco se crea dominio para `backend`; Next.js la alcanza como
`http://backend:8000` dentro del Compose. Si después se necesita publicar la
API, se asigna un dominio al servicio `backend` y al puerto `8000` sin cambiar
`API_URL`.

## Redesplegar tras fusionar

Conectar el repositorio **no** basta: el servicio de Compose usa la rama
configurada, pero la imagen del frontend solo se reconstruye cuando se
redespliega. Después de cada fusión en `main` hay que, en el panel, pulsar
**Redeploy** en el servicio de Docker Compose. Opcionalmente, activar
**Autodeploy** en el servicio (webhook de GitHub) para que cada push a la rama
configurada redespliegue solo.

Comprobación rápida de que la imagen se reconstruyó de verdad: el `<title>` de
la portada pasa de `Tienda Virtual UTB` a
`Cafetería del campus: cinco tiendas, un solo pase · Tienda Virtual UTB`.

> `NEXT_PUBLIC_SITIO_URL` se hornea en el bundle durante el build, así que
> también queda congelado en la imagen: si cambia el dominio, hay que
> redeployar (y no solo reiniciar) para que `sitemap.xml`, `robots.txt` y las
> URLs canónicas apunten al sitio nuevo. Se pasa como `build.args` desde
> `deploy/compose.lab.yaml`.

## Vencimiento de pedidos sin pago

La saga de pedidos ([diseño](idempotencia-saga-s11.md), F-01) cancela los
pedidos `pendiente_pago` con más de 24 horas y devuelve sus unidades al
stock. No corre dentro de la API: es un comando idempotente que se programa
en Dokploy, en el servicio Compose → **Schedules** → *Create Schedule*:

| Campo | Valor |
|---|---|
| Service | `backend` |
| Cron | `*/15 * * * *` (cada 15 minutos) |
| Command | `python -m app.tareas.vencer_pedidos` |

Usa la misma conexión que la API (rol sujeto a RLS) con el principal del
sistema; dos ejecuciones simultáneas no procesan el mismo pedido
(`SKIP LOCKED`). Cada ejecución deja en el log una línea JSON
`pedidos_vencidos` con el número de pedidos cancelados. Prueba manual:
`docker compose -f deploy/compose.lab.yaml exec backend python -m app.tareas.vencer_pedidos`.

## Persistencia y copias de seguridad

La base utiliza el volumen nombrado `postgres_data`. Configurar en Dokploy una
copia periódica de ese volumen hacia almacenamiento externo. Antes de depender
de ella, ejecutar al menos una restauración de prueba en un stack separado.

Un redespliegue normal no elimina el volumen. No ejecutar `docker compose down
-v` ni eliminar el volumen desde Dokploy salvo que se quiera borrar
deliberadamente toda la base.

## Verificación

- Abrir el dominio del frontend y confirmar la portada nueva: el titular es
  «Cinco puntos. Un solo pase.» y el `<title>` es
  `Cafetería del campus: cinco tiendas, un solo pase · Tienda Virtual UTB`.
- Comprobar que las cinco tiendas responden y que sus fotos cargan:
  `/tiendas/almuerzo-01`, `/tiendas/antojos`, `/img/cafeteria-01.jpg`.
- Revisar los logs de `migrate` y `seed`: deben terminar con código 0 (el
  esquema lo crea `migrate`; `seed` siembra solo con `SEED_ON_DEPLOY=true`). El
  `backend` ya no crea esquema ni siembra al arrancar.
- Desde la terminal interna del frontend, consultar
  `http://backend:8000/health/ready`; debe responder HTTP 200.
- Confirmar en el servidor que 3000, 8000 y 5432 no están publicados como
  puertos del host.
- Confirmar que `sitemap.xml` y `robots.txt` responden con el dominio público y
  no con `http://localhost:3000`.

> Desde la API 0.4.0 el catálogo que muestra la web lo sirve la API: Next.js lo
> lee en el servidor (`API_URL`) y el navegador habla con la API a través del
> proxy interno `/api/proxy` ([ADR 0012](adr/0012-proxy-interno-api.md)). El
> backend no necesita dominio público.

Para validar antes de subir cambios:

```bash
POSTGRES_PASSWORD=temporal APP_DB_PASSWORD=temporal2 JWT_SECRET=temporal3 docker compose -f deploy/compose.lab.yaml config
POSTGRES_PASSWORD=temporal APP_DB_PASSWORD=temporal2 JWT_SECRET=temporal3 docker compose -f deploy/compose.lab.yaml build
python -m pytest -c backend/pytest.ini backend/tests   # requiere DATABASE_URL de pruebas (README)
pnpm --dir frontend run build                          # requiere pnpm (ADR 0015)
```

## Subir 0.5.0

La versión 0.5.0 trae un cambio de **comportamiento** además del código: el
administrador general deja de editar y cada tienda pasa a tener su propio admin
([ADR 0017](adr/0017-admin-general-supervisa.md)). Incluye la migración
`0004_admin_general_supervisa` (funciones y políticas RLS; no cambia tablas ni
datos) y los arreglos del pool de conexiones y del frontend
([CHANGELOG](../CHANGELOG.md)). Este runbook se sigue en orden; los comandos se
ejecutan en la terminal del servidor, desde la carpeta del despliegue.

### 1. Antes de desplegar

1. **Fusionar** las ramas en `main` en el orden del stack (ver
   [`pendientes.md`](pendientes.md)) y esperar el CI en verde: `ruff`, `pytest`
   con PostgreSQL, contrato OpenAPI y `pnpm` lint, typecheck, test y build.
2. **Respaldo** de la base, con el rol dueño:

   ```bash
   docker compose -f deploy/compose.lab.yaml exec -T database \
     sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > respaldo-pre-0.5.0.dump
   ls -lh respaldo-pre-0.5.0.dump   # no debe estar vacío
   ```

   Guardar el archivo fuera del servidor. La restauración, si hiciera falta:
   `pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists`.
3. **Quién gestionará cada tienda.** Tras migrar, solo un `admin_tienda` (o
   `responsable_inventario`) cambia los datos de su tienda. Revisar los roles
   actuales:

   ```bash
   docker compose -f deploy/compose.lab.yaml exec database \
     sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT u.correo, r.rol_codigo, t.identificador FROM usuario_roles r JOIN usuarios u ON u.id = r.usuario_id LEFT JOIN tiendas t ON t.id = r.tienda_id ORDER BY 2, 3"'
   ```

   Si una tienda no tiene admin, se crea con el paso 2.2.
4. **Secreto nuevo** en Dokploy → Environment:
   `SEED_TIENDAS_PASSWORD=<clave larga, 8+ caracteres>`. Nunca en el
   repositorio ni en un chat; se comunica a cada tienda por un canal seguro, y
   cada admin la cambia tras su primer ingreso (cuando exista la pantalla; hoy,
   el general la reinicia por SQL).
5. Avisar a quien usa la cuenta del administrador general de que, desde esta
   versión, solo verá el panel en **modo supervisión**.

### 2. Desplegar

1. **Redeploy** del servicio Compose. El orden lo impone el propio
   `compose.lab.yaml`:
   - `database` saludable;
   - `migrate` ejecuta `alembic upgrade head` y aplica `0004`, y debe terminar
     con código 0;
   - `seed`, solo con `SEED_ON_DEPLOY=true`;
   - `backend`, y después `frontend`, que se reconstruye con el código nuevo.
2. **Crear los admins de tienda.** El servicio `seed` es el único que recibe
   `SEED_TIENDAS_PASSWORD`, `SEED_ADMIN_*` y las credenciales del rol dueño. El
   `backend` no las tiene: correr `python -m app.seed` en su terminal no crea
   cuentas, porque RLS bloquea las escrituras. Hay dos caminos:
   - **Desde el panel de Dokploy** (el que se usó el 2026-10-24):
     1. En Environment, poner `SEED_ON_DEPLOY=true`.
     2. Hacer **Deploy**.
     3. Volver a `SEED_ON_DEPLOY=false`. No hace falta otro deploy.

     El log del contenedor `seed` debe terminar con
     `{"tiendas": 5, "productos": 55, …, "admin_general": 1, "admins_tienda": 5}`.
   - **Desde la terminal del servidor**:
     `docker compose -p <proyecto> --env-file deploy/.env -f deploy/compose.lab.yaml run --rm seed python -m app.seed`.

   La siembra es idempotente: no duplica cuentas ni cambia contraseñas
   existentes. Sí vuelve a escribir los productos demo, así que en una base con
   productos editados a mano conviene crear las cuentas de tienda por SQL o
   pedir un comando dedicado (pendiente).

#### Problemas encontrados al subir la 0.5.0 (2026-10-24)

| Síntoma | Causa | Arreglo |
|---|---|---|
| El deploy falla con `required variable JWT_SECRET is missing a value` | Desde la 0.4.0 la API exige `JWT_SECRET`, y Compose falla antes de construir; producción sigue en la versión anterior | Definir `JWT_SECRET` (`openssl rand -hex 32`) en Environment y volver a desplegar |
| `/health` da 200, pero `/health/ready` da «base de datos no disponible» y el catálogo y el login dan 500. El log del backend muestra `password authentication failed for user "tienda_app"` | El volumen de la base es anterior al ADR 0014. El script que crea o actualiza `tienda_app` solo corre con un volumen vacío, así que la contraseña del rol no coincide con `APP_DB_PASSWORD` | En la terminal del contenedor `database` (Containers → ⋯ → Terminal), ejecutar `sh /docker-entrypoint-initdb.d/10-rol-aplicacion.sh`. Es idempotente, iguala la contraseña a `APP_DB_PASSWORD` y no toca datos. La API se reconecta sola |
| `No module named app.seed` en la terminal del backend | La terminal de Dokploy no abre en `/app` | `cd /app` primero (de todas formas, las cuentas se crean con el servicio `seed`, ver el paso 2) |

### 3. Verificar

1. `http://backend:8000/health/ready` responde 200, desde la terminal del
   frontend.
2. `migrate` muestra en su log `Running upgrade 0003_producto_presentacion ->
   0004_admin_general_supervisa`.
3. Entrar como `admin.antojos@utb.edu.co`:
   - el panel dice «Gestionas Antojos.»;
   - solo aparece Antojos en filtros, inventario y cola;
   - un ajuste de stock con + se guarda.
4. Entrar como el administrador general:
   - aparece el aviso «Modo supervisión» y «Supervisas 5 tiendas.»;
   - no hay «Producto nuevo» ni «Editar»;
   - − / + están deshabilitados;
   - la cola no tiene botones.
5. Comprobación de la API. Un ajuste del general debe responder **403** con
   «El administrador general solo supervisa…»; usar un token del general:

   ```bash
   curl -s -X POST http://backend:8000/inventory/1/adjust \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"delta":1,"motivo":"conteo"}'
   ```

6. Schedule `vencer_pedidos`: ejecutarlo a mano una vez
   (`docker compose -f deploy/compose.lab.yaml exec backend python -m
   app.tareas.vencer_pedidos`). Debe terminar sin error y dejar la línea
   `pedidos_vencidos`; ahora actúa como principal **sistema**.

### 4. Volver atrás

La migración se revierte **con la imagen 0.5.0**, antes de redesplegar la
anterior: la imagen vieja no conoce la revisión `0004` y su `migrate`
fallaría.

```bash
docker compose -f deploy/compose.lab.yaml run --rm migrate alembic downgrade 0003_producto_presentacion
```

Después, en Dokploy, desplegar el commit anterior. El `downgrade` restaura las
funciones y políticas de `0002` (el general vuelve a editar). Las cuentas
`admin.<tienda>` quedan creadas, con su rol; si no se quieren, se borran sus
filas de `usuario_roles`. El respaldo del paso 1.2 solo hace falta si se
perdieran datos, porque la migración no toca tablas.


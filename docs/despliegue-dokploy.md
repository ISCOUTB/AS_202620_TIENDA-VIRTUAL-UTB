# Despliegue en Dokploy

La fuente de producción es `deploy/compose.lab.yaml`. El stack ejecuta Next.js,
FastAPI y PostgreSQL en una red privada; solo Next.js recibe tráfico público.

## Crear el servicio

1. En Dokploy, crear un proyecto y un servicio de tipo **Docker Compose** (no
   Docker Stack).
2. Conectar este repositorio y la rama que se quiera desplegar.
3. Establecer **Compose Path** en `./deploy/compose.lab.yaml`.
4. Activar **Isolated Deployments**.
5. En **Environment**, definir dos contraseñas largas, únicas y distintas: la
   del rol dueño (migraciones y siembra) y la del rol de la API, sujeto a RLS
   ([ADR 0014](adr/0014-seguridad-rls.md)):

   ```dotenv
   POSTGRES_PASSWORD=valor-secreto
   APP_DB_PASSWORD=otro-valor-secreto
   # Opcionales:
   # POSTGRES_USER=tienda_utb
   # POSTGRES_DB=tienda_utb
   # APP_DB_USER=tienda_app
   # SEED_ON_DEPLOY=true
   ```

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

> El catálogo que muestra la web es **estático** y vive en
> `frontend/lib/catalogo.ts`; la API no interviene en el HTML. La API se usa
> desde el navegador para el acceso y los pedidos, y por eso necesita un
> camino público (proxy interno del frontend o dominio propio para `backend`).

Para validar antes de subir cambios:

```bash
POSTGRES_PASSWORD=temporal APP_DB_PASSWORD=temporal2 docker compose -f deploy/compose.lab.yaml config
POSTGRES_PASSWORD=temporal APP_DB_PASSWORD=temporal2 docker compose -f deploy/compose.lab.yaml build
python -m pytest -c backend/pytest.ini backend/tests   # requiere DATABASE_URL de pruebas (README)
pnpm --dir frontend run build                          # requiere pnpm (ADR 0015)
```

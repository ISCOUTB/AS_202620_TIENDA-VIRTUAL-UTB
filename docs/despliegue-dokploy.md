# Despliegue en Dokploy

La fuente de producción es `deploy/compose.lab.yaml`. El stack ejecuta Next.js,
FastAPI y PostgreSQL en una red privada; solo Next.js recibe tráfico público.

## Crear el servicio

1. En Dokploy, crear un proyecto y un servicio de tipo **Docker Compose** (no
   Docker Stack).
2. Conectar este repositorio y la rama que se quiera desplegar.
3. Establecer **Compose Path** en `./deploy/compose.lab.yaml`.
4. Activar **Isolated Deployments**.
5. En **Environment**, definir una contraseña larga y única:

   ```dotenv
   POSTGRES_PASSWORD=valor-secreto
   # Opcionales:
   # POSTGRES_USER=tienda_utb
   # POSTGRES_DB=tienda_utb
   ```

6. Desplegar y comprobar que `database`, `backend` y `frontend` terminan
   saludables en ese orden.

## Publicar el frontend

En **Domains**, crear o generar un dominio con estos valores:

- Service: `frontend`
- Container Port: `3000`
- Path: `/`
- HTTPS y Let's Encrypt cuando el DNS definitivo ya apunte al servidor

No se debe crear dominio ni mapeo de puerto para `database`. Mientras la API
sea privada, tampoco se crea dominio para `backend`; Next.js la alcanza como
`http://backend:8000` dentro del Compose. Si después se necesita publicar la
API, se asigna un dominio al servicio `backend` y al puerto `8000` sin cambiar
`API_URL`.

## Persistencia y copias de seguridad

La base utiliza el volumen nombrado `postgres_data`. Configurar en Dokploy una
copia periódica de ese volumen hacia almacenamiento externo. Antes de depender
de ella, ejecutar al menos una restauración de prueba en un stack separado.

Un redespliegue normal no elimina el volumen. No ejecutar `docker compose down
-v` ni eliminar el volumen desde Dokploy salvo que se quiera borrar
deliberadamente toda la base.

## Verificación

- Abrir el dominio del frontend y confirmar que aparecen los cuatro productos.
- Revisar los logs de `backend`: el arranque debe crear el esquema y sembrar el
  catálogo sin errores.
- Desde la terminal interna del frontend, consultar
  `http://backend:8000/health/ready`; debe responder HTTP 200.
- Confirmar en el servidor que 3000, 8000 y 5432 no están publicados como
  puertos del host.

Para validar antes de subir cambios:

```bash
POSTGRES_PASSWORD=temporal docker compose -f deploy/compose.lab.yaml config
POSTGRES_PASSWORD=temporal docker compose -f deploy/compose.lab.yaml build
python -m pytest -c backend/pytest.ini backend/tests
npm --prefix frontend run build
```

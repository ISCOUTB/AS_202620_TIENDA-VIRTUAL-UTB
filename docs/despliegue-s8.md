# Despliegue S8 — guía reproducible

> **Estado:** infraestructura como código y pipeline listos; el despliegue lo
> ejecuta el equipo siguiendo esta guía (las cuentas son personales).
> **Fecha:** 2026-09-26. **Trazabilidad:** ADR [0003](adr/0003-frontend-vercel.md),
> [0004](adr/0004-api-contenedor-render.md), [0005](adr/0005-postgres-neon.md);
> costos en [`costos-despliegue.md`](costos-despliegue.md).

## Dónde corre cada pieza

| Pieza | Plataforma | Forma | Por qué (resumen) |
|---|---|---|---|
| Cliente web (Next.js) | **Vercel** | Funciones/SSR + CDN | Desplegar Next.js en su plataforma nativa es gratis sin tarjeta y da HTTPS + CDN automáticos |
| API (FastAPI) | **Render** | Contenedor Docker | El `lifespan` crea esquema+seed y mantiene pool de conexiones: es proceso de larga duración, no función (cold start rompería el escenario 3, <2 s) |
| Base de datos | **Neon** | PostgreSQL serverless gestionado | Capa gratuita sin tarjeta, no expira (la Postgres gratis de Render expira a los ~30 días) |
| Monitor externo | **UptimeRobot** | Ping HTTP cada 5 min a `/health` | Gratis sin tarjeta; evita la suspensión del plan free de Render y produce evidencia de disponibilidad |

Todas las piezas tienen capa gratuita **sin tarjeta de crédito** (restricción de
la consigna). La URL pública la entrega Vercel (`*.vercel.app`) y es accesible
desde cualquier red.

## Paso 1 — Base de datos (Neon)

> **Hecho el 2026-09-27 vía Neon CLI:** proyecto `wandering-star-51602409`
> vinculado (rama `production`), PostgreSQL 18.6 verificado con el driver real
> del backend (`SELECT 1` + `TestClient`: esquema creado y catálogo sembrado,
> `/health/ready` → 200). La configuración quedó versionada en `neon.ts`
> (bucket `media` con `public_read` para futuras imágenes) y las credenciales
> en `.env` (git-ignorado), no en el repo.

Pasos ejecutados (reproducibles con `npm i -g neon`):

```bash
neon login
neon link --project-id wandering-star-51602409 --branch production
neon config init   # → neon.ts (política de ramas + buckets)
neon deploy        # aplica la política; idempotente ("no changes" si ya coincide)
```

La cadena `DATABASE_URL` resultante **es un secreto**: vive en `.env` local y
debe copiarse a las variables de entorno de Render, nunca al repositorio.

## Paso 2 — API (Render, IaC con `render.yaml`)

1. Crear cuenta en <https://render.com> (login con GitHub).
2. `New +` → `Blueprint` → seleccionar este repositorio → Render detecta
   `render.yaml` y crea el web service `tienda-utb-api` (Docker, plan free,
   `healthCheckPath: /health`, autodeploy en `main`).
3. Al crearse, pedirá el valor de `DATABASE_URL` (`sync: false` lo marca como
   secreto): pegar la cadena de Neon.
4. Cuando el deploy termine, la API queda en
   `https://tienda-utb-api.onrender.com`. Verificar:
   `curl https://tienda-utb-api.onrender.com/health` → `{"status":"ok"}`.

## Paso 3 — Cliente web (Vercel)

1. Crear cuenta en <https://vercel.com> (login con GitHub).
2. `Add New → Project` → importar este repo → **Root Directory: `frontend`**.
3. Variable de entorno `API_URL=https://tienda-utb-api.onrender.com`
   (la petición la hace el servidor de Next.js, no el navegador, así que no se
   necesita `NEXT_PUBLIC_` ni CORS).
4. Deploy → URL pública `https://<proyecto>.vercel.app`. **Esta es la URL que
   se entrega**: el evaluador la abre y la página consulta la API.

## Paso 4 — Monitor (UptimeRobot)

1. Cuenta gratuita en <https://uptimerobot.com> (sin tarjeta).
2. Monitor tipo HTTP(s) → `https://tienda-utb-api.onrender.com/health`,
   intervalo 5 min.
3. Efecto doble: el plan free de Render suspende el servicio tras ~15 min sin
   tráfico (cold start ~50 s en la primera carga); el ping lo mantiene activo
   **y** deja un registro externo de disponibilidad del escenario 4.

## Paso 5 — SonarCloud en el pipeline

1. En <https://sonarcloud.io> (organización `isco-utb`) registrar el
   repositorio y copiar el `projectKey` generado; si difiere del de
   `sonar-project.properties`, ajustar ese archivo.
2. Generar token (`My Account → Security`) y crear en GitHub el secreto de
   repositorio `SONAR_TOKEN` (Settings → Secrets and variables → Actions).
3. El job `sonarcloud` de `.github/workflows/tests.yml` corre en cada push/PR.

## Protección de rama (bloqueo del merge)

En GitHub → Settings → Branches → regla sobre `main`: activar *Require status
checks to pass before merging* y marcar los checks `backend` y `sonarcloud`.
Es configuración de la plataforma, no de archivos: este paso es el que convierte
«pipeline en verde» en «bloquea el merge ante fallos».

## Protección de secretos — evidencia

| Variable | Dónde vive | Dónde NO |
|---|---|---|
| `DATABASE_URL` (Neon) | Variables de entorno de Render (`sync: false`) | Repositorio |
| `POSTGRES_PASSWORD` (local) | `.env` local — ignorado por git (`.gitignore`) | `compose.yaml` lo exige con `${VAR:?}`; sin `.env` el arranque falla con mensaje claro |
| `SONAR_TOKEN` | Secreto de repositorio en GitHub Actions | Repositorio |
| `API_URL` (frontend) | Variables de Vercel — es una URL pública, no secreto | — |

Verificación ejecutable: `git grep -niE "password|token|secret" -- compose.yaml`
no devuelve valores literales, solo interpolaciones `${...}`.

## Verificación de la entrega

| Ítem | Comprobación |
|---|---|
| URL pública | Abrir `https://<proyecto>.vercel.app` desde fuera de la red UTB |
| IaC versionada | `render.yaml` + `frontend/vercel.json` + `compose.yaml` en el repo |
| Pipeline en verde | Checks `backend` + `sonarcloud` pasando en el último commit de `main` |
| Health check | `/health` (liveness) y `/health/ready` (readiness contra la BD) |
| Logs estructurados | Dashboard de Render → Logs: una línea JSON por petición. Ejemplo real (`backend/app/shared/logging.py` + `metrics.py`): `{"timestamp":"2026-09-26T00:00:25.984+00:00","level":"info","logger":"tienda.http","message":"http_request","method":"GET","path":"/catalog/products","route":"/catalog/products","status_code":200,"duration_ms":2.83}` |
| Métrica consultable | `GET /metrics` devuelve conteo, errores 5xx y latencia p50/p95 por ruta, ligada al escenario 4 |
| Secretos protegidos | Tabla anterior + `.env.example` documentado + `git grep` sin hallazgos |
| Costo mensual | [`costos-despliegue.md`](costos-despliegue.md): $0/mes con supuestos declarados |

## Rebuild desde cero

Borrar los tres servicios en las plataformas y repetir los pasos 1–4: el estado
se reconstruye porque el esquema y el catálogo mockeado se crean solos al
arrancar (`lifespan` idempotente) y toda la configuración está versionada.

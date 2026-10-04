# Despliegue S8 — guía histórica

> **Sustituido el 2026-10-04.** Este documento conserva evidencia del despliegue
> anterior. Para operar el sistema vigente use
> [`despliegue-dokploy.md`](despliegue-dokploy.md).

> **Estado: DESPLEGADO el 2026-09-27.** URLs verificadas:
>
> - **Aplicación (URL de entrega):** <https://tienda-virtual-utb-acme-8eed.vercel.app>
> - **API:** <https://tienda-utb-api.onrender.com>
>   ([/health](https://tienda-utb-api.onrender.com/health),
>   [/health/ready](https://tienda-utb-api.onrender.com/health/ready),
>   [/metrics](https://tienda-utb-api.onrender.com/metrics))
> - **BD:** Neon `wandering-star-51602409`, rama `production`
>
> Verificado end-to-end desde fuera de cualquier red UTB: la página renderiza
> los 4 productos del catálogo (SSR → API → Neon), `http=200` en todos los
> endpoints operativos.
>
> **Trazabilidad:** ADR [0003](adr/0003-frontend-vercel.md),
> [0004](adr/0004-api-contenedor-render.md), [0005](adr/0005-postgres-neon.md);
> costos en [`costos-despliegue.md`](costos-despliegue.md).
>
> **Este documento describe la infraestructura que está en servicio, no la
> forma en que se declarará a partir de ahora.** La siguiente iteración la
> declara con Terraform (ADR
> [0006](adr/0006-infra-como-codigo-terraform.md)), lo que deja obsoletos el
> paso 2, el paso 3 y la protección de rama como *procedimiento*, aunque lo que
> aquí se verificó sigue siendo cierto. Ese proceso —y el corte— está en
> [`despliegue-terraform.md`](despliegue-terraform.md). Hasta que se aplique,
> esta guía sigue siendo la que describe producción.

## Dónde corre cada pieza

| Pieza | Plataforma | Forma | Por qué (resumen) |
|---|---|---|---|
| Cliente web (Next.js) | **Vercel** | Funciones/SSR + CDN | Desplegar Next.js en su plataforma nativa es gratis sin tarjeta y da HTTPS + CDN automáticos |
| API (FastAPI) | **Render** | Contenedor Docker | El `lifespan` crea esquema+seed y mantiene pool de conexiones: es proceso de larga duración, no función (cold start rompería el escenario 3, <2 s) |
| Base de datos | **Neon** | PostgreSQL serverless gestionado | Capa gratuita sin tarjeta, no expira (la Postgres gratis de Render expira a los ~30 días) |
| Monitor externo | **GitHub Actions** | Cron `curl /health` cada 10 min | Gratis sin tarjeta ni cuenta nueva; evita la suspensión del plan free de Render. UptimeRobot se evaluó y se descartó por requerir una cuenta más (`docs/ia.md`) |

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

> **Hecho:** servicio `tienda-utb-api` (`srv-dasmvs0473hc73921aj0`) creado vía
> API de Render el 2026-09-27, equivalente al blueprint `render.yaml`
> (Docker, plan free, `healthCheckPath: /health`, autodeploy en `main`),
> `DATABASE_URL` inyectada como variable de entorno del servicio.
>
> **Sustituido por ADR 0006:** el servicio se declara ahora en
> `infra/render-web-service.tf`, que además aporta algo que este paso no
> lograba: `DATABASE_URL` se toma del proyecto de Neon declarado en el mismo
> repositorio, así que la copia manual entre consolas desaparece. `render.yaml`
> conserva el histórico hasta el corte.

Pasos (dashboard) o equivalente API (`POST /v1/services`):

1. Crear cuenta en <https://render.com> (login con GitHub).
2. `New +` → `Blueprint` → seleccionar este repositorio → Render detecta
   `render.yaml` y crea el web service `tienda-utb-api`.
3. `DATABASE_URL` es secreto (`sync: false`): se define en el dashboard o por
   API, nunca en el repo.
4. Verificar: `curl https://tienda-utb-api.onrender.com/health` → `{"status":"ok"}`.

## Paso 3 — Cliente web (Vercel)

> **Hecho:** proyecto `tienda-virtual-utb` (equipo `acme-8eed`) desplegado con
> `vercel deploy --prod`; `API_URL` definida como secreto de producción.
> Nota: la cuenta tenía "Deployment Protection" (SSO) activa en dominios
> `*.vercel.app` — se desactivó vía `PATCH /v9/projects` (`ssoProtection:
> null`) para que la URL sea pública. El `git connect` automático queda
> pendiente de vincular la cuenta de Vercel con GitHub en el dashboard.
>
> **Lo que ADR 0006 aclara:** no es un paso olvidado, es una limitación del
> plan. Vercel Hobby no conecta proyectos con repositorios de una
> **organización** de GitHub, y este repositorio está en la organización
> `ISCOUTB`. Por eso la infraestructura declarada en Terraform incluye el
> proyecto y su variable `API_URL`, pero no la conexión a GitHub: el
> despliegue a producción lo dispara el pipeline o la CLI.

Pasos (dashboard) o CLI:

1. Crear cuenta en <https://vercel.com> (login con GitHub).
2. `Add New → Project` → importar este repo → **Root Directory: `frontend`**
   (o `vercel link` + `vercel deploy --prod` dentro de `frontend/`).
3. Variable de entorno `API_URL=https://tienda-utb-api.onrender.com`
   (la petición la hace el servidor de Next.js, no el navegador, así que no se
   necesita `NEXT_PUBLIC_` ni CORS).
4. URL pública: <https://tienda-virtual-utb-acme-8eed.vercel.app>.
   **Esta es la URL que se entrega.**

## Paso 4 — Monitor anti-suspensión

> **Hecho vía CI:** `.github/workflows/keepalive.yml` hace `curl /health` cada
> 10 min (GitHub Actions cron) — mantiene despierto el plan free de Render sin
> depender de otra cuenta. Alternativa externa con dashboard de uptime:
> monitor gratuito de <https://uptimerobot.com> sobre `/health` cada 5 min
> (además produce evidencia de disponibilidad del escenario 4).

## Paso 5 — SonarCloud en el pipeline

> **Hecho:** el proyecto está registrado en la organización `isco-utb` con la
> clave `ISCOUTB_AS_202620_TIENDA-VIRTUAL-UTB` (coincide con
> `sonar-project.properties`) y SonarCloud lo analiza automáticamente en cada
> push — **Automatic Analysis, sin necesidad de `SONAR_TOKEN`**. Quality Gate
> público y verificable sin autenticación:
> <https://sonarcloud.io/dashboard?id=ISCOUTB_AS_202620_TIENDA-VIRTUAL-UTB>
> — **en verde** desde el análisis del 2026-09-27 20:20 UTC. Los hallazgos del
> primer análisis se corrigieron (action pineada a SHA, `--only-binary` en pip)
> y `.sonarcloud.properties` excluye los HTML generados (`docs/**/*.html`),
> que producían falsos positivos. El check `SonarCloud Code Analysis` aparece
> directamente en cada commit/PR de GitHub.
>
> Nota: el job `sonarcloud` del workflow queda como camino alternativo si se
> decide analizar desde CI — para activarlo hay que crear `SONAR_TOKEN` **y**
> desactivar Automatic Analysis (Administration → Analysis Method); con ambos
> activos el scan de CI falla por conflicto.

## Protección de rama (bloqueo del merge)

En GitHub → Settings → Branches → regla sobre `main`: activar *Require status
checks to pass before merging* y marcar los checks `backend`, `sonarcloud` y
`SonarCloud Code Analysis`. Es configuración de la plataforma, no de archivos:
este paso es el que convierte «pipeline en verde» en «bloquea el merge ante
fallos». **Pendiente del equipo.**

> **Sustituido por ADR 0006:** la regla pasa a ser el recurso
> `github_branch_protection.main` de `infra/`, y con ella queda versionada. Al
> aplicarlo desaparece la parte manual de este paso.
>
> **Un ajuste respecto a lo que se pedía aquí:** se requiere `backend` y
> `SonarCloud Code Analysis`, pero **no** el job `sonarcloud`, porque está
> condicionado a `if: env.SONAR_TOKEN != ''`. Mientras el equipo no cree ese
> secreto no se ejecuta y nunca reporta estado, y un check requerido sin estado
> bloquea todos los merges sin señal visible. Si algún día se crea
> `SONAR_TOKEN` y se desactiva el Análisis Automático, entonces sí conviene
> exigirlo también.

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
| URL pública | Abrir `https://tienda-virtual-utb-acme-8eed.vercel.app` desde fuera de la red UTB — verificado 2026-09-27: 200 con los 4 productos del catálogo |
| IaC versionada | `render.yaml` + `frontend/vercel.json` + `neon.ts` + `compose.yaml` en el repo |
| Pipeline en verde | Checks `backend` + `SonarCloud Code Analysis` pasando en el último commit de `main` — verificado en `b35b3e7` |
| Health check | `/health` (liveness) y `/health/ready` (readiness contra la BD) |
| Logs estructurados | Dashboard de Render → Logs: una línea JSON por petición. Ejemplo real (`backend/app/shared/logging.py` + `metrics.py`): `{"timestamp":"2026-09-26T00:00:25.984+00:00","level":"info","logger":"tienda.http","message":"http_request","method":"GET","path":"/catalog/products","route":"/catalog/products","status_code":200,"duration_ms":2.83}` |
| Métrica consultable | `GET /metrics` devuelve conteo, errores 5xx y latencia p50/p95 por ruta, ligada al escenario 4 |
| Secretos protegidos | Tabla anterior + `.env.example` documentado + `git grep` sin hallazgos |
| Costo mensual | [`costos-despliegue.md`](costos-despliegue.md): $0/mes con supuestos declarados |

## Rebuild desde cero

Borrar los tres servicios en las plataformas y repetir los pasos 1–4: el estado
se reconstruye porque el esquema y el catálogo mockeado se crean solos al
arrancar (`lifespan` idempotente) y toda la configuración está versionada.

# Tienda Virtual UTB

Proyecto académico para diseñar una tienda virtual dirigida a la comunidad de la Universidad Tecnológica de Bolívar (UTB).

## Ver la tienda en línea

**<https://tiendautb-sistema-n0ojjk-fde272-144-24-4-187.sslip.io/>**

Cinco puntos, un solo pase: Antojos, Punto Fit, Alegría y los dos almuerzos del
campus. Catálogo con existencias, horario en vivo y reserva de hora de
recogida, con pago en el mostrador.

El sitio se despliega en Dokploy desde
[`deploy/compose.lab.yaml`](deploy/compose.lab.yaml) — Next.js, FastAPI y
PostgreSQL 17 en un único stack. El dominio actual es el que genera la
plataforma de despliegue; el definitivo se configurará allí
([guía de despliegue](docs/despliegue-dokploy.md)).

## Equipo

| Integrante | Correo institucional | Codigo Institucional |
|---|---|---|
| Levis Adrian Ortiz Cano | levortiz@utb.edu.co | T00083674 |
| Alejandro Patron Montero | patrona@utb.edu.co | T00078181 |
| Shalom Jhoanna Arrieta Marrugo | sharrieta@utb.edu.co | T00082962 |
| Jasen Mihovil Yukopila Escobar| jyukopila@utb.edu.co | T00083873 |


## Problema

La comunidad UTB necesita un canal centralizado y confiable para consultar y adquirir productos de la cafetería. La información sobre productos, precios, existencias y pedidos puede encontrarse dispersa o depender de gestiones manuales. La Tienda Virtual UTB busca facilitar este proceso mediante un catálogo digital y la gestión básica de pedidos e inventario.

La descripción completa de usuarios, alcance y tensiones de calidad se encuentra
en la [ficha del problema](docs/problema.md).

## Evidencia S1

- [Ficha del problema](docs/problema.md)
- [Aspectos de calidad](docs/aspectos.md)
- [Registro de uso de inteligencia artificial](docs/ia.md)
- [Disponibilidad técnica y de despliegue](docs/disponibilidad.md)
- [Documentación arc42](docs/arc42/arc42-template-EN.md)

## Evidencia S2

- [arc42 secciones 1-3](docs/arc42/arc42-template-EN.md) (Introduction and Goals, Architecture Constraints, Context and Scope)
- [Árbol de utilidad](docs/arbol-utilidad.md)
- [Escenarios de calidad](docs/escenarios-calidad.md)
- [C4 de contexto](docs/c4/context.md)

## Evidencia S3 — estrategia y esqueleto ejecutable

- [arc42 sección 4: estrategia de solución](docs/arc42/arc42-template-EN.md)
- [Matriz comparativa de estilos arquitectónicos](docs/matriz-comparativa-arquitectura.md)
- [ADR 0001: monolito modular](docs/adr/0001-monolito-modular.md)

La estrategia elegida es un **monolito modular**: un backend FastAPI único,
separado inicialmente en identidad, catálogo, inventario y pedidos. Next.js es
el cliente web y PostgreSQL el almacenamiento.

## Evidencia S4 — incremento arc42, C4 y corte vertical

- [arc42 secciones 1–6, 9, 10 y glosario](docs/arc42/arc42-template-EN.md) — el
  documento arc42 se mantiene en inglés (`arc42-template-EN.md`). Este incremento
  añade las secciones 5–6 (bloques de construcción y tiempo de ejecución), 9
  (decisiones), 10 (requisitos de calidad) y el glosario inicial; por continuidad
  del documento también quedan pobladas 7 (despliegue), 8 (conceptos
  transversales) y 11 (riesgos).
- [C4 nivel 1 — contexto](docs/c4/context.md) y [C4 nivel 2 — contenedores](docs/c4/container.md)
- [Tabla de aspectos de calidad](docs/aspectos.md) (fila de disponibilidad completa hasta pruebas)

### Corte vertical ejecutable: consultar el catálogo

Una funcionalidad implementada de extremo a extremo sobre el esqueleto:

```
Navegador → Next.js (frontend/app/page.tsx)
          → FastAPI  GET /catalog/products  (backend/app/modules/catalog/router.py)
          → repositorio + ORM SQLAlchemy    (repository.py, models.py)
          → PostgreSQL  tabla catalog_products  (sembrada al arrancar, seed.py)
```

- La API arranca creando el esquema y sembrando un catálogo mockeado de forma
  idempotente (`backend/app/main.py`, `lifespan`).
- El cliente web renderiza la lista de productos en el servidor; si la API no
  responde, muestra un mensaje de error en lugar de fallar.

Comandos:

```bash
# Arrancar el corte vertical completo (web + API + base de datos)
docker compose up --build

# Correr la prueba automatizada del corte vertical (sin contenedores)
python -m pip install -r backend/requirements-dev.txt
python -m pytest -c backend/pytest.ini backend/tests/test_catalog.py
```

Tras el arranque: <http://localhost:3000> (catálogo) y
<http://localhost:8000/catalog/products> (JSON).

Los módulos `identity`, `inventory` y `orders` siguen siendo paquetes vacíos,
reservados para incrementos posteriores.

> **Nota (2026-10-22):** esta sección describe el estado de S4. Desde el
> [ADR 0013](docs/adr/0013-migraciones-alembic-y-esquema.md) el esquema lo crea
> Alembic, la siembra es un comando explícito y las pruebas requieren
> PostgreSQL; ver [Arranque local](#arranque-local) y
> [Pruebas automatizadas](#pruebas-automatizadas).

## Evidencia S6 — contextos delimitados y deuda arquitectónica

- [Mapa de contextos (bounded contexts) y tabla de módulos con dueño único](docs/bounded-contexts.md)
- [Violaciones detectadas en el código actual con plan de corrección](docs/violaciones-s6.md)

El mapa reinterpreta los módulos del ADR 0001 como contextos delimitados con
dueño único (rol de negocio), y `violaciones-s6.md` lista las desviaciones
reales del código frente a esa propiedad de datos y la propuesta de corrección.

## Evidencia de incremento con apoyo de IA

- [Cadena completa: aspectos, ADR, código, pruebas, medición y auditoría](docs/entrega-cadena-ia.md)
- [ADR 0008: separación Catálogo–Inventario, pendiente de ratificación](docs/adr/0008-separar-catalogo-inventario.md)
- [ADR 0009: no incorporar generación en ejecución, pendiente de ratificación](docs/adr/0009-sin-componente-generativo.md)

## Evidencia de contrato e integración

- [Administrador de la tienda y flujo de gestión de productos (diseño previsto)](docs/api/administracion-catalogo.md)
- [Documentación de la API, diagramas y explicación de `/health`](docs/api/contrato-api.md)
- [Guía de la evidencia y comandos de verificación](docs/api/README.md)
- [Contrato OpenAPI 3.1.0, versión de API 0.4.0](docs/api/openapi.json)
- [ADR 0002: integración HTTP y contrato versionado](docs/adr/0002-contrato-integracion-http.md)
- [ADR 0011: sesión del frontend en almacenamiento local, con migración a cookie httpOnly](docs/adr/0011-sesion-localstorage.md)
- [ADR 0012: proxy interno same-origin hacia la API, sin publicar el backend](docs/adr/0012-proxy-interno-api.md)
- [ADR 0015: pnpm como gestor de paquetes del frontend](docs/adr/0015-gestor-paquetes-pnpm.md)
- [ADR 0016: autenticación con JWT HS256 y contraseñas Argon2id](docs/adr/0016-autenticacion-jwt.md)
- [Pruebas de contrato](backend/tests/contract/test_openapi.py) ejecutadas en el
  [pipeline](.github/workflows/tests.yml), con reporte descargable.

## Despliegue reproducible, CI y observabilidad

El despliegue vigente se ejecuta en Dokploy desde
[`deploy/compose.lab.yaml`](deploy/compose.lab.yaml): Next.js, FastAPI y
PostgreSQL 17 en un único stack. Solo el frontend recibe un dominio público:
**<https://tiendautb-sistema-n0ojjk-fde272-144-24-4-187.sslip.io/>**. Ese
dominio lo genera la plataforma de despliegue; el definitivo se configurará en
Dokploy y, cuando exista, se registrará aquí.

> Tras fusionar en `main`, el servicio de Dokploy hay que **redesplegarlo**
> (Redeploy en el panel): el repositorio queda conectado, pero la imagen del
> frontend solo se reconstruye en ese paso. Es el origen del despliegue
> reproducible.

**Análisis estático público (SonarCloud):**
<https://sonarcloud.io/dashboard?id=ISCOUTB_AS_202620_TIENDA-VIRTUAL-UTB>
(organización `isco-utb`, Quality Gate verificable sin autenticación)

- [Guía de despliegue en Dokploy](docs/despliegue-dokploy.md): configuración,
  dominio, secretos, verificaciones y copias de seguridad.
- [Estimación de costo con supuestos](docs/costos-despliegue.md); el software
  autohospedado no añade licencia, pero servidor y backups están por confirmar.
- [ADR 0007: despliegue unificado en Dokploy](docs/adr/0007-despliegue-dokploy.md).
  Los ADR 0003–0006 se conservan únicamente como historial sustituido.
- [`compose.yaml`](compose.yaml) sigue siendo el entorno local; el Compose de
  Dokploy no publica puertos del host y persiste PostgreSQL en un volumen.
- Pipeline: [`.github/workflows/tests.yml`](.github/workflows/tests.yml) corre
  pruebas funcionales, de contrato y análisis estático (Ruff + SonarCloud).
- Observabilidad: `GET /health` (liveness), `GET /health/ready` (readiness con
  verificación de base de datos), `GET /metrics` (conteo, errores 5xx y
  latencia p50/p95 por ruta, ligada al escenario 4 de disponibilidad) y logs
  JSON por petición en stdout.
- Secretos: `compose.yaml` exige `POSTGRES_PASSWORD` vía `.env` (ver
  [`.env.example`](.env.example)); ninguna credencial está versionada.

## Evidencia S11 — resiliencia, idempotencia y decisión de extracción

- [Tabla de modos de fallo y su mitigación (F-01 … F-07)](docs/modos-fallo-s11.md):
  siete modos de fallo de negocio, datos, red, seguridad e infraestructura, con
  el patrón de resiliencia seleccionado para cada uno.
- [Diseño de idempotencia y saga](docs/idempotencia-saga-s11.md):
  `Idempotency-Key` en `POST /api/orders` y saga coreográfica Pedidos–
  Inventario con compensación por TTL de 24 horas, con diagramas de secuencia y
  de flujo.
- [ADR 0010: no extraer módulos a microservicios en la fase actual](docs/adr/0010-no-extraer-modulos.md)
  (propuesta, pendiente de ratificación): confirma el monolito modular del
  ADR 0001 y fija las condiciones que reabrirían la extracción.

Son documentos de diseño: el endpoint de pedidos y los patrones descritos aún
no están implementados en el código.

## Arranque local

### Requisito

- Docker con el complemento Docker Compose.

### Ejecución

Desde la raíz del repositorio —la creación de `.env` es una sola vez; después
basta `docker compose up`—:

```bash
cp .env.example .env   # completar POSTGRES_PASSWORD, APP_DB_PASSWORD y JWT_SECRET
docker compose up --build
docker compose run --rm migrate python -m app.seed   # datos de demostración (opcional)
```

Alternativa: con `SEED_ON_DEPLOY=true` en `.env`, el servicio de una sola
ejecución `seed` siembra tras `migrate` en cada `docker compose up` (por
defecto `false`: se omite). En Dokploy se usa la misma variable
([despliegue](docs/despliegue-dokploy.md)). Si además se definen
`SEED_ADMIN_CORREO` y `SEED_ADMIN_PASSWORD`, la siembra crea el administrador
general inicial, que después asigna los demás roles
([ADR 0016](docs/adr/0016-autenticacion-jwt.md)).

`docker compose up` arranca primero `database`, luego el servicio de una sola
ejecución `migrate` (`alembic upgrade head`) y solo si termina bien la API. La
API se conecta con el rol `tienda_app`, sujeto a RLS; las migraciones y la
siembra usan el rol dueño ([ADR 0014](docs/adr/0014-seguridad-rls.md)).

Cuando los servicios estén saludables:

- Aplicación web (catálogo): <http://localhost:3000>
- API: <http://localhost:8000>
- Catálogo (JSON): <http://localhost:8000/catalog/products>
- Comprobación de salud: <http://localhost:8000/health>
- Documentación OpenAPI: <http://localhost:8000/docs>

Para detener los servicios, presione `Ctrl+C`. Los datos de desarrollo de
PostgreSQL se conservan en un volumen de Docker. Si se necesita eliminar
también ese volumen, puede ejecutarse explícitamente `docker compose down -v`;
esta operación borra los datos locales de la base de datos.

### Base de datos: migraciones, siembra y datos anteriores

| Tarea | Comando (desde la raíz) |
|---|---|
| Aplicar migraciones | `docker compose run --rm migrate` (o, en `backend/`, `alembic upgrade head`) |
| Comprobar que modelos y migraciones coinciden | en `backend/`: `alembic check` |
| Sembrar datos de demostración | `docker compose run --rm migrate python -m app.seed` (o `SEED_ON_DEPLOY=true` y `docker compose up`) |
| Sembrar además los datos exportados | `docker compose run --rm -v "${PWD}/backend/datos_legado:/datos" migrate python -m app.seed --desde-json /datos/<archivo>.json` |
| Exportar el esquema anterior a JSON | ver abajo |
| Crear el rol de la API en una base ya inicializada | `docker compose exec database sh /docker-entrypoint-initdb.d/10-rol-aplicacion.sh` |

**Bases creadas antes del ADR 0013.** La migración `0001_esquema_inicial`
elimina `catalog_products` e `inventory_stock`. Antes de levantar el stack
nuevo hay que exportarlas (el script solo lee y escribe
`backend/datos_legado/legado_<marca>.json`, fuera de Git):

```bash
docker compose up -d database
docker compose exec database sh /docker-entrypoint-initdb.d/10-rol-aplicacion.sh
docker compose run --rm --no-deps -v "${PWD}/backend:/src" -w /src migrate python scripts/exportar_datos_legado.py
```

Con Python local y la base accesible basta, en `backend/`,
`python scripts/exportar_datos_legado.py` con `DATABASE_URL` definida.

## Pruebas automatizadas

Las pruebas del backend usan **PostgreSQL real** (ADR 0013): aplican
`alembic upgrade head`, vacían los datos entre pruebas y ejercen las políticas
RLS con el rol de aplicación. `DATABASE_URL` es obligatoria y el nombre de la
base debe contener `test`. Con Python 3.12, un contenedor desechable basta:

```bash
docker run -d --name tienda-pg-test -p 55432:5432 \
  -e POSTGRES_USER=tienda -e POSTGRES_PASSWORD=tienda -e POSTGRES_DB=tienda_test \
  -e APP_DB_USER=tienda_app -e APP_DB_PASSWORD=tienda_app \
  -v "${PWD}/deploy/postgres/initdb:/docker-entrypoint-initdb.d:ro" postgres:17-alpine
export DATABASE_URL=postgresql+psycopg2://tienda:tienda@localhost:55432/tienda_test
python -m pip install -r backend/requirements-dev.txt
python -m pytest -c backend/pytest.ini backend/tests
```

Las pruebas comprueban la ruta de salud, los límites de módulos del ADR, los
endpoints de identidad, catálogo, inventario y pedidos, el contrato OpenAPI, la observabilidad, las
restricciones del esquema, el bloqueo optimista, las políticas RLS y que las
migraciones son reversibles y coinciden con los modelos. El mismo conjunto
corre en GitHub Actions con un servicio `postgres:17-alpine`, junto con
`alembic check` y el análisis estático (Ruff + SonarCloud).

El frontend usa **pnpm** ([ADR 0015](docs/adr/0015-gestor-paquetes-pnpm.md)),
con la versión fijada en `packageManager` y activada por Corepack (Node 22):

```bash
corepack enable                              # una vez por máquina
cd frontend
pnpm install --frozen-lockfile --ignore-scripts
pnpm run check:tokens && pnpm run lint && pnpm run typecheck
pnpm run test:coverage && pnpm run build     # o todo junto: pnpm run verify
```

## Estructura ejecutable

```text
backend/
  app/
    main.py                     # app FastAPI, /health, /health/ready, /metrics, /openapi/diseno, arranque
    seed.py                     # siembra explícita de demostración: python -m app.seed
    modules/
      catalog/                  # tiendas, categorías, productos, imágenes: router, repository, models, schemas, public
      inventory/                # existencias y movimientos: router, repository, models, schemas, public
      identity/                 # registro, login (JWT) y /identity/me: router, repository, tokens, contrasenas, public
      orders/                   # pedidos idempotentes por tienda, ciclo de vida y cancelación: router, service, repository, public
    tareas/vencer_pedidos.py    # compensación de la saga: cancela pendientes de pago con más de 24 h
    shared/
      database.py               # engine, sesión y Base (solo acceso a datos)
      seguridad.py              # principal de la petición (Bearer) y contexto por transacción para RLS
      errores.py                # cuerpo común de error (ErrorResponse) para OpenAPI
      logging.py                # logs estructurados JSON (S8)
      metrics.py                # middleware de métricas HTTP por ruta (S8)
  alembic.ini, alembic/         # migraciones (0001 esquema, 0002 RLS)
  scripts/export_openapi.py     # dev: exporta el contrato a docs/api/openapi.json
  scripts/exportar_datos_legado.py  # exporta catalog_products/inventory_stock antes de migrar
  tests/                        # health, módulos (ADR), catálogo, inventario, contrato, esquema, RLS, Alembic
deploy/postgres/initdb/         # crea el rol de la API al inicializar PostgreSQL
frontend/
  app/page.tsx                  # vista del catálogo (componente de servidor)
compose.yaml                    # frontend + backend + postgres (local; secretos vía .env)
deploy/compose.lab.yaml         # stack de producción consumido por Dokploy
.env.example                    # variables locales requeridas; .env no se versiona
sonar-project.properties        # análisis estático SonarCloud (org ISCO-UTB)
docs/openapi/tienda-virtual.yaml               # contrato de diseño anticipado (4 módulos)
docs/api/openapi.json                          # contrato generado y versionado (regenerable por script)
```

## Pendientes

Todo lo que queda abierto —dominio definitivo, backups y deudas del equipo— está consolidado en
**[`docs/pendientes.md`](docs/pendientes.md)**, con lo que bloquea cada paso y
quién lo desbloquea.

Antes del corte definitivo deben revocarse las credenciales de los proveedores
anteriores y verificarse una restauración del backup de PostgreSQL.

## Estructura de arquitectura

- `docs/arc42/`: documentación de arquitectura basada en la plantilla del curso.
- `docs/adr/`: registros de decisiones arquitectónicas.
- `docs/c4/`: diagramas del modelo C4.

Las evidencias S1–S7 corresponden al primer corte; la sección S8 (despliegue,
CI y observabilidad) abre el segundo.

El ADR 0007 documenta el despliegue unificado en Dokploy. Los ADR 0003–0006 y
las guías S8/Terraform describen iteraciones anteriores y se conservan como
evidencia histórica, no como instrucciones operativas vigentes.

# Tienda Virtual UTB

Proyecto académico para diseñar una tienda virtual dirigida a la comunidad de la Universidad Tecnológica de Bolívar (UTB).

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
- [Contrato OpenAPI 3.1.0, versión de API 0.3.0](docs/api/openapi.json)
- [ADR 0002: integración HTTP y contrato versionado](docs/adr/0002-contrato-integracion-http.md)
- [Pruebas de contrato](backend/tests/contract/test_openapi.py) ejecutadas en el
  [pipeline](.github/workflows/tests.yml), con reporte descargable.

## Despliegue reproducible, CI y observabilidad

El despliegue vigente se ejecuta en Dokploy desde
[`deploy/compose.lab.yaml`](deploy/compose.lab.yaml): Next.js, FastAPI y
PostgreSQL 17 en un único stack. Solo el frontend recibe un dominio público;
la URL definitiva se registrará cuando se configure en Dokploy.

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

## Arranque local

### Requisito

- Docker con el complemento Docker Compose.

### Ejecución

Desde la raíz del repositorio —la creación de `.env` es una sola vez; después
basta `docker compose up`—:

```bash
cp .env.example .env   # completar POSTGRES_PASSWORD
docker compose up --build
```

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

## Pruebas automatizadas

Con Python 3.12 disponible, las pruebas del backend pueden ejecutarse así:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest -c backend/pytest.ini backend/tests
```

Las pruebas comprueban que la ruta de salud funciona, que existen los paquetes
establecidos por el ADR, que el endpoint del catálogo devuelve los productos
sembrados con el contrato esperado, que el contrato OpenAPI guardado coincide
con el generado y que la observabilidad (readiness, métricas, logs JSON)
responde. Se ejecutan sobre SQLite en memoria (sin contenedores). El mismo
conjunto corre automáticamente mediante GitHub Actions en cada envío y
solicitud de cambios, junto con el análisis estático (Ruff + SonarCloud).

## Estructura ejecutable

```text
backend/
  app/
    main.py                     # app FastAPI, /health, /health/ready, /metrics, /openapi/diseno, arranque
    modules/
      catalog/                  # corte vertical: router, repository, models, schemas, seed
      {identity,inventory,orders}/   # paquetes reservados, aún vacíos
    shared/
      database.py               # engine, sesión y Base (solo acceso a datos)
      logging.py                # logs estructurados JSON (S8)
      metrics.py                # middleware de métricas HTTP por ruta (S8)
  scripts/export_openapi.py     # dev: exporta el contrato a docs/api/openapi.json
  tests/                        # health, límites de módulos (ADR), catálogo, contrato, observabilidad
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

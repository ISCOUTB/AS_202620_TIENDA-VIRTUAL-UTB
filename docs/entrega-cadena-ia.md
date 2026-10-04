# Entrega: cadena completa del incremento Catálogo–Inventario

> **Fecha de verificación:** 2026-10-04. **Estado:** implementación candidata,
> sin commit, push, migración real ni despliegue. Los ADR 0008 y 0009 requieren
> revisión del equipo. Todos los enlaces son rutas del worktree actual.

## 1. Incremento elegido y cadena de trazabilidad

Se separó `existencias` de Catálogo porque era el hallazgo de propiedad más
grave de S6 y afectaba el corte vertical visible. El incremento es pequeño pero
real: dos lecturas HTTP, persistencia con dueño único y composición en la vista.

| Eslabón | Evidencia |
|---|---|
| Aspecto y escenario | [AC-04](aspectos.md), [escenario 4](escenarios-calidad.md#4-disponibilidad--consultas-concurrentes-al-catálogo) |
| Decisión | [ADR 0008](adr/0008-separar-catalogo-inventario.md), **propuesto** |
| Código | [Catálogo](../backend/app/modules/catalog/models.py), [Inventario](../backend/app/modules/inventory/models.py), [composición web](../frontend/app/page.tsx) |
| Contratos | `GET /catalog/products`, `GET /inventory`, [OpenAPI generado](api/openapi.json) |
| Defecto cubierto | [Prueba de dueño único](../backend/tests/test_inventory.py) |
| Erosión | [Auditoría S6 actualizada](violaciones-s6.md) y [mapa de contextos](bounded-contexts.md) |
| Medición | [Medidor reproducible](../backend/scripts/measure_catalog_availability.py) y resultados de la sección 3 |
| Uso de IA | [Registro](ia.md), fila 2026-10-04 de este incremento |
| Componente generativo | [ADR 0009](adr/0009-sin-componente-generativo.md), **propuesto** |

## 2. Prueba que falla ante el defecto y pasa corregida

Defecto temporal introducido: volver a declarar `existencias` en `Product`, lo
que recuperaba la doble propiedad. No quedó en el código final.

```bash
cd backend
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=/tmp/tienda-evidence-deps \
  python3 -m pytest \
  tests/test_inventory.py::test_stock_has_single_data_owner \
  -q -p no:cacheprovider
```

Resultado con el defecto: **1 failed en 2,70 s**; la aserción informó que
`existencias` estaba en `Product.__table__.columns`. Tras retirar la columna:
**1 passed en 2,31 s**.

Se hizo una segunda prueba negativa del límite modular: se importó temporalmente
`app.modules.inventory.models` desde `catalog/repository.py`. El comando
siguiente falló con `catalog/repository.py -> app.modules.inventory.models` y,
tras restaurar el archivo, pasó (**1 passed en 0,68 s**):

```bash
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=/tmp/tienda-evidence-deps \
  python3 -m pytest \
  tests/test_architecture.py::test_modules_do_not_import_other_modules_internals \
  -q -p no:cacheprovider
```

## 3. Medición del escenario AC-04

**Entorno.** WSL2 Linux 6.18.33.2, Intel Core i5-12450HX, 12 CPU lógicas,
11,54 GiB disponibles, Python 3.10.12; Uvicorn 0.48.0 y SQLite en archivo
temporal. Esta es una medición HTTP local: **no** acredita PostgreSQL, Docker,
Dokploy ni un despliegue real.

**Procedimiento.** Se inició Uvicorn en `127.0.0.1:8018`. Cinco workers
simultáneos solicitaron Catálogo e Inventario, comprobaron que sus IDs fueran
iguales y al final consultaron `/health`.

```bash
# Terminal 1 (desde backend/):
cd backend
PYTHONPATH=/tmp/tienda-evidence-deps \
DATABASE_URL=sqlite+pysqlite:////tmp/tienda-evidence-measure.db \
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8018
```

```bash
# Terminal 2 (desde backend/):
python3 scripts/measure_catalog_availability.py \
  --base-url http://127.0.0.1:8018 --users 5
```

**Criterio.** 5/5 cargas correctas, referencias coherentes, cero errores y
`/health` disponible después de la concurrencia.

**Resultado observado.** 5 respuestas correctas, 0 errores, salud correcta,
173,81 ms de duración total, 145,42 ms de carga promedio, 151,63 ms de carga
máxima y 19,38 ms para la comprobación final de salud. **Conclusión:** cumple
el escenario académico en el entorno local indicado.

## 4. Migración y verificaciones generales

La [migración SQL](../backend/migrations/0001_move_stock_to_inventory.sql)
se ejecutó dos veces en un contenedor efímero oficial `postgres:17-alpine`.
Partió de `catalog_products(id=1, existencias=37)`: produjo
`inventory_stock(1,37)`, la consulta de la columna antigua devolvió `0` y la
segunda ejecución terminó correctamente. No se conectó a una base real.

También se hizo un smoke test efímero de la aplicación contra PostgreSQL 17:
tras adelantar la secuencia de productos, el arranque creó cuatro productos y
cuatro filas de existencias con los mismos IDs; el siguiente producto recibió
el ID 6, sin colisión. Se observaron respuestas HTTP 200 en ambas rutas. El
resultado acredita el arranque local contra ese contenedor, no una base o un
despliegue real. El harness fue una ejecución inline no guardada; para repetir
la evidencia, puede seguirse el patrón de contenedor de la migración y arrancar
la app con `DATABASE_URL` apuntando a ese PostgreSQL, luego consultar ambas
rutas y verificar la secuencia.

Comandos reproducibles (desde la raíz; eliminar el contenedor temporal al
terminar):

```bash
docker run -d --name tienda-stock-audit \
  -v "$PWD/backend/migrations:/migrations:ro" \
  -e POSTGRES_PASSWORD=temporal-auditoria \
  -e POSTGRES_DB=tienda_test postgres:17-alpine
until docker exec tienda-stock-audit pg_isready -U postgres -d tienda_test; do sleep 1; done
docker exec tienda-stock-audit psql -v ON_ERROR_STOP=1 -U postgres -d tienda_test \
  -c "CREATE TABLE catalog_products (id INTEGER PRIMARY KEY, nombre VARCHAR(120) NOT NULL, descripcion VARCHAR(400) NOT NULL, precio_centavos INTEGER NOT NULL, existencias INTEGER NOT NULL); INSERT INTO catalog_products VALUES (1, 'Cafe', 'Vaso', 350000, 37);"
docker exec tienda-stock-audit psql -v ON_ERROR_STOP=1 -U postgres -d tienda_test \
  -f /migrations/0001_move_stock_to_inventory.sql
docker exec tienda-stock-audit psql -v ON_ERROR_STOP=1 -U postgres -d tienda_test \
  -Atc "SELECT product_id, existencias FROM inventory_stock; SELECT count(*) FROM information_schema.columns WHERE table_name='catalog_products' AND column_name='existencias';"
docker exec tienda-stock-audit psql -v ON_ERROR_STOP=1 -U postgres -d tienda_test \
  -f /migrations/0001_move_stock_to_inventory.sql
docker rm -f tienda-stock-audit
```

La clave anterior es solo un valor temporal de ejemplo para el contenedor local.

```bash
# Suite equivalente al Python 3.12 declarado en CI
docker run --rm -v "$PWD:/repo" -w /repo/backend python:3.12-slim \
  sh -c 'pip install -q -r requirements-dev.txt && \
         python -m pytest tests -p no:cacheprovider'
# Resultado final: 29 passed, 2 warnings, 4.68 s.

# Análisis estático
docker run --rm -v "$PWD:/repo" -w /repo/backend python:3.12-slim \
  sh -c 'pip install -q ruff==0.13.2 && ruff check app tests scripts'
# Resultado: All checks passed.

# Compose (solo parseo/configuración)
POSTGRES_PASSWORD=validation-only docker compose config --quiet
POSTGRES_PASSWORD=validation-only \
  docker compose -f deploy/compose.lab.yaml config --quiet
# Ambos terminaron con código 0.

# Frontend, copia temporal dentro de Node 22 (desde la raíz)
docker run --rm \
  -v "$PWD/frontend:/source:ro" node:22-alpine sh -c \
  'mkdir /tmp/frontend && \
   cp /source/package.json /source/package-lock.json /source/next.config.ts \
      /source/next-env.d.ts /source/tsconfig.json /tmp/frontend/ && \
   cp -R /source/app /tmp/frontend/app && \
   cd /tmp/frontend && npm ci --silent && npm run build'
# Resultado: compilación, comprobación TypeScript y build de producción aprobados.
```

La ejecución local de `TestClient` con Python 3.10 quedó bloqueada por el
portal de hilos del entorno. No se contó como aprobada: se repitió toda la suite
en Docker/Python 3.12. La suite emitió un aviso de deprecación de Starlette sobre
el futuro reemplazo de `httpx` por `httpx2`; no se cambió la dependencia sin una
migración separada. El HTML de Archify tampoco se regeneró porque su generador
no está en el repositorio; la fuente OpenAPI YAML y el JSON ejecutable sí fueron
actualizados.

## 5. Dependencias y credenciales

Este incremento no propuso una dependencia de ejecución nueva. Se verificaron
además todas las dependencias directas existentes:

| Grupo | Verificación realizada | Resultado |
|---|---|---|
| Python | `python3 -m pip download --index-url https://pypi.org/simple --no-deps -d /tmp/tienda-pypi-audit -r backend/requirements-dev.txt`; inspección de `Project-URL`. Versiones: FastAPI 0.136.3, Uvicorn 0.48.0, SQLAlchemy 2.0.36, psycopg2-binary 2.9.11, pytest 9.0.3, httpx 0.27.2, jsonschema 4.26.0, openapi-spec-validator 0.7.2 y PyYAML 6.0.3. | PyPI entregó los nueve artefactos fijados. Fuentes declaradas por sus proyectos: [FastAPI](https://github.com/fastapi/fastapi), [Uvicorn](https://www.uvicorn.org/), [SQLAlchemy](https://www.sqlalchemy.org/), [Psycopg](https://www.psycopg.org/), [pytest](https://docs.pytest.org/), [HTTPX](https://www.python-httpx.org/), [jsonschema](https://github.com/python-jsonschema/jsonschema), [openapi-spec-validator](https://github.com/python-openapi/openapi-spec-validator) y [PyYAML](https://github.com/yaml/pyyaml). |
| npm | `npm view <nombre>@<versión> name version repository.url` contra npm Registry: Next 15.5.9, React y React DOM 19.1.2, `@types/node` 22.10.2, `@types/react` 19.0.1, `@types/react-dom` 19.0.2, `eslint-config-next` 15.5.9 y TypeScript 5.7.2. | Todas existen y apuntan a [Vercel](https://github.com/vercel/next.js), [React](https://github.com/facebook/react), [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) o [Microsoft](https://github.com/microsoft/TypeScript); `npm ci` y el build aprobaron. |
| Imágenes | Digests locales después de descargar las imágenes oficiales. | [Python](https://hub.docker.com/_/python) `python:3.12-slim` `02108f…d9155d`; [Node](https://hub.docker.com/_/node) `node:22-alpine` `0a7108…e402`; [PostgreSQL](https://hub.docker.com/_/postgres) `postgres:17-alpine` `18cfe3…5d73`. |

Esto verifica existencia, versión y procedencia declarada; no es una auditoría
criptográfica de todo el árbol transitivo.

La búsqueda sobre el worktree, incluidos archivos nuevos del incremento, cubrió
patrones de claves AWS, tokens de GitHub/OpenAI, llaves privadas y URLs
PostgreSQL con contraseña literal. No hubo coincidencias. Se revisaron además
`.env.example`, `deploy/.env.example`, ambos Compose y el workflow:
solo contienen variables vacías, interpolaciones o el literal no real
`validation-only`/`ci-validation-only`. No se imprimió ni reprodujo ningún
secreto. El alcance es el worktree rastreado actual, no el historial Git ni los
secretos almacenados fuera del repositorio.

## 6. IA y revisión pendiente

No existe ni está previsto en el repositorio un componente generativo de
ejecución. El [ADR 0009](adr/0009-sin-componente-generativo.md) propone mantener
ese alcance; por tanto costo por operación, latencia y dataset generativo son
**no aplicables**, no valores medidos como cero.

El equipo debe revisar y decidir sobre ADR 0008 y ADR 0009, la ruptura del
contrato 0.3.0 y la futura aplicación de la migración. Después del commit podrá
reemplazar estas rutas locales por enlaces permanentes al repositorio.

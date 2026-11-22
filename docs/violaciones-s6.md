# Auditoría de violaciones de la semana 6

> **Revisión de cierre 2026-11-22:** la tabla conserva los hallazgos originales, con el estado actual actualizado abajo. Los nombres y procedimientos históricos no sustituyen el esquema Alembic vigente.

> **Fecha original:** 2026-09-06. **Auditoría actualizada:** 2026-10-04.
> V1–V4 y V7 fueron corregidas en el incremento candidato; V6 se corrigió el
> 2026-10-22 con Alembic (ADR 0013); V5 tiene generación de tipos, con sincronización entre contratos por verificar.
> La aceptación arquitectónica permanece pendiente del equipo (ADR 0008).

## Alcance real de las comprobaciones

La prueba de arquitectura recorre los archivos de `app/modules`, analiza sus
imports estáticos con el AST de Python y rechaza accesos a internos de otro
módulo. No detecta imports dinámicos, SQL textual ni demuestra por sí sola la
propiedad de una columna. Por eso `test_stock_has_single_data_owner` inspecciona
además el mapeo SQLAlchemy: ninguna tabla de Catálogo puede declarar `cantidad`
ni `existencias`, y `Existencia` (Inventario) sí debe declarar `cantidad`.

## Estado de los hallazgos

| # | Hallazgo original | Clasificación | Corrección o deuda actual | Estado |
|---|---|---|---|---|
| V1 | Catálogo poseía `existencias`. | Regla ADR | `Existencia` define `existencias.cantidad`; `Producto` no contiene stock. Alembic gestiona el esquema y una prueba verifica el dueño único. | CORREGIDA |
| V2 | El seed de Catálogo mezclaba productos y stock. | Deuda técnica | `app.seed` coordina la siembra mediante los contratos públicos de cada módulo; la API no siembra al arrancar. | CORREGIDA |
| V3 | `ProductOut` fusionaba datos de dos contextos. | Regla ADR | `ProductOut` y `StockAvailabilityOut` son contratos separados; Next.js compone por `product_id`. | CORREGIDA |
| V4 | `main.py` importaba modelos y seed internos. | Regla ADR | Los paquetes exponen `initialize` y `router`; el composition root solo consume esa superficie. | CORREGIDA |
| V5 | El frontend declara tipos HTTP manualmente. | Deuda técnica | `frontend/scripts/gen-api.mjs` genera `lib/api/generated/contract.ts` desde el YAML. Falta verificar de forma automática que YAML, JSON ejecutable y tipos permanezcan sincronizados. | MITIGADA |
| V6 | `create_all` sustituye migraciones formales. | Deuda técnica | Alembic adoptado ([ADR 0013](adr/0013-migraciones-alembic-y-esquema.md)): `0001_esquema_inicial` crea el esquema, la API ya no ejecuta `create_all` ni siembra al arrancar, y las pruebas verifican `upgrade`/`downgrade` y que modelos y migraciones no difieran. El SQL manual anterior se eliminó. | CORREGIDA (2026-10-22) |
| V7 | La prueba solo comprobaba que existieran paquetes. | Regla ADR | Ahora analiza imports AST y rechaza internos ajenos; su alcance limitado está declarado y la propiedad se prueba aparte. | CORREGIDA |

## Cómo se detectó y corrigió la erosión

- La tabla y el DTO de Catálogo se contrastaron con el mapa de contextos: ambos
  contenían un dato cuyo dueño declarado era Inventario.
- `existencias` se movió a `inventory_stock`, los seeds y contratos se separaron
  y el frontend pasó a componer dos respuestas sin imports cruzados entre los
  módulos del backend.
- El arranque dejó de conocer modelos y seeds internos: cada paquete publica
  `initialize` y `router`.
- Se introdujeron temporalmente dos defectos: la columna otra vez en `Product`
  y un import de `inventory.models` desde Catálogo. Las pruebas correspondientes
  fallaron; tras restaurar el código ambas pasaron.

La evidencia exacta, incluida la migración probada en PostgreSQL 17, está en
[`docs/entrega-cadena-ia.md`](entrega-cadena-ia.md). La generación de tipos de
V5 ya existe; queda verificar la sincronización entre contratos y tipos generados.

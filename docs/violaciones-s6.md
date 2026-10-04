# Auditoría de violaciones de la semana 6

> **Fecha original:** 2026-09-06. **Auditoría actualizada:** 2026-10-04.
> V1–V4 y V7 fueron corregidas en el incremento candidato; V5 y V6 continúan.
> La aceptación arquitectónica permanece pendiente del equipo (ADR 0008).

## Alcance real de las comprobaciones

La prueba de arquitectura recorre los archivos de `app/modules`, analiza sus
imports estáticos con el AST de Python y rechaza accesos a internos de otro
módulo. No detecta imports dinámicos, SQL textual ni demuestra por sí sola la
propiedad de una columna. Por eso `test_stock_has_single_data_owner` inspecciona
además el mapeo SQLAlchemy: `Product` no puede declarar `existencias` y `Stock`
sí debe hacerlo.

## Estado de los hallazgos

| # | Hallazgo original | Clasificación | Corrección o deuda actual | Estado |
|---|---|---|---|---|
| V1 | Catálogo poseía `existencias`. | Regla ADR | `Stock` define `inventory_stock`; `Product` ya no contiene la columna. Hay migración SQL y prueba de dueño único. | CORREGIDA |
| V2 | El seed de Catálogo mezclaba productos y stock. | Deuda técnica | Cada módulo tiene seed e inicialización propios. | CORREGIDA |
| V3 | `ProductOut` fusionaba datos de dos contextos. | Regla ADR | `ProductOut` y `StockOut` son contratos separados; Next.js compone por `product_id`. | CORREGIDA |
| V4 | `main.py` importaba modelos y seed internos. | Regla ADR | Los paquetes exponen `initialize` y `router`; el composition root solo consume esa superficie. | CORREGIDA |
| V5 | El frontend declara tipos HTTP manualmente. | Deuda técnica | Sigue vigente; el build y las pruebas de contrato reducen, pero no eliminan, el riesgo. | VIGENTE |
| V6 | `create_all` sustituye migraciones formales. | Deuda técnica | Sigue vigente. Se aportó SQL idempotente para este cambio, no se adoptó Alembic. | VIGENTE |
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
[`docs/entrega-cadena-ia.md`](entrega-cadena-ia.md). V5 y V6 permanecen como
deuda explícita para no ampliar este incremento a generación de tipos y Alembic.

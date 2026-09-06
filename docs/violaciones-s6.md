# Violaciones detectadas en el código actual — plan de corrección

> **Tipo:** revisión de deuda arquitectónica y cumplimiento de reglas del
> [ADR 0001](adr/0001-monolito-modular.md). **Autor:** Equipo Tienda Virtual
> UTB. **Fecha:** 2026-09-06. **Estado:** las violaciones están vigentes en el
> incremento actual (corte vertical del catálogo); ninguna se corrige en esta
> evidencia, se documentan con su plan.

## Cómo leer este documento

Cada fila describe una violación observada **en el código actual**, su evidencia
(`archivo:línea`), su clasificación y un plan de corrección con prioridad.
Clasificación:

- **Regla ADR** — incumple una regla de dependencia o de propiedad declarada en
  el ADR 0001 (violación de la arquitectura decidida).
- **Deuda técnica** — no contradice una regla escrita, pero genera riesgo futuro
  o duplicación (deuda conocida, en parte ya declarada en arc42 §11).

Pocas pruebas cambian hoy porque el módulo `catalog` es el único implementado;
la mayor parte de la corrección se materializa cuando existan `inventory` y
`orders`.

## Tabla de violaciones

| # | Violación | Clasificación | Evidencia | Gravedad | Plan de corrección | Prioridad |
|---|---|---|---|---|---|---|
| V1 | **Conflicto de dueño único de `existencias`.** El módulo `catalog` declara y escribe `existencias` en `catalog_products`, pero por alcance del negocio esa cantidad pertenece al contexto **Inventario**. El ADR 0001 (§ propiedades y datos por módulo) y `docs/aspectos.md` exigen dueño único por modulo. | Regla ADR | `backend/app/modules/catalog/models.py:16`; `schema`/API exponen `existencias`. | Alta | Crear el módulo `inventory` con su tabla `inventory_stock` (producto_ref, cantidad). El catálogo deja de persistir `existencias`; inventario las propio y las expone por contrato público. La lectura del catálogo (`GET /catalog/products`) une el dato vía contrato de `inventory`, no por ORM cruzado. Ajustar `models.py`, `schemas.py`, `repository.py`, `seed.py`, el frontend y las pruebas. | P1 (con `inventory`) |
| V2 | **`seed.py` concentra en `catalog` datos mockeados de dos contextos** (precios del catálogo y existencias del inventario) en un solo seed dentro del módulo. | Deuda técnica | `backend/app/modules/catalog/seed.py:8-13` | Media | Separar fuentes de seed por contexto: `catalog/seed.py` solo productos+precio; `inventory/seed.py` solo existencias. Mantenerlo idempotente y dentro de su módulo, nunca accediendo a tablas ajenas. | P2 |
| V3 | **El router de catálogo expone datos de dos contextos en un solo contrato.** `ProductOut` incluye `precio_centavos` (catálogo) y `existencias` (inventario), fusionando dueños en la API. | Regla ADR | `backend/app/modules/catalog/schemas.py:6-13`; `backend/app/modules/catalog/router.py:13-16` | Media | Definir `ProductOut` solo con campos del catálogo; que la disponibilidad la provea `inventory` por su contrato y se ensamble en una capa de aplicación del cliente/API sin acoplar los módulos. | P2 |
| V4 | **`main.py` (lifespan) acopla el orquestador a los internos del módulo `catalog`.** Importa `catalog_models` y `seed_products` directamente; arrancar la app exige conocer el seed del módulo. | Regla ADR | `backend/app/main.py:5-8,14-16` | Media | Mover la preparación del esquema y el seed a una función de bootstrap por módulo (o expuesta vía contrato del propio módulo); `main.py` solo invoca el bootstrap de cada módulo sin conocer sus internos. | P3 |
| V5 | **El frontend duplica el contrato del backend.** El tipo `Product` y el formateo de moneda se declaran a mano (`page.tsx`), desincronizables con `ProductOut`. | Deuda técnica | `frontend/app/page.tsx:3-17` | Baja | Generar/versionar el tipo compartido a partir del contrato del backend (p. ej. un paquete de tipos o un schema generado); o al menos documentar el contrato único en `bounded-contexts.md`. | P3 |
| V6 | **`create_all` en lugar de migraciones.** Se crea el esquema al arrancar; cambios de esquema sobre datos poblados serán manuales. | Deuda técnica | `backend/app/main.py:14` (`Base.metadata.create_all`) | Media | Aportar Alembic una vez el esquema se estabilice; registrar un ADR. Ya fue declarado en arc42 §11. | P3 |
| V7 | **Los límites de módulos solo se verifican por existencia de paquetes.** `test_architecture.py` comprueba `import_module`, no que un módulo no importe internos de otro; la red no impone el límite (riesgo reconocido en ADR 0001). | Regla ADR | `backend/tests/test_architecture.py:4-14` | Media | Ampliar la prueba a un análisis de dependencias real entre paquetes de `app.modules.*` (rechazar importación cruzada de internos) cuando aparezca más código. | P3 |

## Plan de corrección resumido

1. **P1 — Resolución del dueño de existencias (con `inventory`).** Trasladar
   `existencias` de `catalog_products` a una tabla propia del módulo `inventory`;
   catálogo e inventario se comunican por contrato público. Actualizar esquema,
   seed, API, frontend y pruebas.
2. **P2 — Separación de contratos y seeds.** Limitar `ProductOut` al catálogo y
   separar el seed de inventario; ensamblar la disponibilidad en una capa de
   aplicación, sin acoplar módulos.
3. **P3 — Desacoplar bootstrap, tipado compartido y pruebas de límites.**
   Sacar el seed del `lifespan` hacia el módulo, versionar el contrato de
   frontend, adoptar Alembic y endurecer `test_architecture.py`.

## Notas

- Las violaciones V1 y V3 son las que sostienen la columna "Tabla hoy (real)" de
  la tabla de módulos con dueño único en
  [`docs/bounded-contexts.md`](bounded-contexts.md).
- Las pruebas actuales (`pytest`) pasan sobre el corte vertical; corregir V1/V3
  romperá `test_catalog.py` y C4/arc42, por eso se documentan y no se ejecutan en
  esta evidencia.
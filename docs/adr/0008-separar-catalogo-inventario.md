# ADR 0008: Separar la propiedad de Catálogo e Inventario

- **Estado:** Propuesta — pendiente de revisión y ratificación del equipo
- **Fecha:** 2026-10-04
- **Origen:** la persona solicitante eligió implementar dos contratos y una
  migración SQL versionada; no se registra como aprobación colectiva.

## Contexto

El ADR 0001 exige dueño único de datos, pero `catalog_products` almacenaba
`existencias` y `ProductOut` mezclaba atributos de Catálogo e Inventario. La
auditoría S6 registró esta erosión como V1–V3. El incremento debe conservar la
vista que muestra producto, precio y disponibilidad sin permitir que un módulo
importe detalles internos del otro.

## Alternativas consideradas

1. **Mantener el stock en Catálogo.** Evita cambios de contrato, pero conserva
   la violación de propiedad. Rechazada.
2. **Responder un agregado desde el backend.** Conserva una sola llamada, pero
   requiere una capa adicional de composición y deja ambiguo el contrato dueño
   en este sistema pequeño. Rechazada para este incremento.
3. **Dos contratos y composición en Next.js.** Catálogo expone descripción y
   precio; Inventario expone disponibilidad; el cliente une por `product_id`.
   Seleccionada por la persona solicitante para implementación candidata.

## Propuesta de decisión

Crear `inventory_stock(product_id, existencias)` sin relación ORM cruzada.
`GET /catalog/products` no devuelve stock y `GET /inventory` devuelve
`product_id` y `existencias`. Next.js solicita ambos en paralelo. Cada módulo
publica su router e inicialización; el composition root no importa sus modelos
o seeds internos.

Para bases PostgreSQL existentes se versiona una migración idempotente que
copia los valores y elimina la columna antigua. Aplicarla a un entorno real
requiere respaldo y una ventana acordada; esta entrega no la despliega.

## Consecuencias

- Se corrigen V1–V4 y la propiedad queda verificable por prueba.
- La vista realiza dos lecturas internas, compensadas con `Promise.all`.
- El contrato 0.3.0 rompe consumidores que esperen `existencias` dentro de
  `ProductOut`; el frontend incluido queda actualizado.
- `product_id` es una referencia por valor, sin clave foránea ni ORM cruzado.
- La falta de Alembic permanece como deuda V6.

## Revisión humana pendiente

El equipo debe ratificar o rechazar esta propuesta y cambiar su estado. La
existencia del código candidato y de pruebas aprobadas no equivale a una
decisión colectiva.

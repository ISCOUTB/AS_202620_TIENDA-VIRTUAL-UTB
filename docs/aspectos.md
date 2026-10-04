
# Aspectos de calidad

> **Actualización 2026-10-04:** `existencias` ya pertenece al módulo
> **`inventory`** y se persiste en `inventory_stock`. Catálogo e Inventario
> exponen contratos separados y el cliente los compone. La decisión propuesta
> está en el [ADR 0008](adr/0008-separar-catalogo-inventario.md), pendiente de
> ratificación del equipo.

Cada fila enlaza un atributo de calidad con su escenario (sección *Quality
Requirements* de `docs/arc42/arc42-template-EN.md` y
[escenarios de calidad](escenarios-calidad.md)), la prioridad del árbol de
utilidad, la decisión arquitectónica que lo soporta, el lugar del repositorio
donde vive esa decisión y las pruebas que lo verifican. Hay una fila por cada uno
de los cuatro escenarios, de modo que cada escenario es alcanzable desde su
aspecto.

Estado de cobertura, dicho sin adornos:

- **Disponibilidad** (escenario 4): completa de extremo a extremo — escenario →
  prioridad → táctica → ubicación → pruebas ejecutándose en CI.
- **Rendimiento** (escenario 3): el habilitador de lectura está puesto
  (`cache: "no-store"`), pero la medición de los 2 s depende del módulo `orders`.
- **Usabilidad** (escenario 2): existe 1 de las 4 pantallas del flujo; carrito y
  confirmación dependen de `orders`.
- **Seguridad** (escenario 1): parcialmente cubierta a propósito — depende del
  módulo `identity`, aún no implementado.

- **IN** = impacto en el negocio, **RA** = riesgo arquitectónico (Alto / Medio / Bajo),
  según el [árbol de utilidad](arbol-utilidad.md).

| ID | Aspecto de calidad y prioridad (IN / RA) | Escenario asociado | Decisión o táctica arquitectónica | Ubicación en el repositorio | Pruebas | C4 | Evidencia |
|---|---|---|---|---|---|---|---|
| AC-01 | Seguridad — autorización por rol (IN / RA: H / M) | [Escenario 1](escenarios-calidad.md#1-seguridad--autorización-por-rol): un responsable de inventario autenticado intenta cambiar el precio de un producto (operación fuera de su rol) y el sistema la rechaza (403). | Módulo `identity` propietario de autenticación y autorización; los demás módulos no podrán saltarse su contrato público (regla de dependencia del [`ADR 0001`](adr/0001-monolito-modular.md)). Autenticación propia, sin SSO institucional. | `backend/app/modules/identity/` (paquete reservado, aún sin lógica); reglas en [`docs/adr/0001-monolito-modular.md`](adr/0001-monolito-modular.md) | `backend/tests/test_architecture.py` verifica hoy los límites de módulos. La prueba de rechazo por rol (403) se añadirá cuando el módulo `identity` exponga autorización — **pendiente en este incremento**. | [Contexto](c4/context.md) · [Contenedores](c4/container.md) | Cobertura parcial o pendiente, según la columna Pruebas; sin medición registrada. |
| AC-02 | Usabilidad — flujo de compra (IN / RA: H / L) | [Escenario 2](escenarios-calidad.md#2-usabilidad--flujo-de-compra): un comprador autenticado completa el flujo desde la búsqueda hasta la confirmación del pedido en máximo 4 pantallas. | Cliente web Next.js independiente (App Router), que no mezcla la presentación con los módulos del backend y permite recortar pasos sin tocarlos; el catálogo se presenta en una sola vista donde nombre, descripción, precio y existencias son visibles sin navegación adicional, lo que ahorra el paso intermedio de "ver producto". | `frontend/app/page.tsx` (vista del catálogo), `frontend/app/layout.tsx`; separación cliente/API según el [`ADR 0001`](adr/0001-monolito-modular.md) | Sin prueba automatizada: la medida es el conteo manual de pantallas. **Hoy existe 1 de las 4** (catálogo); carrito y confirmación quedan pendientes del módulo `orders` — **parcialmente cubierto en este incremento**. | [Contexto](c4/context.md) · [Contenedores](c4/container.md) | Cobertura parcial o pendiente, según la columna Pruebas; sin medición registrada. |
| AC-03 | Rendimiento — reflejo de inventario (IN / RA: H / M) | [Escenario 3](escenarios-calidad.md#3-rendimiento--reflejo-de-inventario): al confirmarse un pedido que reduce existencias, el cambio se refleja en menos de 2 segundos para otra sesión que consulte el catálogo. | Lectura dinámica sin caché en el cliente (`cache: "no-store"` en `cargarCatalogo`), de modo que cada carga del catálogo consulta el estado real y no una copia; pedidos e inventario comparten proceso y una sola instancia de PostgreSQL, así que la reducción de existencias ocurre en la misma transacción y no requiere consistencia eventual. | `frontend/app/page.tsx` (`cache: "no-store"`), `backend/app/modules/catalog/repository.py`, `backend/app/shared/database.py`; decisión de origen en [`ADR 0001`](adr/0001-monolito-modular.md) | `backend/tests/test_catalog.py`: `test_products_endpoint_returns_seeded_catalog` y `test_products_are_sorted_by_name` cubren el contrato de lectura sobre el que se mide. La medida de los 2 s tras confirmar un pedido queda **pendiente** hasta que exista el módulo `orders`. | [Contexto](c4/context.md) · [Contenedores](c4/container.md) | Cobertura parcial o pendiente, según la columna Pruebas; sin medición registrada. |
| AC-04 | Disponibilidad — consulta del catálogo (IN / RA: M / M) | [Escenario 4](escenarios-calidad.md#4-disponibilidad--consultas-concurrentes-al-catálogo): 5 compradores cargan a la vez catálogo y disponibilidad; todos reciben datos coherentes y el servidor continúa saludable. | Dos lecturas públicas, `GET /catalog/products` y `GET /inventory`, mantienen dueños de datos separados; Next.js las ejecuta en paralelo y compone por `product_id`. Monolito y base únicos según [ADR 0001](adr/0001-monolito-modular.md); separación propuesta en [ADR 0008](adr/0008-separar-catalogo-inventario.md). | [`catalog/router.py`](../backend/app/modules/catalog/router.py), [`inventory/router.py`](../backend/app/modules/inventory/router.py), [`page.tsx`](../frontend/app/page.tsx) y [medidor](../backend/scripts/measure_catalog_availability.py). | `test_catalog.py`, `test_inventory.py`, `test_architecture.py` y suite de contrato. Prueba de dueño único demostrada en rojo y verde; 29 pruebas aprobadas en Docker/Python 3.12. | [Contexto](c4/context.md) · [Contenedores](c4/container.md) | [Entrega y medición](entrega-cadena-ia.md): 5/5 respuestas correctas, 0 errores, salud posterior correcta; Uvicorn + SQLite local, no PostgreSQL ni despliegue. |

## Tensiones de calidad identificadas

1. **Facilidad de uso frente a seguridad:** reducir los pasos necesarios para comprar mejora la experiencia, pero los controles de autenticación y autorización pueden añadir fricción al proceso.

2. **Precisión del inventario frente a disponibilidad y rendimiento:** actualizar las existencias inmediatamente ayuda a evitar ventas de productos agotados, pero exige coordinación adicional y puede aumentar el tiempo de respuesta o afectar la disponibilidad del sistema.


# Aspectos de calidad

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

| Aspecto de calidad | Escenario asociado | Prioridad (IN / RA) | Decisión o táctica arquitectónica | Ubicación en el repositorio | Pruebas |
|---|---|---|---|---|---|
| Seguridad — autorización por rol | [Escenario 1](escenarios-calidad.md#1-seguridad--autorización-por-rol): un responsable de inventario autenticado intenta cambiar el precio de un producto (operación fuera de su rol) y el sistema la rechaza (403). | H / M | Módulo `identity` propietario de autenticación y autorización; los demás módulos no podrán saltarse su contrato público (regla de dependencia del [`ADR 0001`](adr/0001-monolito-modular.md)). Autenticación propia, sin SSO institucional. | `backend/app/modules/identity/` (paquete reservado, aún sin lógica); reglas en [`docs/adr/0001-monolito-modular.md`](adr/0001-monolito-modular.md) | `backend/tests/test_architecture.py` verifica hoy los límites de módulos. La prueba de rechazo por rol (403) se añadirá cuando el módulo `identity` exponga autorización — **pendiente en este incremento**. |
| Usabilidad — flujo de compra | [Escenario 2](escenarios-calidad.md#2-usabilidad--flujo-de-compra): un comprador autenticado completa el flujo desde la búsqueda hasta la confirmación del pedido en máximo 4 pantallas. | H / L | Cliente web Next.js independiente (App Router), que no mezcla la presentación con los módulos del backend y permite recortar pasos sin tocarlos; el catálogo se presenta en una sola vista donde nombre, descripción, precio y existencias son visibles sin navegación adicional, lo que ahorra el paso intermedio de "ver producto". | `frontend/app/page.tsx` (vista del catálogo), `frontend/app/layout.tsx`; separación cliente/API según el [`ADR 0001`](adr/0001-monolito-modular.md) | Sin prueba automatizada: la medida es el conteo manual de pantallas. **Hoy existe 1 de las 4** (catálogo); carrito y confirmación quedan pendientes de los módulos `orders` e `inventory` — **parcialmente cubierto en este incremento**. |
| Rendimiento — reflejo de inventario | [Escenario 3](escenarios-calidad.md#3-rendimiento--reflejo-de-inventario): al confirmarse un pedido que reduce existencias, el cambio se refleja en menos de 2 segundos para otra sesión que consulte el catálogo. | H / M | Lectura dinámica sin caché en el cliente (`cache: "no-store"` en `cargarCatalogo`), de modo que cada carga del catálogo consulta el estado real y no una copia; pedidos e inventario comparten proceso y una sola instancia de PostgreSQL, así que la reducción de existencias ocurre en la misma transacción y no requiere consistencia eventual. | `frontend/app/page.tsx` (`cache: "no-store"`), `backend/app/modules/catalog/repository.py`, `backend/app/shared/database.py`; decisión de origen en [`ADR 0001`](adr/0001-monolito-modular.md) | `backend/tests/test_catalog.py`: `test_products_endpoint_returns_seeded_catalog` y `test_products_are_sorted_by_name` cubren el contrato de lectura sobre el que se mide. La medida de los 2 s tras confirmar un pedido queda **pendiente** hasta que exista el módulo `orders`. |
| Disponibilidad — consulta del catálogo | [Escenario 4](escenarios-calidad.md#4-disponibilidad--consultas-concurrentes-al-catálogo): ~5 compradores consultan el catálogo mockeado a la vez (hora pico) y todos reciben respuesta correcta sin que el servidor local se caiga. | M / M | Endpoint de solo lectura `GET /catalog/products` servido por el monolito FastAPI sobre una única instancia PostgreSQL (sin saltos de red intermedios); catálogo sembrado de forma idempotente al arrancar para que siempre haya datos que responder; healthchecks + `depends_on` en Compose garantizan que la API solo recibe tráfico cuando la base de datos está lista. | `backend/app/modules/catalog/router.py`, `backend/app/modules/catalog/repository.py`, `backend/app/modules/catalog/seed.py`, `backend/app/main.py` (lifespan), `compose.yaml` (healthchecks); decisión de origen en [`ADR 0001`](adr/0001-monolito-modular.md) (una sola instancia desplegable y propiedad de los datos por módulo) | `backend/tests/test_catalog.py`: `test_products_endpoint_returns_seeded_catalog` (200 + contrato de datos) y `test_products_are_sorted_by_name` (orden estable). Se ejecutan en cada push/PR vía `.github/workflows/tests.yml`. Prueba de carga concurrente (~5 sesiones): manual, pendiente de registrar. |

## Tensiones de calidad identificadas

1. **Facilidad de uso frente a seguridad:** reducir los pasos necesarios para comprar mejora la experiencia, pero los controles de autenticación y autorización pueden añadir fricción al proceso.

2. **Precisión del inventario frente a disponibilidad y rendimiento:** actualizar las existencias inmediatamente ayuda a evitar ventas de productos agotados, pero exige coordinación adicional y puede aumentar el tiempo de respuesta o afectar la disponibilidad del sistema.

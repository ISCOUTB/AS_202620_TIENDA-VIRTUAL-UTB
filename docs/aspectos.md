
# Aspectos de calidad

Cada fila enlaza un atributo de calidad con su escenario, la prioridad del
árbol de utilidad, la decisión arquitectónica que lo soporta, el lugar del
repositorio donde vive esa decisión y las pruebas que lo verifican.

- **IN** = impacto en el negocio, **RA** = riesgo arquitectónico (Alto / Medio / Bajo),
  según `docs/arbol-utilidad.md`.

| Aspecto de calidad | Escenario asociado | Prioridad (IN / RA) | Decisión o táctica arquitectónica | Ubicación en el repositorio | Pruebas |
|---|---|---|---|---|---|
| Disponibilidad — consulta del catálogo | Escenario 4 de `docs/escenarios-calidad.md`: ~5 compradores consultan el catálogo mockeado a la vez (hora pico) y todos reciben respuesta correcta sin que el servidor local se caiga. | M / M | Endpoint de solo lectura `GET /catalog/products` servido por el monolito FastAPI sobre una única instancia PostgreSQL (sin saltos de red intermedios); catálogo sembrado de forma idempotente al arrancar para que siempre haya datos que responder; healthchecks + `depends_on` en Compose garantizan que la API solo recibe tráfico cuando la base de datos está lista. | `backend/app/modules/catalog/router.py`, `backend/app/modules/catalog/repository.py`, `backend/app/modules/catalog/seed.py`, `backend/app/main.py` (lifespan), `compose.yaml` (healthchecks) | `backend/tests/test_catalog.py`: `test_products_endpoint_returns_seeded_catalog` (200 + contrato de datos) y `test_products_are_sorted_by_name` (orden estable). Se ejecutan en cada push/PR vía `.github/workflows/tests.yml`. Prueba de carga concurrente (~5 sesiones): manual, pendiente de registrar. |
| Seguridad — autorización por rol | Escenario 1 de `docs/escenarios-calidad.md`: un responsable de inventario autenticado intenta cambiar el precio de un producto (operación fuera de su rol) y el sistema la rechaza (403). | H / M | Módulo `identity` propietario de autenticación y autorización; los demás módulos no podrán saltarse su contrato público (regla de dependencia del ADR 0001). Autenticación propia, sin SSO institucional. | `backend/app/modules/identity/` (paquete reservado, aún sin lógica); reglas en `docs/adr/0001-monolito-modular.md` | `backend/tests/test_architecture.py` verifica hoy los límites de módulos. La prueba de rechazo por rol (403) se añadirá cuando el módulo `identity` exponga autorización — **pendiente en este incremento**. |

## Tensiones de calidad identificadas

1. **Facilidad de uso frente a seguridad:** reducir los pasos necesarios para comprar mejora la experiencia, pero los controles de autenticación y autorización pueden añadir fricción al proceso.

2. **Precisión del inventario frente a disponibilidad y rendimiento:** actualizar las existencias inmediatamente ayuda a evitar ventas de productos agotados, pero exige coordinación adicional y puede aumentar el tiempo de respuesta o afectar la disponibilidad del sistema.

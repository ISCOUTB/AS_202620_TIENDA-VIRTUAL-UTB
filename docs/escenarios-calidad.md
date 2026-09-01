# Escenarios de calidad

Cuatro escenarios de calidad, uno por cada atributo del
[árbol de utilidad](arbol-utilidad.md), con el formato estándar de escenario
(Fuente / Estímulo / Ambiente / Artefacto / Respuesta / Medida de
respuesta).

Las medidas están pensadas para un proyecto académico en fase
temprana: se validan de forma manual o con una prueba simple, en un
entorno local/demo, sobre datos mockeados y con un número pequeño de
usuarios simulados. No se usan cifras tipo SLA de producción (p. ej.
"99.9% uptime" o miles de usuarios concurrentes) porque el equipo no
tiene la infraestructura ni el tráfico real para sustentarlas.

## 1. Seguridad — autorización por rol

| Campo | Descripción |
|---|---|
| Fuente | Un responsable de inventario autenticado |
| Estímulo | Intenta modificar el precio de un producto del catálogo (operación fuera de su rol) |
| Ambiente | Operación normal, sistema en ejecución (entorno local/demo) |
| Artefacto | API de administración de catálogo (FastAPI) |
| Respuesta | El sistema rechaza la operación (403) y no modifica el precio |
| Medida de respuesta | En una prueba manual con las combinaciones rol/operación no autorizada definidas (comprador y responsable de inventario intentando operaciones de administrador), el 100% son rechazadas |
| Decisión arquitectónica asociada | [`ADR 0001`](adr/0001-monolito-modular.md): el módulo `identity` es dueño único de la autorización y los demás módulos solo pueden consumir su contrato público, regla verificable por prueba. Alternativas evaluadas en la [matriz comparativa](matriz-comparativa-arquitectura.md). |

## 2. Usabilidad — flujo de compra

| Campo | Descripción |
|---|---|
| Fuente | Un comprador autenticado |
| Estímulo | Quiere comprar un producto disponible en el catálogo |
| Ambiente | Operación normal, catálogo con datos mockeados |
| Artefacto | Cliente web (Next.js): búsqueda, carrito y confirmación de pedido |
| Respuesta | El comprador completa el flujo desde la búsqueda hasta la confirmación del pedido |
| Medida de respuesta | El flujo se completa en máximo 4 pantallas/pasos (buscar → ver producto → carrito → confirmar), verificado manualmente sobre el catálogo mockeado |
| Decisión arquitectónica asociada | [`ADR 0001`](adr/0001-monolito-modular.md): un único backend expone catálogo, carrito y pedidos, de modo que el flujo no exige coordinar servicios ni despliegues separados. Alternativas evaluadas en la [matriz comparativa](matriz-comparativa-arquitectura.md). |

## 3. Rendimiento — reflejo de inventario

| Campo | Descripción |
|---|---|
| Fuente | Un comprador autenticado |
| Estímulo | Confirma un pedido que reduce la existencia de un producto mockeado |
| Ambiente | Operación normal, entorno local/demo |
| Artefacto | API (FastAPI) + base de datos (PostgreSQL) |
| Respuesta | El sistema actualiza la existencia y la refleja para otros usuarios que consultan el catálogo |
| Medida de respuesta | En una prueba local con datos de ejemplo, el cambio de existencias se refleja en menos de 2 segundos al recargar la vista de catálogo desde otra sesión |
| Decisión arquitectónica asociada | [`ADR 0001`](adr/0001-monolito-modular.md): pedidos e inventario comparten proceso y transacción sobre una sola base de datos, lo que evita la consistencia eventual que exigiría una separación por despliegues. Alternativas evaluadas en la [matriz comparativa](matriz-comparativa-arquitectura.md). |

## 4. Disponibilidad — consultas concurrentes al catálogo

| Campo | Descripción |
|---|---|
| Fuente | Varios compradores |
| Estímulo | Consultan el catálogo mockeado al mismo tiempo (simulación de hora pico, ej. almuerzo) |
| Ambiente | Demo o sesión de pruebas, entorno local |
| Artefacto | Cliente web (Next.js) + API (FastAPI) |
| Respuesta | El sistema sigue respondiendo a todas las consultas sin caerse |
| Medida de respuesta | En una prueba manual con ~5 usuarios/pestañas simultáneas consultando el catálogo, todas reciben respuesta correcta y el servidor local no se cae ni arroja errores |
| Decisión arquitectónica asociada | [`ADR 0001`](adr/0001-monolito-modular.md): endpoint de solo lectura `GET /catalog/products` servido por el monolito sobre una única instancia de PostgreSQL, sin saltos de red intermedios. Alternativas evaluadas en la [matriz comparativa](matriz-comparativa-arquitectura.md). |

*(Se documentan 4 escenarios, dentro del rango de 3-5 pedido. Un
quinto escenario, por ejemplo de modificabilidad al agregar una
categoría de producto, puede añadirse en una futura iteración si el
equipo lo considera necesario.)*

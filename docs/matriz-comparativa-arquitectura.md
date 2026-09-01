# Matriz comparativa de estilos arquitectónicos

La comparación se realiza para la etapa actual de la Tienda Virtual UTB: un
equipo de cuatro personas, una primera versión académica, un único backend en
FastAPI y sin necesidad demostrada de despliegues independientes.

El criterio de decisión son los escenarios priorizados en el
[árbol de utilidad](arbol-utilidad.md), desarrollados con el formato estándar de
escenario en [escenarios de calidad](escenarios-calidad.md). La primera tabla
compara propiedades generales de cada estilo; la segunda —que es la que sustenta
la decisión— evalúa cada estilo contra esos escenarios.

## Comparación general

| Criterio | Arquitectura por capas | Arquitectura hexagonal | Monolito modular |
|---|---|---|---|
| Complejidad inicial | Baja: organización conocida y directa | Alta: requiere definir puertos, adaptadores y reglas de inversión de dependencias | Media: exige límites explícitos entre módulos, pero conserva un solo despliegue |
| Acoplamiento | Puede aumentar si las capas comparten modelos y servicios | Bajo entre dominio e infraestructura | Bajo entre funcionalidades si cada módulo conserva sus datos y contratos |
| Capacidad de prueba | Media: depende de que las capas no estén fuertemente acopladas | Alta: los puertos facilitan sustituir dependencias | Alta: los módulos pueden probarse de forma aislada y también como conjunto |
| Mantenibilidad | Adecuada al inicio, con riesgo de capas muy grandes | Alta, especialmente cuando existen varias integraciones | Alta para el alcance previsto si se hacen cumplir los límites modulares |
| Escalabilidad evolutiva | Permite crecer verticalmente, pero dificulta extraer funcionalidades acopladas | Facilita cambiar infraestructura, no implica por sí sola despliegues separados | Permite extraer un módulo futuro si aparece una necesidad real de despliegue independiente |
| Curva de aprendizaje | Baja | Alta | Media |
| Velocidad de montaje | Alta | Baja | Media-alta |
| Adecuación al proyecto | Aceptable, pero separa por aspectos técnicos y no por capacidades del negocio | Útil si aumentan las integraciones externas; excesiva para el esqueleto inicial | Alta: representa identidad, catálogo, inventario y pedidos sin introducir infraestructura distribuida |

## Escenarios del árbol de utilidad frente a cada estilo

Cada celda indica si el estilo **mejora**, es **neutro** o **empeora** el
escenario en el alcance actual (un solo despliegue, una única instancia de
PostgreSQL, datos mockeados, sin despliegue real todavía).

| Escenario (IN / RA) | Arquitectura por capas | Arquitectura hexagonal | Monolito modular |
|---|---|---|---|
| **Seguridad** — un responsable de inventario intenta cambiar un precio y el sistema lo rechaza con 403 (H / M) | **Empeora.** El control de rol tiende a repartirse entre la capa de presentación y la de servicios; nada impide que el servicio de catálogo lea directamente los datos de usuario, así que la regla "solo identidad autoriza" no queda verificable. | **Mejora.** Un puerto de autorización explícito convierte el control de rol en una dependencia inyectada y sustituible en pruebas, pero obliga a definir puertos y adaptadores antes de escribir la primera regla. | **Mejora.** El módulo `identity` es dueño único de autenticación y autorización, y los demás módulos solo pueden consumir su contrato público. La regla de dependencia se verifica hoy con `backend/tests/test_architecture.py`. |
| **Usabilidad** — el comprador completa la compra en máximo 4 pantallas (H / L) | **Neutro.** El número de pasos lo determina el cliente Next.js; el estilo del backend no lo altera. | **Empeora.** Neutro en el resultado, pero el costo de montar puertos y adaptadores retrasa justamente el escenario de mayor impacto y menor riesgo, el que más conviene tener funcionando pronto. | **Neutro, con ventaja de montaje.** Tampoco cambia el número de pasos, pero un solo backend expone carrito y pedidos con las mínimas llamadas y sin coordinar despliegues. |
| **Rendimiento** — la existencia se refleja en menos de 2 s tras confirmar un pedido (H / M) | **Neutro.** Una sola base de datos y una transacción bastan; el riesgo es que el código de pedidos escriba directamente las tablas de inventario y la precisión del dato se degrade con el tiempo. | **Neutro.** El puerto de repositorio no cambia la latencia: añade una indirección sin beneficio observable en este alcance. | **Mejora.** Pedidos e inventario comparten proceso y transacción, así que el cambio se refleja de inmediato sin mensajería ni consistencia eventual, y la propiedad del dato queda en `inventory`. |
| **Disponibilidad** — ~5 compradores consultan el catálogo a la vez y todos reciben respuesta (M / M) | **Neutro.** Un endpoint de solo lectura sobre una instancia responde igual. | **Neutro.** La indirección de puertos no influye con ~5 sesiones simultáneas. | **Neutro, con ventaja operativa.** Mismo comportamiento bajo concurrencia, pero mantiene `GET /catalog/products` sin saltos de red intermedios y con siembra idempotente al arrancar. |

Lectura de la tabla: los tres estilos son equivalentes para los escenarios de
usabilidad y disponibilidad, porque en el alcance actual dependen del cliente web
y de una única instancia de base de datos. La diferencia real está en los dos
escenarios de impacto alto y riesgo medio —autorización por rol y reflejo del
inventario—, donde el monolito modular y la arquitectura hexagonal mejoran el
resultado y la arquitectura por capas lo empeora o lo deja sin garantías.

## Resultado

Se selecciona el **monolito modular**. Entre las dos alternativas que mejoran los
escenarios críticos, es la que los cubre sin el costo de montaje que la
arquitectura hexagonal impone al escenario de usabilidad:

- **Autorización por rol (IN alto):** deja a `identity` como dueño único del
  contrato de autorización y hace que la regla sea comprobable por prueba
  automatizada, no solo por convención.
- **Reflejo del inventario (IN alto):** conserva una sola transacción entre
  pedidos e inventario, evitando la consistencia eventual que exigiría una
  separación por despliegues.
- **Flujo de compra (IN alto, RA bajo):** permite montar el corte vertical
  completo pronto, sin definir puertos y adaptadores antes de tener reglas de
  negocio que los justifiquen.

Se comienza con un solo backend ejecutable y una sola base de datos, manteniendo
límites explícitos entre identidad, catálogo, inventario y pedidos. La decisión
completa y sus consecuencias se registran en
[`docs/adr/0001-monolito-modular.md`](adr/0001-monolito-modular.md).

Las tres alternativas no son necesariamente incompatibles en todos los
contextos. En futuras iteraciones, un módulo podría adoptar puertos y
adaptadores internamente si su complejidad o sus integraciones lo justifican
—por ejemplo `identity`, si aparece el SSO institucional como integración
externa.

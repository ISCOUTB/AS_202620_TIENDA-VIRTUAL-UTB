# Análisis de Resiliencia: Tabla de Modos de Fallo y Mitigación

> **Tipo:** evidencia S11 — modos de fallo y mitigación. **Autor:** Equipo
> Tienda Virtual UTB. **Fecha:** 2026-10-18. **Estado:** documento de diseño;
> los patrones seleccionados no están implementados en el código actual.
> **Trazabilidad:** [escenarios de calidad](escenarios-calidad.md),
> [`ADR 0001`](adr/0001-monolito-modular.md),
> [`ADR 0010`](adr/0010-no-extraer-modulos.md) y
> [diseño de idempotencia y saga](idempotencia-saga-s11.md).

A continuación, se presentan los principales modos de fallo identificados para
la arquitectura de la Tienda Virtual, abarcando escenarios de consistencia de
negocio, infraestructura, seguridad y red. Se incluyen los patrones de diseño
arquitectónico seleccionados para mitigar cada riesgo.

**Alcance y estado.** Este documento *selecciona* patrones de mitigación; no
acredita su implementación. En el código actual los módulos `identity`,
`inventory` y `orders` siguen siendo paquetes reservados y no existe un
endpoint de creación de pedidos, así que las mitigaciones F-01, F-03, F-04 y
F-05 quedan como diseño previo verificable contra el repositorio. Las
mitigaciones de infraestructura (F-02, F-06, F-07) dependen además de
componentes —caché, *rate limiting* en el punto de entrada, réplicas— que
tampoco forman parte del stack actual: una única aplicación en Dokploy, según
el [`ADR 0007`](adr/0007-despliegue-dokploy.md).

| ID | Ámbito Arquitectónico | Descripción del Modo de Fallo | Impacto | Patrón de Mitigación / Resiliencia |
| :--- | :--- | :--- | :--- | :--- |
| **F-01** | **Consistencia de Negocio (Pagos Offline)** | **Bloqueo indefinido de inventario.** Dado que el pago en línea está fuera de alcance temporalmente y la coordinación es manual/externa, existe el riesgo de que pedidos abandonados agoten el stock virtual ("falsos agotados"). | **Alto** | **Máquina de Estados y TTL (Time to Live):** Implementación de un proceso programado (Cron Job) de compensación que cancela automáticamente los pedidos en estado `Pendiente_Pago_Manual` tras 24 horas, liberando el inventario. Uso del patrón **Strategy** para la futura integración de la pasarela sin refactorizar el caso de uso central. |
| **F-02** | **Base de Datos y Catálogo** | **Caída o latencia extrema en la base de datos principal** debido a picos inesperados de tráfico de usuarios consultando el catálogo de productos. | **Alto** | **Caché Distribuida y Retries:** Implementación de una capa de caché (ej. Redis) para consultas de solo lectura del catálogo. Si la BD principal falla, se sirve el catálogo desde la caché. Se aplica el patrón **Retry con Backoff Exponencial** para reconectar a la BD sin saturarla. |
| **F-03** | **Concurrencia de Datos** | **Condición de carrera en el inventario.** Múltiples usuarios intentan confirmar un pedido para la última unidad disponible de un producto en el mismo milisegundo. | **Alto** | **Bloqueo Optimista (Optimistic Locking):** Manejo de concurrencia a nivel de base de datos utilizando un campo de `version` en la tabla de inventario. Si el stock fue modificado por otra transacción durante el proceso, la transacción actual falla de forma segura y se notifica al usuario. |
| **F-04** | **Red del Cliente (Cliente-Servidor)** | **Reintentos de creación de pedido.** Un usuario hace clic en "Confirmar Pedido", la red falla antes de recibir respuesta, y el usuario vuelve a presionar el botón generando solicitudes duplicadas. | **Medio** | **Idempotencia en API:** El frontend generará y enviará un `Idempotency-Key` único por cada intento de pedido. El backend validará esta llave; si ya fue procesada exitosamente, retornará la respuesta guardada sin volver a descontar inventario ni duplicar el registro. |
| **F-05** | **Procesos Asíncronos (Notificaciones)** | **Fallo en el servicio de envío de correos.** El servidor SMTP o la API de notificaciones falla al intentar enviar el correo de confirmación de pedido al cliente. | **Medio** | **Mensajería (Pub/Sub) y Dead Letter Queue (DLQ):** Desacoplamiento de las notificaciones. El módulo de pedidos emite un evento asíncrono. Si el envío falla, el mensaje pasa a una DLQ donde un proceso en segundo plano intentará reenviarlo (*Retry pattern*) sin afectar el flujo principal del usuario. |
| **F-06** | **Seguridad y Abuso de API** | **Ataque de fuerza bruta o inundación (Flooding).** Un script malicioso o bot bombardea los endpoints de creación de pedidos o consultas, saturando los recursos del sistema. | **Medio** | **Rate Limiting (Limitación de Tasa):** Configuración en el API Gateway para restringir la cantidad máxima de peticiones permitidas por IP/Usuario en una ventana de tiempo. Se retornará el código HTTP `429 Too Many Requests` protegiendo la infraestructura interna. |
| **F-07** | **Infraestructura y Despliegue** | **Falla catastrófica de un contenedor o servicio (OOM Crash).** El servicio encargado de gestionar los carritos de compra se queda sin memoria y se reinicia, interrumpiendo las sesiones activas. | **Medio** | **Balanceo de Carga y Health Checks:** Despliegue de múltiples réplicas (instancias) del servicio detrás de un Load Balancer. Si el Health Check detecta una instancia no saludable, el tráfico se redirige a las réplicas sanas mientras el orquestador reinicia el nodo fallido de forma transparente. |

## Cómo se relaciona con el resto de la evidencia

- **F-01 y F-03 → [diseño de idempotencia y saga](idempotencia-saga-s11.md):**
  el TTL de 24 horas es el punto de decisión de la saga (paso 3) y el bloqueo
  optimista es la salvaguarda de la transacción local de inventario.
- **F-04 → [diseño de idempotencia y saga](idempotencia-saga-s11.md),
  sección 1:** el mecanismo `Idempotency-Key` descrito allí es la mitigación
  exacta de este modo de fallo.
- **F-02, F-03, F-07 → [escenarios de calidad](escenarios-calidad.md):**
  corresponden a los escenarios 3 (reflejo del inventario) y 4 (disponibilidad
  ante consultas concurrentes).
- **Arquitectura subyacente → [`ADR 0001`](adr/0001-monolito-modular.md) y
  [`ADR 0010`](adr/0010-no-extraer-modulos.md):** los patrones de esta tabla
  se diseñan sobre un monolito modular con una sola base de datos; la decisión
  de no extraer módulos condiciona dónde viven (proceso único) pero no
  elimina ninguno de los riesgos listados.

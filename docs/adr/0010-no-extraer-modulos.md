# ADR 0010: No extraer módulos a microservicios en la fase actual

- **Estado:** Propuesta — pendiente de ratificación
- **Fecha:** 2026-10-18

## Contexto

La Tienda Virtual UTB gestiona los dominios de Catálogo, Pedidos e Inventario
sobre el monolito modular decidido en el [ADR 0001](0001-monolito-modular.md).
Al no contar aún con una pasarela de pagos integrada ni con un SSO institucional
(y manejando los pagos de forma externa/manual), surgió la necesidad de evaluar
si se debía extraer algún módulo (ej. Inventario o Pedidos) hacia un
microservicio independiente para prepararnos para la futura escalabilidad.

La pregunta concreta es si alguna de las razones medibles que el ADR 0001 dejó
abiertas —*"un módulo podrá extraerse en el futuro si aparecen razones medibles
para desplegarlo por separado"*— ya se cumple en este punto del proyecto. El
[análisis de modos de fallo](../modos-fallo-s11.md) y el
[diseño de idempotencia y saga](../idempotencia-saga-s11.md) forman parte del
mismo ejercicio: definir qué garantías de consistencia y resiliencia necesita el
flujo de pedidos antes de decidir dónde viven los procesos.

Los escenarios que condicionan la decisión siguen siendo los del
[árbol de utilidad](../arbol-utilidad.md): el escenario 3 (reflejo del
inventario en menos de 2 segundos) se beneficia de una transacción local y el
escenario 4 (disponibilidad bajo consulta concurrente) se mide hoy sobre un
proceso único, según la
[matriz comparativa](../matriz-comparativa-arquitectura.md).

## Alternativas consideradas

### Extraer el módulo Inventario a un servicio independiente

Publicar `inventory` como servicio de red con su propia base de datos, dejando
que Pedidos lo consuma por HTTP o mensajes.

- Ventaja: escalado independiente del dominio con mayor lectura y despliegue
  aislado de los cambios de stock.
- Desventaja: la reserva de inventario dejaría de ocurrir en la misma
  transacción que el pedido, obligando a la saga distribuida completa en un
  momento en que su lógica (TTL de 24 horas y compensación) todavía no está
  implementada; además se introduce latencia de red en el escenario 3.

### Extraer el módulo Pedidos a un servicio independiente

Publicar `orders` como servicio propio que orqueste el flujo de compra.

- Ventaja: aísla el dominio que más va a cambiar cuando se integre la
  pasarela de pagos.
- Desventaja: en esta fase los pagos son manuales y externos, así que no hay
  carga ni integración real que justifique el despliegue; se duplicarían
  operación, monitoreo y serialización sin un beneficio medible.

### No extraer ningún módulo (monolito modular)

Conservar un único proceso desplegable con separación lógica estricta entre
módulos.

- Ventaja: mantiene las transacciones locales y la operación simple mientras
  se afinan la saga y la idempotencia; sin coste adicional de infraestructura.
- Desventaja: los límites no los impone la red y dependen de la disciplina del
  equipo; un módulo con consumo desmedido de recursos afecta a los demás.

## Decisión

Se ha decidido **NO extraer ningún módulo** a un servicio de red independiente
en este momento. En su lugar, el sistema se mantendrá estrictamente bajo una
arquitectura de **Monolito Modular**. Se implementará una separación lógica
estricta a nivel de código (mediante dominios, paquetes o espacios de nombres
usando Arquitectura Hexagonal / Puertos y Adaptadores), pero todo se
compilará y desplegará como una única unidad (un solo proceso/contenedor).

Esta decisión concreta y confirma el [ADR 0001](0001-monolito-modular.md); no lo
sustituye. Las reglas de dependencia del ADR 0001 (sin imports internos entre
módulos, comunicación por interfaces públicas o eventos, `shared` restringido)
siguen siendo la forma de mantener los límites.

**Condiciones para reabrir la decisión.** Extraer un módulo volverá a
evaluarse si ocurre alguno de estos hechos:

1. La pasarela de pagos en línea se integra y el módulo que la recibe necesita
   desplegarse o escalarse con una cadencia distinta al resto.
2. Un módulo muestra un cuello de botella medible (CPU, memoria o latencia) que
   el monolito no pueda absorber con réplicas completas del proceso.
3. La saga entre Pedidos e Inventario exige coordinación entre procesos
   independientes por un requisito de negocio, no por preferencia de estilo.

## Consecuencias

### Positivas

- Se evita el "Impuesto del Microservicio" (latencia de red, serialización de
  datos, y complejidad de monitoreo distribuido) en una fase temprana donde el
  flujo principal (Catálogo-Pedido) aún puede sufrir cambios drásticos al
  integrar la pasarela definitiva.
- Las transacciones entre Pedidos e Inventario pueden mantenerse más simples
  (transacciones de base de datos) mientras se afina la lógica de la Saga.
- Despliegue e infraestructura mucho más simples y económicos: un único
  contenedor en Dokploy según el [ADR 0007](0007-despliegue-dokploy.md).

### Negativas y riesgos

- Si un módulo consume demasiada memoria (ej. generación de reportes), afectará
  a los demás módulos ya que comparten los mismos recursos del contenedor.
- Exige estricta disciplina del equipo de desarrollo para no saltarse los
  límites lógicos de los módulos (ej. evitar que el módulo de Pedidos consulte
  directamente la tabla de la base de datos del Catálogo sin pasar por su
  interfaz); el alcance real de `backend/tests/test_architecture.py` hoy es
  comprobar que los paquetes existen, no analizar dependencias indebidas.

## Referencias

- [ADR 0001: monolito modular](0001-monolito-modular.md) — decisión original que
  esta concretiza.
- [ADR 0008: separar Catálogo–Inventario](0008-separar-catalogo-inventario.md) —
  separación de *datos* por dueño único dentro del monolito; no implica
  extracción a servicios de red y no entra en conflicto con esta decisión.
- [Modos de fallo y mitigación](../modos-fallo-s11.md) — evidencia S11 que
  motivó la evaluación.
- [Diseño de idempotencia y saga](../idempotencia-saga-s11.md) — garantías de
  consistencia que deben existir antes de considerar una extracción.

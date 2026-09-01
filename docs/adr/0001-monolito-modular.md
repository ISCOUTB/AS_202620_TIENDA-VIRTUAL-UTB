# ADR 0001: Adoptar un monolito modular para el backend

- **Estado:** Aceptada
- **Fecha:** 2026-08-21

## Contexto

La Tienda Virtual UTB debe soportar identidad y acceso, catálogo, inventario y
pedidos. El equipo está comenzando la implementación, está formado por cuatro
integrantes y todavía no tiene requisitos que exijan desplegar o escalar estas
capacidades de manera independiente. El stack acordado es Next.js, FastAPI y
PostgreSQL.

La arquitectura debe permitir que la semana siguiente se concentre en las
capacidades del sistema y no en configurar infraestructura distribuida. Al
mismo tiempo, debe evitar que toda la lógica futura termine mezclada en un solo
paquete.

Los escenarios que motivan esta decisión son los priorizados en el
[árbol de utilidad](../arbol-utilidad.md) y desarrollados en
[escenarios de calidad](../escenarios-calidad.md). Los dos determinantes, por
impacto alto en el negocio y riesgo arquitectónico medio, son:

- [Escenario 1 — Seguridad, autorización por rol](../escenarios-calidad.md#1-seguridad--autorización-por-rol):
  exige que un único responsable de autorización no pueda ser eludido por el
  resto del sistema.
- [Escenario 3 — Rendimiento, reflejo del inventario](../escenarios-calidad.md#3-rendimiento--reflejo-de-inventario):
  exige que la existencia se refleje en menos de 2 segundos tras confirmar un
  pedido, sin recurrir a consistencia eventual.

Los escenarios 2 (usabilidad) y 4 (disponibilidad) no discriminan entre las
alternativas en el alcance actual, por lo que no pesan en esta decisión; el
análisis por escenario está en la
[matriz comparativa](../matriz-comparativa-arquitectura.md).

## Alternativas consideradas

### Arquitectura por capas

Organizar el backend en presentación, servicios, dominio y persistencia.

- Ventaja: estructura sencilla, conocida y rápida de iniciar.
- Desventaja: las funcionalidades suelen atravesar todas las capas y pueden
  terminar compartiendo modelos o servicios sin límites claros.

### Arquitectura hexagonal

Aislar el dominio detrás de puertos y conectar API, persistencia y servicios
externos mediante adaptadores.

- Ventaja: alto aislamiento y facilidad para sustituir infraestructura.
- Desventaja: agrega interfaces y estructura que todavía no están justificadas
  por la cantidad de integraciones o lógica existente.

### Monolito modular

Mantener un único backend desplegable, dividido por capacidades del negocio con
límites explícitos.

- Ventaja: combina operación sencilla con separación funcional y permite una
  posible extracción futura de módulos.
- Desventaja: los límites no los impone la red; el equipo debe conservarlos
  mediante convenciones y pruebas.

La evaluación detallada —tanto por criterios generales como por escenario del
árbol de utilidad— está en
[`docs/matriz-comparativa-arquitectura.md`](../matriz-comparativa-arquitectura.md).

## Decisión

Se adopta un **monolito modular** para el backend FastAPI. El código se agrupará
inicialmente en los módulos `identity`, `catalog`, `inventory` y `orders`, más
un paquete `shared` reservado para elementos genuinamente transversales.

Reglas de dependencia:

1. Un módulo no importará detalles internos de otro módulo.
2. La comunicación futura entre módulos se realizará mediante interfaces
   públicas o eventos internos definidos explícitamente.
3. `shared` no se utilizará como depósito de lógica que pertenezca a un módulo.
4. La API FastAPI será el punto de entrada del backend; Next.js se mantendrá
   como cliente web independiente.
5. PostgreSQL será una única instancia en esta etapa. La propiedad de tablas y
   datos se definirá por módulo cuando se incorpore persistencia.

## Consecuencias

### Positivas

- Un solo backend, una sola base de datos y un solo proceso de despliegue
  reducen el costo operativo inicial.
- Los paquetes reflejan las capacidades descritas en la documentación.
- Es posible probar cada módulo de manera aislada y el sistema completo de
  forma integrada.
- Un módulo podrá extraerse en el futuro si aparecen razones medibles para
  desplegarlo por separado.

### Negativas y riesgos

- Las dependencias indebidas entre módulos pueden aparecer si no se revisan y
  prueban las reglas anteriores.
- Una base de datos compartida puede facilitar accesos cruzados no deseados.
- Si cada módulo crea abstracciones prematuramente, la estructura puede añadir
  complejidad sin aportar valor.

### Trabajo futuro

- Incorporar una prueba de arquitectura más estricta cuando exista código de
  negocio y sea posible analizar dependencias entre módulos.
- Registrar nuevos ADR si se adopta arquitectura hexagonal dentro de un módulo,
  cambia el mecanismo de autenticación o se separa algún despliegue.

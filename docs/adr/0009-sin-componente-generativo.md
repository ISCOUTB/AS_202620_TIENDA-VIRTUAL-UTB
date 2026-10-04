# ADR 0009: No incorporar un componente generativo en tiempo de ejecución

- **Estado:** Propuesta — pendiente de revisión y ratificación del equipo
- **Fecha:** 2026-10-04

## Contexto

La IA se ha usado como apoyo de desarrollo y queda registrada en `docs/ia.md`,
pero el código, contratos, dependencias y escenarios no contienen ni anuncian
un modelo generativo en tiempo de ejecución. Catálogo, Inventario, Identidad y
Pedidos tienen comportamiento determinista. Incorporar generación exigiría un
caso de negocio, datos de evaluación, tratamiento de privacidad, presupuesto y
medidas de calidad que hoy no existen.

## Alternativas consideradas

1. **Recomendador o asistente generativo.** Podría mejorar descubrimiento, pero
   no hay requisito, conjunto de evaluación ni datos suficientes para demostrar
   valor o controlar respuestas incorrectas.
2. **Generación de descripciones.** Añade costo, latencia y moderación a datos que
   un administrador puede registrar de forma determinista.
3. **No incorporar generación.** Mantiene el alcance y evita enviar datos a un
   proveedor externo. Es la propuesta para este incremento.

## Propuesta de decisión

No incorporar ni planificar por ahora un componente generativo en producción.
Por ello no corresponde fabricar un conjunto de evaluación, costo por operación
o latencia de un componente inexistente. Si aparece un caso de uso, deberá
abrirse otro ADR antes de implementarlo e incluir dataset, métricas, umbrales,
privacidad, costo y latencia medidos.

## Consecuencias

- No se agregan SDK, credenciales ni llamadas a proveedores de modelos.
- No hay costo o latencia generativa por operación: **no aplica**, no cero medido.
- La IA de apoyo al desarrollo sigue auditándose en `docs/ia.md`.

## Revisión humana pendiente

El equipo debe decidir si acepta esta ausencia de componente generativo. Hasta
entonces el ADR permanece como propuesta y no se atribuye la decisión al equipo.

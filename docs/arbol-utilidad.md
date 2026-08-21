# Árbol de utilidad

Árbol de utilidad (estilo ATAM) para la Tienda Virtual UTB, derivado de
las tensiones de calidad identificadas en `docs/problema.md` y
`docs/aspectos.md`. Cada hoja se prioriza con dos escalas
Alto/Medio/Bajo (H/M/L):

- **Impacto en el negocio (IN):** qué tan importante es para el
  equipo/usuarios que se cumpla ese escenario.
- **Riesgo arquitectónico (RA):** qué tan difícil o riesgoso es
  lograrlo con el stack y el alcance actuales (FastAPI + Next.js +
  PostgreSQL, datos mockeados, sin despliegue real todavía).

Las hojas marcadas con (*) tienen su escenario completo desarrollado
en `docs/escenarios-calidad.md`.

## Utility

### Security

- Autenticación de usuarios (login propio, sin SSO institucional)
  — IN: H, RA: M
- Autorización por rol: un comprador no puede administrar el catálogo;
  un responsable de inventario no puede cambiar precios (*)
  — IN: H, RA: M

### Usability

- Un comprador completa una compra (buscar → carrito → confirmar
  pedido) en el mínimo número de pasos posible (*)
  — IN: H, RA: L
- Los mensajes de error (ej. producto sin existencias) son claros
  para el comprador
  — IN: M, RA: L

### Performance

- Las existencias se actualizan y son visibles para otros usuarios
  poco después de confirmarse un pedido (*)
  — IN: H, RA: M
- El catálogo carga en un tiempo razonable sobre datos mockeados
  — IN: M, RA: L

### Availability

- El catálogo sigue respondiendo cuando varios usuarios lo consultan
  a la vez (simulación de hora pico, ej. almuerzo) (*)
  — IN: M, RA: M
- El sistema se recupera sin pérdida de datos ante un reinicio del
  servidor local/demo
  — IN: L, RA: L

## Nota sobre alcance

Dado que el proyecto está en fase temprana (datos mockeados, sin
despliegue real todavía, ver `docs/disponibilidad.md`), este árbol
prioriza escenarios que el equipo puede validar manualmente o con
pruebas simples en un entorno local/demo, no comportamientos de
producción a gran escala.

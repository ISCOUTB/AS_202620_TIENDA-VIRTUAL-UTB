# C4 — Contexto (Nivel 1)

Actores y su interacción con el sistema Tienda Virtual UTB. En esta
fase el sistema no depende de ningún sistema externo: la
autenticación es propia (no hay SSO institucional integrado) y no hay
pasarela de pago en el alcance (ver `docs/arc42/arc42-template-EN.md`,
sección *Architecture Constraints*, y `docs/problema.md`).

```mermaid
C4Context
    title Diagrama de contexto — Tienda Virtual UTB

    Person(comprador, "Comprador", "Estudiante, docente, funcionario o egresado")
    Person(admin, "Administrador de la tienda", "Personal autorizado para administrar la tienda")
    Person(inventario, "Responsable de inventario", "Personal encargado de las existencias")

    System(sistema, "Tienda Virtual UTB", "Sistema de comercio electrónico de la universidad")

    Rel(comprador, sistema, "Consulta catálogo, gestiona carrito y crea o consulta pedidos")
    Rel(admin, sistema, "Administra catálogo, precios y estado de pedidos")
    Rel(inventario, sistema, "Consulta y actualiza existencias")
```

## Notas

- **Pasarela de pago** y **SSO institucional** quedan fuera de este
  contexto por decisión de alcance de esta entrega; se consideran
  extensiones futuras, no dependencias actuales.
- El sistema opera sobre datos mockeados/seed (catálogo, existencias y
  pedidos de ejemplo), no sobre una integración real con la
  cafetería o la universidad.

# C4 — Contexto (Nivel 1)

Actores y su interacción con el sistema Tienda Virtual UTB. En esta
fase el sistema no depende de ningún sistema externo: la
autenticación es propia (no hay SSO institucional integrado) y no hay
pasarela de pago en el alcance (ver `docs/arc42/arc42-template-EN.md`,
sección *Architecture Constraints*, y `docs/problema.md`).

```mermaid
C4Context
    title Diagrama de contexto — Tienda Virtual UTB

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")

    Person(comprador, "Comprador", "Estudiante, docente, funcionario o egresado")
    Person(admin, "Administrador de la tienda", "Personal autorizado para administrar la tienda")
    Person(inventario, "Responsable de inventario", "Personal encargado de las existencias")

    System(espacio_izquierdo, "", "")
    UpdateElementStyle(espacio_izquierdo, $bgColor="transparent", $fontColor="transparent", $borderColor="transparent")
    System(sistema, "Tienda Virtual UTB", "Sistema de comercio electrónico de la universidad")

    Rel_D(comprador, sistema, "Realiza compras")
    Rel_D(admin, sistema, "Administra la tienda")
    Rel_D(inventario, sistema, "Gestiona existencias")
```

## Notas

- **Pasarela de pago** y **SSO institucional** quedan fuera de este
  contexto por decisión de alcance de esta entrega; se consideran
  extensiones futuras, no dependencias actuales.
- El sistema opera sobre datos mockeados/seed (catálogo, existencias y
  pedidos de ejemplo), no sobre una integración real con la
  cafetería o la universidad.

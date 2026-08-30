
# Registro de uso de inteligencia artificial

Este documento registra de forma transparente el uso de herramientas de
inteligencia artificial durante el proyecto. El equipo es responsable de revisar, corregir y aprobar todo contenido incorporado al repositorio.

| Fecha | Herramienta | Propósito | Resultado utilizado | Validación humana |
|---|---|---|---|---|
| 2026-08-09 | ChatGPT/Codex | Interpretar la consigna y preparar una estructura inicial para la evidencia S1. | Borradores del README, ficha del problema, aspectos de calidad y disponibilidad técnica. | Revisado y aprobado por todos los integrantes del grupo. |
| 2026-08-29 | Claude Code | Redactar el incremento de la evidencia S4 (arc42 5–6, 9, 10 y glosario; C4 nivel 2; fila de aspectos) e implementar el corte vertical del catálogo. | Secciones arc42, `docs/c4/container.md`, tabla de aspectos, módulo `catalog` (router/repository/models/schemas/seed), `shared/database.py`, vista del catálogo en Next.js y pruebas. | Pruebas ejecutadas localmente (5/5) y build del frontend verificado. La primera versión quedó redactada en inglés, error corregido en la revisión posterior del mismo día. |
| 2026-08-29 | Claude Code (Opus) | Revisar el incremento S4 contra lo solicitado y corregir los desvíos encontrados. | Traducción al español de todo el documento arc42 (secciones 1–12, diagramas y títulos), homogeneización de los nombres de sección citados en `README.md` y `docs/c4/`, y corrección de una descripción desactualizada en el código del módulo `catalog`. | Pruebas ejecutadas de nuevo (5/5) y enlaces internos verificados. Pendiente de revisión y aprobación final del equipo. |

## Consulta inicial

> ¿Cómo empezar y qué hacer para preparar la evidencia S1 del proyecto Tienda
> Virtual UTB a partir de los archivos existentes?

## Criterios de uso

- No se aceptan automáticamente las respuestas de la herramienta.
- El equipo contrasta las propuestas con la consigna y el contexto real.
- Las decisiones finales y la autoría de la entrega son responsabilidad del equipo.

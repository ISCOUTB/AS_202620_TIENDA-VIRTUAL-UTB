
# Registro de uso de inteligencia artificial

Este documento registra de forma transparente el uso de herramientas de
inteligencia artificial durante el proyecto. El equipo es responsable de revisar, corregir y aprobar todo contenido incorporado al repositorio.

| Fecha | Herramienta | Propósito | Resultado utilizado | Validación humana |
|---|---|---|---|---|
| 2026-08-09 | ChatGPT/Codex | Interpretar la consigna y preparar una estructura inicial para la evidencia S1. | Borradores del README, ficha del problema, aspectos de calidad y disponibilidad técnica. | Revisado y aprobado por todos los integrantes del grupo. |
| 2026-08-29 | Claude Code | Redactar el incremento de la evidencia S4 (arc42 5–6, 9, 10 y glosario; C4 nivel 2; fila de aspectos) e implementar el corte vertical del catálogo. | Secciones arc42, `docs/c4/container.md`, tabla de aspectos, módulo `catalog` (router/repository/models/schemas/seed), `shared/database.py`, vista del catálogo en Next.js y pruebas. | Pruebas ejecutadas localmente (5/5) y build del frontend verificado. La primera versión quedó redactada en inglés y ese mismo día se tradujo al español; esa traducción se revirtió el 2026-08-31 (ver última fila). |
| 2026-08-29 | Claude Code (Opus) | Revisar el incremento S4 contra lo solicitado y corregir los desvíos encontrados. | Traducción al español de todo el documento arc42 (secciones 1–12, diagramas y títulos), homogeneización de los nombres de sección citados en `README.md` y `docs/c4/`, y corrección de una descripción desactualizada en el código del módulo `catalog`. | Pruebas ejecutadas de nuevo (5/5) y enlaces internos verificados. Pendiente de revisión y aprobación final del equipo. |
| 2026-08-31 | Claude Code (Sonnet) | Revertir la traducción del 2026-08-29: el equipo decide mantener el documento arc42 en inglés (`arc42-template-EN.md`) y rehacer el incremento S4 sobre esa base. | Documento arc42 reescrito en inglés partiendo del estado previo a los dos últimos commits, con el incremento de secciones 5–11 y glosario; nombres de sección en inglés restaurados en `README.md` y `docs/c4/`; comandos de arranque y prueba del corte vertical explícitos en el README; nota de alcance añadida en `docs/aspectos.md`. Los seis diagramas de arc42 se rehicieron para que sean legibles: leyenda de color/forma común, etiquetas en lenguaje llano, numeración de figuras (Fig. 4.1–7.1) y alcance explícito bajo cada uno. | Pruebas del backend ejecutadas localmente (5/5). Los seis diagramas Mermaid validados en un renderizador. Pendiente de revisión y aprobación final del equipo. |

## Consulta inicial

> ¿Cómo empezar y qué hacer para preparar la evidencia S1 del proyecto Tienda
> Virtual UTB a partir de los archivos existentes?

## Criterios de uso

- No se aceptan automáticamente las respuestas de la herramienta.
- El equipo contrasta las propuestas con la consigna y el contexto real.
- Las decisiones finales y la autoría de la entrega son responsabilidad del equipo.

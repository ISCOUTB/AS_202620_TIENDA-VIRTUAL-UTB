# ADR 0003: Cliente web desplegado en Vercel

- **Estado:** Propuesta, pendiente de verificación del despliegue real.
- **Fecha:** 2026-09-26
- **Relacionada:** [ADR 0002](0002-contrato-integracion-http.md) (la integración HTTP se conserva; cambia dónde corre el cliente).

## Contexto

La evidencia S8 exige una URL pública accesible desde fuera de la red de la
universidad, con capa gratuita verificable **sin tarjeta de crédito** y sin
comprar dominio. El cliente es Next.js con App Router y renderizado en el
servidor (`frontend/app/page.tsx` consulta la API desde el servidor).

## Alternativas consideradas

| Alternativa | Ventajas | Costos y adecuación |
|---|---|---|
| Vercel | Plataforma nativa de Next.js: SSR como funciones + CDN, HTTPS y URL `*.vercel.app` automáticos, capa Hobby gratis sin tarjeta | Dependencia de un proveedor; el equipo no controla el runtime |
| Contenedor propio (Render/la misma máquina que la API) | Un solo proveedor para todo | El plan free de Render suspende el servicio sin tráfico y un solo free service por imagen; peor experiencia que el CDN para una página |
| `next export` como sitio estático (GitHub Pages) | Gratis y sin servidor | El frontend usa renderizado en servidor (`cache: "no-store"`) para leer siempre el estado real de la API: la exportación estática lo rompería |

## Decisión

Desplegar el cliente web en **Vercel** (plan Hobby, $0/mes). El consumo de la
API sigue siendo servidor-a-servidor: la página se renderiza en Vercel y llama
a `API_URL` (variable de entorno del proyecto, raíz `frontend/`), por lo que el
navegador nunca habla con la API ni hace falta configurar CORS.

## Consecuencias

- La URL pública de entrega es la de Vercel; cumple «accesible desde fuera de
  la red UTB» sin configuración extra.
- **Capa gratuita verificada:** Hobby incluye hosting, HTTPS y CDN sin tarjeta.
  Límites de ancho de banda/funciones muy por encima del volumen del escenario
  (~5 usuarios concurrentes).
- **Costo como consecuencia:** $0/mes en el volumen de la demo
  (`docs/costos-despliegue.md`).
- Un cambio de proveedor solo exige reconstruir el sitio Next.js en otro host;
  el código no tiene nada específico de Vercel más allá de `vercel.json`.

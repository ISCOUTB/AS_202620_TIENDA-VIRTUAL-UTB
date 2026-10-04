# ADR 0007: despliegue unificado en Dokploy

- **Estado:** Aceptada e implementada.
- **Fecha:** 2026-10-04.
- **Sustituye:** ADR 0003, 0004, 0005 y 0006 para el despliegue vigente.

## Contexto

El frontend, la API y PostgreSQL estaban repartidos entre Vercel, Render y
Neon, con una segunda propuesta de Terraform que nunca llegó a aplicarse. El
equipo decidió operar el sistema desde una instancia de Dokploy y usar como
fuente de despliegue un único Docker Compose versionado.

## Decisión

Dokploy despliega `deploy/compose.lab.yaml` como Docker Compose estándar. El
stack contiene Next.js, FastAPI y PostgreSQL 17. Next.js es el único servicio
que recibe un dominio público; consume FastAPI mediante SSR por la red interna.
FastAPI y PostgreSQL no publican puertos del host.

PostgreSQL persiste en un volumen nombrado, elegible para las copias de
seguridad de Dokploy. La contraseña se inyecta desde Environment y nunca se
versiona. Los dominios y certificados se administran desde Dokploy, por lo que
el Compose no contiene etiquetas de Traefik ni nombres de dominio.

## Consecuencias

- El despliegue completo se reconstruye desde un solo archivo y una variable
  secreta.
- Desaparecen el keep-alive y la coordinación de tres proveedores.
- El servidor de Dokploy pasa a concentrar frontend, API y datos; sus recursos,
  copias de seguridad y recuperación son responsabilidad del operador.
- La API podrá recibir un dominio posteriormente sin cambiar la comunicación
  interna del frontend.

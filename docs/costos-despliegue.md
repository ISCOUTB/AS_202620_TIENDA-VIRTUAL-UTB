# Estimación de costo del despliegue en Dokploy

> **Fecha:** 2026-10-04. **Trazabilidad:**
> [ADR 0007](adr/0007-despliegue-dokploy.md).

Dokploy ejecuta frontend, API y PostgreSQL en un único servidor. El software es
autohospedado, pero el costo total depende del servidor, su almacenamiento y el
destino externo de las copias de seguridad; no se puede afirmar `$0/mes` sin
conocer esos servicios.

## Supuestos de capacidad

- Aproximadamente 5 usuarios concurrentes y hasta 10.000 peticiones mensuales.
- Menos de 50 MB de datos en la etapa académica.
- Una instancia de Next.js, una de FastAPI y PostgreSQL 17.
- TLS y enrutamiento administrados por el Traefik incluido en Dokploy.

## Componentes del costo

| Pieza | Ejecución | Costo incremental de software |
|---|---|---:|
| Frontend Next.js | Contenedor en el servidor Dokploy | $0 |
| API FastAPI | Contenedor en el servidor Dokploy | $0 |
| PostgreSQL | Contenedor y volumen nombrado | $0 |
| Dokploy y Traefik | Autohospedados | $0 |
| Servidor, disco y tráfico | Proveedor aún no documentado | Por confirmar |
| Backup externo | Destino S3 compatible aún no elegido | Por confirmar |

Para cerrar la estimación mensual se deben registrar el plan real del servidor,
el almacenamiento aprovisionado y la política de retención de backups. El
principal riesgo operativo ya no es un límite gratuito por proveedor, sino que
un único servidor concentra las tres capas; por eso la copia externa y una
restauración ensayada son obligatorias antes de tratarlo como producción.

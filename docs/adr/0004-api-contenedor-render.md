# ADR 0004: API como contenedor siempre activo en Render (no función serverless)

- **Estado:** Sustituida el 2026-10-04 por el [ADR 0007](0007-despliegue-dokploy.md).
  Se conserva como registro histórico del despliegue anterior.
- **Fecha:** 2026-09-26
- **Relacionada:** [ADR 0001](0001-monolito-modular.md) (un solo proceso
  desplegable), [escenario 3](../escenarios-calidad.md#3-rendimiento--reflejo-de-inventario)
  (existencias reflejadas en <2 s).

## Contexto

La consigna de la semana pide decidir por pieza si corre como contenedor,
función o servicio gestionado, y descalificar lo que no aplique. La API es un
monolito modular FastAPI cuyo `lifespan` crea el esquema y siembra el catálogo
al arrancar, y que mantiene un pool de conexiones a PostgreSQL.

## Alternativas consideradas

| Alternativa | Ventajas | Costos y adecuación |
|---|---|---|
| Contenedor en Render (plan free) | Proceso siempre activo: pool de conexiones persistente, `lifespan` se ejecuta una vez por arranque real, `Dockerfile` ya existe y `render.yaml` lo versiona | El plan free suspende tras ~15 min sin tráfico (cold start ~50 s); se mitiga con monitor externo (UptimeRobot, gratis) |
| Función serverless (Vercel Python / AWS Lambda + Mangum) | Pago por uso, escala a cero | **Descalificada por el escenario de calidad:** el cold start (1–10 s) puede romper la medida de <2 s del escenario 3; además cada cold start ejecutaría `create_all` + seed contra la BD, y las conexiones a Postgres no sobreviven entre invocaciones. La carga académica no aprovecha el pago por uso |
| Servidor del laboratorio (Docker Compose) | Siempre sin tarjeta, control total | Depende de que sea accesible desde fuera de la red UTB y de su disponibilidad; queda como alternativa documentada si la URL pública falla |
| Fly.io / Railway | Buenos contenedores gestionados | Fly.io exige tarjeta para la capa gratuita; Railway agota su crédito de prueba. Incumplen «sin tarjeta» |

## Decisión

La API corre como **contenedor en Render** (plan free, $0/mes), construido desde
`backend/Dockerfile` y versionado como Blueprint en `render.yaml`. Un monitor
externo gratuito (UptimeRobot, ping a `/health` cada 5 min) evita la suspensión
por inactividad y aporta evidencia de disponibilidad del escenario 4.

## Consecuencias

- **Capa gratuita verificada:** Render free permite un web service Docker con
  health check sin tarjeta; la suspensión por inactividad es el límite
  conocido y queda mitigada por el monitor.
- **Costo como consecuencia:** $0/mes; la alternativa sin suspensión (Render
  Starter) costaría ~USD 7/mes y queda como escalón si la demo lo exige.
- La API queda separada del frontend y de la BD en tres proveedores
  distintos: cada pieza puede sustituirse sin tocar las demás
  (`/metrics`, `/health` y logs JSON permiten observarla donde corra).
- Si el volumen real creciera, la decisión se revisa con datos de `/metrics`,
  no con supuestos.

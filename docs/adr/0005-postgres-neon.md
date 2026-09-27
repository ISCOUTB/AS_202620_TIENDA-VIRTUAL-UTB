# ADR 0005: PostgreSQL gestionado en Neon (serverless)

- **Estado:** Implementada — la API en Render consume la instancia Neon
  (`wandering-star-51602409`, rama `production`) en producción; verificado el
  2026-09-27 con `/health/ready` → 200 desde la URL pública.
- **Fecha:** 2026-09-26
- **Relacionada:** [ADR 0001](0001-monolito-modular.md) (una sola instancia
  PostgreSQL, propiedad de tablas por módulo) y [ADR 0004](0004-api-contenedor-render.md).

## Contexto

El backend necesita un PostgreSQL accesible por red desde la API desplegada.
La restricción de la evidencia es capa gratuita **sin tarjeta**. Una base de
datos no es una función: es estado persistente, así que la elección es entre
servicios gestionados con capa gratuita.

## Alternativas consideradas

| Alternativa | Ventajas | Costos y adecuación |
|---|---|---|
| Neon (Postgres serverless) | Capa gratuita sin tarjeta y **sin expiración**: 0,5 GB, auto-suspensión a cero y wake en ~0,5–1 s; cadena `postgresql://` estándar que `DATABASE_URL` ya consume | La base de datos duerme sin tráfico; el wake añade <1 s a la primera consulta — aceptable para la demo y para la medida de 2 s (ocurre una vez, no por petición) |
| Render PostgreSQL (plan free) | Mismo proveedor que la API, cero fricción de red | **La capa gratuita expira a los ~30 días** y obliga a recrear la base: incompatible con una entrega evaluable semanas después |
| Supabase | Postgres gestionado gratis sin tarjeta | Alternativa equivalente válida; se descarta solo por no añadir un tercer proveedor más (Auth, Storage) que el alcance no usa |
| Postgres en el propio Render/VM | Sin servicios externos | Render free no ofrece disco persistente gratis; autoconstruir la BD es deuda operativa sin beneficio |
| Railway / AWS RDS / Azure | Gestionados sólidos | Railway agota crédito de prueba; RDS/Azure exigen tarjeta y sobrepasan el alcance |

## Decisión

La base de datos corre en **Neon** (Postgres serverless, plan gratuito,
$0/mes). La API la consume vía `DATABASE_URL` definida como secreto en Render
(`sync: false` en `render.yaml`); el esquema y el seed se crean solos al
arrancar, así que la base vacía basta para el primer despliegue.

## Consecuencias

- **Capa gratuita verificada:** 0,5 GB y un proyecto por cuenta, sin tarjeta ni
  fecha de caducidad — suficiente para el catálogo mockeado y el volumen de la
  demo.
- **Costo como consecuencia:** $0/mes; el primer escalón de Neon (~USD 19/mes)
  solo aplicaría si el almacenamiento o el cómputo superaran la capa gratuita.
- El cambio de motor seguiría siendo `DATABASE_URL`: ningún código conoce Neon,
  así que migrar a otro Postgres es un cambio de configuración, no de código.
- La auto-suspensión de Neon y la de Render se mitigan juntas con el monitor de
  disponibilidad (ADR 0004).

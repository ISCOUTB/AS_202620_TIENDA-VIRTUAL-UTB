# Estimación de costo mensual del despliegue S8

> **Fecha:** 2026-09-26. **Método:** el costo sale del volumen del escenario de
> calidad, no del catálogo del proveedor. **Trazabilidad:** ADR
> [0003](adr/0003-frontend-vercel.md), [0004](adr/0004-api-contenedor-render.md),
> [0005](adr/0005-postgres-neon.md).

## Supuestos de volumen

Derivados del escenario 4 (`docs/escenarios-calidad.md`) y del alcance académico:

- ~5 usuarios concurrentes en hora pico; demostración y evaluación, no tráfico
  de producción. Estimación: **≤ 10.000 peticiones/mes** a la API.
- Datos persistidos: catálogo mockeado + crecimiento inicial → **≤ 50 MB**.
- API activa las 24 h solo para sostener la demo: **~720 h/mes** de proceso.
- Sin envíos masivos, sin ficheros, sin trabajos programados (aún no existen
  en el sistema).

## Costo por pieza en el mes

| Pieza | Plataforma y capa | Consumo estimado | Capa gratuita | Costo mensual |
|---|---|---|---|---|
| Cliente web | Vercel Hobby | ~10 mil renders SSR + ancho de banda mínimo | Incluye hosting, CDN y HTTPS | $0 |
| API | Render free (Docker) | 720 h/mes de un web service | 750 h de instancia/mes; suspende a los 15 min sin tráfico (mitigado con monitor) | $0 |
| Base de datos | Neon free | ≤50 MB, cómputo intermitente | 0,5 GB + 190 h de cómputo; auto-suspende a cero | $0 |
| Monitor | GitHub Actions (cron en `keepalive.yml`) | 1 ping cada 10 min a `/health` | Repositorio público: minutos de Actions ilimitados | $0 |
| CI + análisis | GitHub Actions + SonarCloud | minutos de build por push | Repo público: Actions ilimitado; SonarCloud gratis para OSS | $0 |
| **Total** | | | | **$0/mes** |

## Contrastado con alternativas

| Alternativa | Costo estimado al mismo volumen | Por qué no se eligió |
|---|---|---|
| Render Starter (API sin suspensión) | ~USD 7/mes | El monitor gratuito ya evita la suspensión |
| Railway | ~USD 5/mes de consumo mínimo tras el crédito de prueba | Exige tarjeta; el crédito se agota |
| Fly.io | ~USD 3–7/mes (máquina siempre activa) | Exige tarjeta |
| AWS (Fargate + RDS mínimos) | ≥ USD 25–40/mes | Sobredimensionado y exige tarjeta |
| Servidor del laboratorio | $0 | Válido y siempre sin tarjeta, pero depende de acceso externo y disponibilidad del laboratorio; queda como alternativa documentada |

## Punto de ruptura de la capa gratuita

Volumen al que cada pieza deja de ser gratis — comparado con el supuesto
(~10 mil req/mes, ≤50 MB, un servicio siempre activo):

| Pieza | Se rompe la capa gratuita cuando… | Holgura vs. supuesto |
|---|---|---|
| Vercel Hobby | >100 GB de ancho de banda/mes o límites de ejecución de funciones | >100× |
| Render free | >750 h de instancia/mes **por espacio de trabajo** (no por servicio: un servicio 24/7 = ~720 h) o cuando el monitor deje de evitar la suspensión | Justa en horas, y con un solo servicio; ver la advertencia de coexistencia |
| Neon free | >0,5 GB de datos o >190 CU-horas de cómputo/mes | ~10× en datos; el cómputo suspende a cero sin tráfico |
| Monitor (Actions) | Se agota el allotment de minutos de Actions del repositorio, o los jobs se desactivan por inactividad a 60 días sin actividad en repositorios públicos | Irrelevante: repositorio público, ~4 320 llamadas/mes de curl de segundos |

> **Corrección 2026-09-28.** Esta tabla decía UptimeRobot con un check cada
> 5 min. UptimeRobot **se descartó** —requería una cuenta más, que es la misma
> fricción que hizo rechazar Terraform Cloud— y la función la cumple el cron de
> `.github/workflows/keepalive.yml` cada 10 min. El total no cambia: $0/mes.

## Riesgos de costo

- El plan free de Render **suspende sin tráfico**: si el monitor falla, la
  primera carga del evaluador pagaría un cold start (~50 s), no dinero.
- Las 750 h de Render son **por espacio de trabajo y mes**, no por servicio. Por
  eso la migración a Terraform
  ([`despliegue-terraform.md`](despliegue-terraform.md)) tiene que apurar el
  corte: dos servicios en marcha un mes entero superarían el límite y Render
  suspendería **ambos** hasta el mes siguiente.
- Neon free limita a 0,5 GB y suspende el cómputo inactivo; superar la capa
  llevaría al escalón ~USD 19/mes — improbable con ≤50 MB.
- Ninguna capa gratuita garantiza SLA: el sistema es una demo académica, no
  producción. Si el volumen creciera, la primera pieza en escalar sería la API
  (Render Starter ~USD 7/mes).

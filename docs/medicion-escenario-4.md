# Medición del escenario 4 — Disponibilidad ante consultas concurrentes

Resultado de medir el [escenario 4](escenarios-calidad.md#4-disponibilidad--consultas-concurrentes-al-catálogo)
contra el código actual (API 0.5.0, con RLS y migraciones Alembic) y su
contraste con el umbral definido. Reemplaza la medición previa de
[entrega-cadena-ia.md](entrega-cadena-ia.md#3-medición-del-escenario-ac-04), que
se hizo sobre SQLite y una versión anterior de la API.

## 1. Umbral del escenario

> Con 5 usuarios simulados simultáneos, las 5 cargas de
> `GET /catalog/products` + `GET /inventory` reciben datos coherentes, no hay
> errores y `/health` continúa respondiendo 200.

Se traduce a cuatro condiciones verificables por el medidor
([`measure_catalog_availability.py`](../backend/scripts/measure_catalog_availability.py)):

| # | Condición | Cómo se comprueba |
|---|---|---|
| C1 | 5 de 5 cargas completadas | `respuestas_correctas == 5` |
| C2 | Datos coherentes | El conjunto de `id` del catálogo es igual al de `product_id` del inventario, y no está vacío |
| C3 | Cero errores | `errores == []` (cualquier estado ≠ 200, timeout de 10 s o excepción cuenta como error) |
| C4 | `/health` responde 200 tras la concurrencia | La consulta final no lanza excepción |

El escenario **no fija un umbral de latencia**; las latencias se informan como
evidencia, no como criterio de aceptación.

## 2. Entorno

| Elemento | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Equipo | 12 CPU lógicas, 7,5 GiB de RAM, Linux 7.0.0-42-generic |
| API | Imagen del repo (`backend/Dockerfile`, Python 3.12), Uvicorn de un solo proceso, 127.0.0.1:8019 |
| Base de datos | PostgreSQL 17 (`postgres:17-alpine`) efímero en contenedor, con el rol sin privilegios `tienda_app` sujeto a RLS (ADR 0014) |
| Datos | `python -m app.seed`: 5 tiendas, 55 productos, 55 existencias |
| Cliente | El medidor, en la misma máquina (loopback) |

No se midió Dokploy, la red real ni el frontend Next.js.

## 3. Procedimiento

```bash
docker build -f backend/Dockerfile -t tienda-api-medicion .
# PostgreSQL 17 con deploy/postgres/initdb montado, luego en la imagen:
alembic upgrade head && python -m app.seed
uvicorn app.main:app --host 127.0.0.1 --port 8019

python3 backend/scripts/measure_catalog_availability.py \
  --base-url http://127.0.0.1:8019 --users 5
```

Se hizo una corrida inicial y cinco repeticiones para ver la variabilidad
(6 corridas, 30 cargas de catálogo + inventario en total).

## 4. Resultados

| Corrida | Correctas | Errores | Duración total (ms) | Carga promedio (ms) | Carga máxima (ms) | `/health` (ms) | Cumple |
|---|---|---|---|---|---|---|---|
| 1 | 5/5 | 0 | 43,75 | 37,02 | 41,78 | 1,12 | Sí |
| 2 | 5/5 | 0 | 36,54 | 32,26 | 33,87 | 1,58 | Sí |
| 3 | 5/5 | 0 | 35,88 | 32,38 | 33,86 | 1,21 | Sí |
| 4 | 5/5 | 0 | 32,86 | 29,94 | 30,69 | 1,11 | Sí |
| 5 | 5/5 | 0 | 38,22 | 34,68 | 35,36 | 1,11 | Sí |
| 6 | 5/5 | 0 | 33,92 | 30,46 | 31,95 | 1,37 | Sí |

Peor caso observado: 41,78 ms por carga completa (catálogo + inventario) y
1,58 ms para `/health`.

## 5. Contraste con el umbral

| Condición | Umbral | Observado | Veredicto |
|---|---|---|---|
| C1 | 5/5 | 5/5 en las 6 corridas (30/30 cargas) | Cumple |
| C2 | IDs coherentes | Coherentes en las 30 cargas (55 productos = 55 existencias) | Cumple |
| C3 | 0 errores | 0 errores | Cumple |
| C4 | `/health` 200 | 200 en las 6 corridas | Cumple |

**Conclusión:** el escenario 4 **cumple** su umbral en el entorno local
descrito, con margen amplio en latencia (≈ 42 ms en el peor caso).

## 6. Alcance y límites de la conclusión

- **Verificado:** cumplimiento de C1–C4 con la API actual sobre PostgreSQL 17 y
  RLS, en una sola máquina.
- **No verificado:** carga superior a 5 usuarios, el frontend, la red entre
  cliente y servidor, el despliegue en Dokploy y el comportamiento ante la
  caída de la base de datos. El escenario mide tolerancia a concurrencia, no
  tolerancia a fallos.
- Cliente y servidor comparten máquina, por lo que las latencias son un piso
  optimista y no deben leerse como las que verá un usuario real.
- `servidor_sigue_saludable` en la salida del medidor es una constante `true`;
  el criterio C4 solo se cumple porque la consulta final de `/health` lanza
  excepción si falla. Ver [arc42 sección 11](arc42/11-riesgos-y-deuda-tecnica.md).
- El escenario 3 (reflejo de inventario en menos de 2 s) **no** se midió aquí.

## 7. Limitaciones y pares

Las limitaciones de esta medición y su estado (asumido o pendiente) están en
[arc42 sección 11](arc42/11-riesgos-y-deuda-tecnica.md#114-limits-of-the-scenario-4-measurement-teams-own-assessment).
Los comentarios de otros equipos sobre el proyecto están pendientes de recibir
y se añadirán allí con su estado.

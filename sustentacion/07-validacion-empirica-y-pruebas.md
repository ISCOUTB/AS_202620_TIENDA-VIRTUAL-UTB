# Elemento 7: Validación Empírica y Pruebas Automatizadas de la Arquitectura

> **Alineación con la Rúbrica Oficial:** Sustenta el **Criterio 3 (Calidad, resiliencia y seguridad verificadas — 1,00 pts)** al aportar evidencia numérica y automatizada en lugar de supuestos teóricos.

---

## 1. Medición Empírica del Escenario 4 (AC-04: Disponibilidad y Concurrencia)

El Atributo de Calidad de Disponibilidad se midió formalmente contra el código del sistema desplegado utilizando el script de carga automatizado:

📄 **Medidor:** `backend/scripts/measure_catalog_availability.py`  
📄 **Reporte Completo:** `docs/medicion-escenario-4.md`

### 1. Umbral Definido por el Escenario
> Con 5 usuarios simulados simultáneos, las 5 cargas de `GET /catalog/products` + `GET /inventory` reciben datos coherentes, no hay errores HTTP y `/health` continúa respondiendo 200.

### 2. Entorno de Medición
- **API:** Imagen Docker de producción (`backend/Dockerfile`, Python 3.12, Uvicorn).
- **Base de Datos:** PostgreSQL 17 con rol sin privilegios `tienda_app` sujeto a RLS (ADR 0014) y migraciones Alembic aplicadas.
- **Datos Activos:** 5 tiendas físicas, 55 productos sembrados, 55 existencias iniciales.
- **Carga:** 6 corridas de prueba (1 corrida inicial + 5 repeticiones), acumulando 30 cargas completas de catálogo + inventario.

### 3. Resultados Obtenidos

| Corrida | Cargas Correctas | Errores | Duración Total (ms) | Carga Promedio (ms) | Peor Caso (ms) | `/health` Post-Carga | Veredicto |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | 5 / 5 | 0 | 43,75 | 37,02 | 41,78 | 1,12 ms | **CUMPLE** |
| 2 | 5 / 5 | 0 | 36,54 | 32,26 | 33,87 | 1,58 ms | **CUMPLE** |
| 3 | 5 / 5 | 0 | 35,88 | 32,38 | 33,86 | 1,21 ms | **CUMPLE** |
| 4 | 5 / 5 | 0 | 32,86 | 29,94 | 30,69 | 1,11 ms | **CUMPLE** |
| 5 | 5 / 5 | 0 | 38,22 | 34,68 | 35,36 | 1,11 ms | **CUMPLE** |
| 6 | 5 / 5 | 0 | 33,92 | 30,46 | 31,95 | 1,37 ms | **CUMPLE** |

- **Total acumulado:** 30 de 30 cargas exitosas (**100% de éxito**).
- **Cero errores:** 0 excepciones, 0 timeouts y 0 respuestas HTTP 5xx.
- **Tiempo de respuesta máximo:** **41,78 ms** (amplio margen respecto al umbral del escenario).
- **Coherencia de datos:** Los conjuntos de IDs devueltos por catálogo e inventario coincidieron en el 100% de las consultas.

---

## 2. Pirámide de Pruebas Automatizadas

La arquitectura se sustenta sobre múltiples capas de pruebas en el repositorio:

```
                  ┌────────────────────────┐
                  │ 119 Pruebas E2E        │  TestSprite (Flujos de usuario, roles,
                  │ Automatizadas          │  reservas, límites y carritos)
                  ├────────────────────────┤
                  │ Pruebas de Arquitectura│  test_architecture.py (AST de imports)
                  │ y Seguridad            │  test_rls.py (Políticas de DB)
                  │                        │  test_admin_por_tienda.py
                  ├────────────────────────┤
                  │ Pruebas de Integración │  test_orders.py, test_catalog.py,
                  │ y Contratos OpenAPI    │  test_concurrencia.py, test_openapi.py
                  ├────────────────────────┤
                  │ Pruebas Unitarias      │  Vitest en frontend/ (108 pruebas)
                  │                        │  Pytest en backend/ (22 pruebas base)
                  └────────────────────────┘
```

### 1. Pruebas de Arquitectura y Seguridad
- `backend/tests/test_architecture.py`: Comprueba que ningún módulo viole los Bounded Contexts usando el AST de Python.
- `backend/tests/test_rls.py`: Prueba que PostgreSQL RLS bloquee accesos cruzados bajo el rol `tienda_app`.
- `backend/tests/test_admin_por_tienda.py`: Verifica que cada administrador de cafetería esté limitado a su tienda física.

### 2. Pruebas de Contrato (API Contract Testing)
- `backend/tests/contract/test_openapi.py`: Valida que la especificación OpenAPI 3.1 en `docs/api/openapi.json` coincida exactamente con las rutas, esquemas Pydantic y respuestas de los routers de FastAPI.

### 3. Suite E2E TestSprite (119 Ejecuciones)
Ubicada en `testsprite_tests/`:
- `TC001`: Inicio de sesión y reserva de carrito para una tienda.
- `TC015`: Admin de tienda solo gestiona el stock de su propio local.
- `TC029`: Verificación de que el stock no puede ser negativo bajo ninguna circunstancia.
- `TC038`: Bloqueo de compradores al panel de administración.
- `TC045`: Admin de Almuerzo 01 avanza un pedido hasta estado `Entregado`.

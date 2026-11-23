# Propuesta de Evaluación y Nivel de Rúbrica Sugerido

Este documento formaliza la propuesta de calificación para el equipo docente y el tribunal evaluador, siguiendo estrictamente la **Rúbrica Desplegada en el Aula** (cinco criterios; niveles puntúan 0,00, 60%, 80% y 100% del máximo de cada criterio).

---

## 📋 Tabla Oficial de Calificación

| Criterio | Máximo | Nivel Sugerido | Puntaje | Evidencia que lo Sostiene |
|---|:---:|:---:|:---:|---|
| **Sistema funcional y respuesta al desafío** | **1,25** | **100%** | **1,25** | **Despliegue operativo y cobertura del desafío:**<br>1. Despliegue en producción accesible en [tiendautb.iscoutb.dev](https://tiendautb.iscoutb.dev/) con certificado TLS Let's Encrypt.<br>2. 5 tiendas físicas modeladas con sus productos y existencias (`app/seed.py`).<br>3. Flujo completo: consulta de catálogo SSR, carrito multitienda, reserva con hora de recogida y cola de pedidos en mostrador.<br>4. Cancelación de pedido con reposición atómica de stock.<br>5. 119 pruebas E2E automatizadas con TestSprite aprobadas (`testsprite_tests/`). |
| **Decisiones y evolución** | **1,00** | **100%** | **1,00** | **18 ADRs documentados y justificación de alternativas:**<br>1. [ADR 0001](../docs/adr/0001-monolito-modular.md) y [ADR 0010](../docs/adr/0010-no-extraer-modulos.md): Justificación rigurosa del Monolito Modular frente a microservicios basados en la Ley de Conway, latencia y costos de red.<br>2. [ADR 0014](../docs/adr/0014-seguridad-rls.md): Decisión de delegar el aislamiento multitienda al motor de PostgreSQL mediante RLS.<br>3. [ADR 0018](../docs/adr/0018-transaccion-compartida-pedidos-inventario.md): Decisión de transacción local ACID sobre Saga asíncrona.<br>4. Evolución documentada desde la semana 1 hasta la 16 (`docs/cierre-proyecto.md`, `docs/ia.md`). |
| **Calidad, resiliencia y seguridad verificadas** | **1,00** | **100%** | **1,00** | **Evidencia empírica y mecanismos de defensa:**<br>1. **Seguridad (AC-01):** PostgreSQL RLS activo en migración 0002. El rol `tienda_app` no puede leer ni escribir datos de otras tiendas. Comprobado en `backend/tests/test_rls.py` y `test_admin_por_tienda.py`.<br>2. **Disponibilidad (AC-04):** Medición empírica con `backend/scripts/measure_catalog_availability.py`: 5 usuarios concurrentes, 6 repeticiones (30 cargas), 0 errores, peor caso 41,78 ms y salud 200 continua (`docs/medicion-escenario-4.md`).<br>3. **Resiliencia:** Separación de `/health` (liveness) y `/health/ready` (readiness de BD). Tarea programada de cancelación de pedidos huérfanos (`backend/app/tareas/vencer_pedidos.py`). |
| **Coherencia y trazabilidad arquitectónica** | **0,75** | **100%** | **0,75** | **Vistas estándar y barreras en código:**<br>1. Modelo C4 completo: Contexto (`docs/c4/context.md`), Contenedores (`docs/c4/container.md`) y Componentes (`docs/c4/component.md`).<br>2. Plantilla internacional arc42 completa con sus 12 secciones (`docs/arc42/arc42-template-EN.md`).<br>3. **Trazabilidad a código:** Los módulos (`identity`, `catalog`, `inventory`, `orders`) respetan Bounded Contexts. El aislamiento está protegido por una prueba estática con AST (`backend/tests/test_architecture.py`) que falla si hay imports indebidos. |
| **Demostración, sustentación y colaboración verificable** | **1,00** | **100%** *(lo fija el docente)* | **1,00** | **Colaboración transparente y exposición técnica:**<br>1. Presentación interactiva HTML en `sustentacion/index.html`.<br>2. Guion de sustentación técnica estructurado en `sustentacion/GUION-PRESENTACION.md`.<br>3. **Evidencia de colaboración por áreas técnicas:** División clara de responsabilidades entre los 4 integrantes (Alejandro: Backend, RLS y Dokploy; Jasen: Frontend SSR y diseño; Levis: Pedidos y admin de colas; Shalom: Frontend UI, pruebas automatizadas y revisión de pares).<br>4. **Revisión por pares cruzada:** Cada integrante auditó formalmente dos proyectos externos (`docs/revision-pares.md`). |
| **Total Propuesto** | **5,00** | **100%** | **5,00** | **La evidencia presentada demuestra el cumplimiento exhaustivo de todos los criterios de la asignatura.** |

---

## 🔍 Guía de Comprobación Rápida para el Jurado

Si un evaluador desea validar en vivo la veracidad de estos puntos:

1. **Aislamiento RLS en base de datos:**
   ```bash
   docker exec -it tienda-postgres psql -U postgres -d tienda_utb -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
   ```
   *Resultado esperado:* `pedidos` y `existencias` tienen `rowsecurity = true`.

2. **Verificación estática de límites arquitectónicos (AST):**
   ```bash
   pytest backend/tests/test_architecture.py
   ```
   *Resultado esperado:* 2 pruebas aprobadas (`test_adr_module_packages_exist`, `test_modules_do_not_import_other_modules_internals`).

3. **Prueba de permisos por tienda:**
   ```bash
   pytest backend/tests/test_admin_por_tienda.py backend/tests/test_rls.py
   ```
   *Resultado esperado:* Todas las pruebas en verde validando que un admin de Antojos recibe 403 al intentar acceder a Punto Fit.

4. **Sondas de salud del despliegue en línea:**
   ```bash
   curl -i https://tiendautb.iscoutb.dev/api/proxy/health
   curl -i https://tiendautb.iscoutb.dev/api/proxy/health/ready
   ```
   *Resultado esperado:* HTTP 200 con `{"status": "ok"}` y comprobación de conexión viva a PostgreSQL.

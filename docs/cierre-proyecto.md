# Informe final de cierre de Tienda Virtual UTB

**Equipo:** Levis Adrian Ortiz Cano, Alejandro Patron Montero, Shalom Jhoanna Arrieta Marrugo y Jasen Mihovil Yukopila Escobar.  
**Fecha de revisión:** 22 de noviembre de 2026, Colombia.  
**Sistema entregado:** [Tienda Virtual UTB](https://tiendautb.iscoutb.dev/).  
**Código revisado:** rama `main`, commit `6040639864ac8f18a465ab8a3602b487d1508b0a`, del 20 de noviembre de 2026, 08:42:17 −05:00. Esta actualización documental es posterior a ese commit; el hash definitivo de entrega será el del commit que la incorpore.

La Tienda Virtual UTB permite consultar el catálogo de cinco puntos de la cafetería, reservar productos con hora de recogida y atender los pedidos con pago en el mostrador. El backend implementa identidad, catálogo, inventario y pedidos; el frontend conecta esas capacidades con las vistas de comprador, administrador de tienda y supervisor general.

El despliegue ya existe y su dirección es la publicada en el README, confirmada por el equipo el 22 de noviembre. El cierre distingue las capacidades implementadas de las pruebas históricas y de la evidencia que todavía debe adjuntarse para la evaluación. La existencia del despliegue no queda como tarea pendiente; sí queda el registro de su verificación durante la revisión final.

## Alcance entregado

| Capacidad | Implementación y evidencia |
|---|---|
| Consulta y búsqueda de productos | [Catálogo API](../backend/app/modules/catalog/router.py), [lectura del catálogo e inventario](../frontend/lib/catalogo-servidor.ts), [tiendas](../frontend/app/(public)/tiendas/page.tsx). Incluye precio, presentación, disponibilidad y respaldo señalado cuando la API no responde. |
| Identidad y sesión | [Login, registro API y perfil](../backend/app/modules/identity/router.py), JWT HS256, contraseñas Argon2id y [sesión web](../frontend/lib/sesion.ts). La interfaz ofrece acceso con cuentas creadas; el registro público permanece en la API y debe reconciliarse con esa política. |
| Carrito y reserva | [Carrito](../frontend/lib/carrito.ts), [panel de reserva](../frontend/components/tienda/PanelPedido.tsx) y [servicio de pedidos](../backend/app/modules/orders/service.py). El checkout divide el carrito por tienda, copia precios y descuenta existencias en una transacción. |
| Seguimiento y atención | Pedidos propios, cola por tienda y estados `pendiente_pago → pagado → en_preparacion → listo → entregado`; cancelación con devolución de stock. [Router](../backend/app/modules/orders/router.py) y [pruebas](../backend/tests/test_orders.py). |
| Administración de catálogo e inventario | Alta y edición de productos, activación, ajustes de stock y control de versión. [Panel](../frontend/components/admin/PanelAdmin.tsx), [Catálogo](../backend/app/modules/catalog/router.py) e [Inventario](../backend/app/modules/inventory/router.py). |
| Separación de permisos | Administración restringida a la tienda asignada; administrador general en supervisión. Controles de API y PostgreSQL RLS, con [pruebas por tienda](../backend/tests/test_admin_por_tienda.py). |
| Vencimiento de reservas | [Comando transaccional](../backend/app/tareas/vencer_pedidos.py) para cancelar pendientes de pago de más de 24 horas y reponer existencias. La ejecución programada en Dokploy requiere evidencia operativa. |
| Persistencia y operación | PostgreSQL 17, Alembic, rol de aplicación, health checks, métricas y logs. [Compose de despliegue](../deploy/compose.lab.yaml) y [guía](despliegue-dokploy.md). |

Quedan fuera del alcance entregado la pasarela de pago, SSO institucional, aplicación móvil nativa, envíos nacionales, ventas de terceros y recomendaciones con IA. Tampoco se implementaron Redis, mensajería, DLQ ni réplicas: las propuestas históricas no representan infraestructura desplegada. Los datos de demostración no constituyen integración con un sistema real de la cafetería; precios, horarios y carta de Almuerzo 02 conservan los límites indicados en [pendientes](pendientes.md).

## Matriz de cumplimiento

**Cumple** indica evidencia suficiente para el aspecto descrito; **Parcial** indica trabajo existente con una condición de cierre; **No verificado** exige evidencia externa o una definición del curso. Estos estados no sustituyen la calificación del docente. En una matriz binaria, los parciales no deben convertirse en “Cumple” hasta cerrar su condición.

| N.º | Criterio de evaluación | Estado | Evidencia y condición de cierre |
|---|---|---|---|
| 1 | Estado final identificable y anterior al cierre | Parcial | Rama, hash y fecha identificados arriba. Registrar el hash que incorpore el cierre y contrastarlo con la fecha límite oficial. |
| 2 | Sistema desplegado y estable durante la revisión | Parcial | [Acceso al sistema](https://tiendautb.iscoutb.dev/) y [runbook](despliegue-dokploy.md). Despliegue confirmado por el equipo; adjuntar hora, estados HTTP y commit desplegado durante la evaluación. |
| 3 | Flujos principales con datos realistas | Parcial | Flujos implementados y [E2E históricas](pruebas-e2e-testsprite.md). Repetir sobre la interfaz y credenciales vigentes tras los cambios de noviembre. |
| 4 | Errores, validaciones y tiempos de espera | Parcial | Pruebas de stock insuficiente, permisos, idempotencia y transiciones; catálogo SSR con timeout de 3 s. El proxy y cliente general carecen de timeout propio. [Pruebas de pedidos](../backend/tests/test_orders.py), [cliente](../frontend/lib/api/client.ts), [proxy](../frontend/lib/api/proxy.ts). |
| 5 | Respuesta al desafío final implementada y evidenciada | No verificado | Vincular el enunciado oficial con rutas de código, pruebas y ejecución. No equiparar automáticamente el desafío con una entrega anterior. |
| 6 | Alcance entregado frente al comprometido | Parcial | Alcance y exclusiones declarados en este informe y [problema](problema.md). Falta identificar los hashes revisados en S10 y S16 y adjuntar su comparación. |
| 7 | ADR que reconstruyan la evolución | Cumple | [18 ADR](adr/) numerados. Diferenciar implementación de ratificación colectiva, todavía pendiente en varias decisiones. |
| 8 | Decisión confirmada o reemplazada con enlace | Cumple | ADR 0003–0006 sustituidos por [ADR 0007](adr/0007-despliegue-dokploy.md); Compose y guía corresponden a Dokploy. |
| 9 | Atributos prioritarios medidos contra umbral | Parcial | [AC-04 medido](medicion-escenario-4.md); faltan resultados actuales de AC-01, conteo de pasos AC-02 y medición de menos de 2 s AC-03. |
| 10 | Modos de fallo probados y mitigaciones de seguridad | Parcial | [Estado F-01 a F-07](modos-fallo-s11.md), [pruebas de RLS](../backend/tests/test_rls.py) y [amenazas](seguridad-amenazas-privacidad.md). Adjuntar ejecución CI; cerrar o declarar las mitigaciones no implementadas. |
| 11 | arc42 secciones 1 a 12 con glosario y contenido propio | Cumple documentalmente | [arc42](arc42/arc42-template-EN.md) actualizado al código revisado; sección 11 enlazada, glosario y límites explícitos. Las mediciones pendientes se conservan como tales. |
| 12 | C4 niveles 1 a 3 del sistema entregado | Cumple documentalmente | [Contexto](c4/context.md), [contenedores](c4/container.md) y [componentes](c4/component.md), con correspondencia a módulos y archivos. |
| 13 | Tabla de aspectos recorrible | Cumple documentalmente | [4 de 4 filas](aspectos.md) con escenario, decisión, código, pruebas y estado de evidencia. Trazabilidad completa no equivale a cuatro umbrales medidos. |
| 14 | Validación automática de diagramas, enlaces o reglas | Parcial | [Workflow](../.github/workflows/tests.yml) ejecuta [reglas de dependencias](../backend/tests/test_architecture.py). Adjuntar run satisfactorio del commit final; no hay validador de diagramas o enlaces en CI. |
| 15 | Contribución sustantiva de todos durante el semestre | Parcial | Historial por autor y mes resumido abajo; asociar aportes concretos y revisar su contenido, no solo contar commits. |
| 16 | Revisión cruzada con comentarios de fondo en PR | No verificado | Adjuntar comentarios técnicos humanos con enlace y respuesta. [Revisiones a otros equipos](revision-pares.md) y comentarios de bots no sustituyen esta evidencia. |
| 17 | Demostración y sustentación | No verificado | Evaluación presencial o remota ante docente y jurado. Guion propuesto en este informe. |

## Evidencia de pruebas y mediciones

| Evidencia | Resultado registrado | Alcance |
|---|---|---|
| TestSprite, 24 de octubre de 2026 | Frontend 77/77: 76 automatizadas y TC075 manual; API 36/36 | Resultado consolidado tras correcciones y reejecuciones, no una nueva corrida del código de noviembre. [Informe](pruebas-e2e-testsprite.md). |
| Escenario 4, 8 de noviembre de 2026 | 6 corridas, 30/30 cargas correctas, 0 errores, `/health` 200; peor carga 41,78 ms | API 0.5.0 y PostgreSQL 17 locales. El umbral exige cinco usuarios y respuestas correctas; no establece límite de latencia ni prueba disponibilidad continua. [Medición](medicion-escenario-4.md). |
| Backend y frontend en CI | Workflow con PostgreSQL, contrato, funcionalidad, RLS, arquitectura, lint, tipos, cobertura y build | Conservar enlace al run final y sus artefactos. La configuración por sí sola no acredita una ejecución satisfactoria. |
| Sonar en PR #19, 20 de noviembre de 2026 | Comentario automático con Quality Gate aprobado | [Comentario](https://github.com/ISCOUTB/AS_202620_TIENDA-VIRTUAL-UTB/pull/19#issuecomment-7040896955). No acredita cobertura completa ni ejecución de toda la suite. |

El [PR #19](https://github.com/ISCOUTB/AS_202620_TIENDA-VIRTUAL-UTB/pull/19) reportó 48 fallos preexistentes de Vitest en `api-client.test.ts`; deben reproducirse y resolverse o explicarse con una corrida vigente. La revisión local del 22 de noviembre no pudo ejecutar Vitest por dependencias no disponibles, ni PostgreSQL mediante Docker por falta de un daemon operativo. No se declara una nueva suite aprobada.

## Identificación y comparación de entregas

El hash revisado identifica el código de referencia, no certifica qué imagen está ejecutando Dokploy. Para la entrega se debe conservar el hash del repositorio y el del despliegue, junto a la hora de comprobación y la fecha límite del curso.

Los hashes oficiales de S10 y S16 no están identificados en la evidencia revisada. Cuando se determinen, ejecutar `git diff --stat HASH_S10 HASH_S16` y `git diff --name-status HASH_S10 HASH_S16`, y relacionar los cambios con el alcance comprometido. No seleccionar commits solo por cercanía de fecha.

Actividad en el historial alcanzable desde el commit revisado, agrupando alias del mismo integrante:

| Integrante | Agosto | Septiembre | Octubre | Noviembre | Total |
|---|---:|---:|---:|---:|---:|
| Alejandro Patron | 4 | 6 | 28 | 3 | 41 |
| Jasen Yukopila | 7 | 8 | 3 | 14 | 32 |
| Levis Ortiz | 7 | 4 | 2 | 0 | 13 |
| Shalom Arrieta | 1 | 1 | 9 | 0 | 11 |

El conteo incluye merges y no mide esfuerzo, autoría de cada línea ni revisión. Se reproduce con `git shortlog -sne 6040639` y `git log 6040639 --format="%ad %an <%ae>" --date=format:%Y-%m`. Cada integrante debe poder explicar sus cambios y citar los commits o PR que los contienen.

## Verificación del despliegue y guion de sustentación

Usar el dominio del [README](../README.md), `https://tiendautb.iscoutb.dev/`, y registrar fecha y hora de Colombia, ruta, código HTTP y resultado. Las consultas siguientes no modifican datos:

| Ruta pública | Resultado esperado |
|---|---|
| `/` | 200, portada visible |
| `/api/health` | 200, proceso de Next.js disponible |
| `/api/proxy/health` | 200, proceso de la API disponible |
| `/api/proxy/health/ready` | 200 si la API alcanza la base de datos |
| `/api/proxy/catalog/products` | 200, catálogo JSON |
| `/api/proxy/inventory` | 200, existencias JSON |

Un `200` de `/api/health` no demuestra conexión a PostgreSQL. El intento desde el entorno de revisión del 22 de noviembre a las 09:32 −05:00 no obtuvo conexión; no se presenta como prueba de caída del sitio confirmado por el equipo.

Para la demostración funcional, usar cuentas y productos de prueba identificados:

1. Entrar como comprador, buscar un producto, añadirlo al carrito y seleccionar hora de recogida.
2. Reservar y comprobar el pedido por tienda, el total y el descuento de stock.
3. Consultar el pedido desde la cuenta y cancelarlo antes del pago; comprobar la reposición.
4. Crear otra reserva y atenderla como administrador de esa tienda hasta `entregado`.
5. Mostrar que el administrador de otra tienda no accede al pedido y que el general solo supervisa.
6. Mostrar una validación de entrada y un rechazo por permisos, con su respuesta HTTP.
7. Explicar la transacción Pedidos–Inventario, la idempotencia, RLS, los ADR y los límites de las mediciones.

Conservar identificadores de los pedidos, resultado esperado y observado, capturas o logs sin contraseñas ni tokens. Confirmar por separado el Schedule de vencimiento y una restauración de respaldo en un entorno aislado.

## Condiciones pendientes para cerrar la evaluación

| Prioridad | Acción | Evidencia de cierre |
|---|---|---|
| Alta | Reejecutar la suite y actualizar E2E al acceso y navegación actuales | Run del commit final, resultados y artefactos |
| Alta | Registrar estabilidad y flujo funcional del despliegue existente | Hash desplegado, hora, HTTP y pedidos de prueba |
| Alta | Identificar desafío final, hashes S10/S16 y fecha límite | Enunciado y comparación vinculados al código |
| Alta | Resolver la diferencia entre cuentas precreadas y registro público API | Decisión de alcance y pruebas del comportamiento elegido |
| Alta | Atender seguridad y privacidad señaladas en la sección 11 | Código y pruebas de las mitigaciones comprometidas; riesgos restantes explícitos |
| Media | Completar AC-01, AC-02 y AC-03 contra sus umbrales | Resultado reproducible, entorno y commit |
| Media | Confirmar vencimiento programado y restauración de respaldo | Logs del Schedule y acta de restauración |
| Media | Ratificar ADR y citar revisiones técnicas humanas | Estado acordado y enlaces a comentarios de PR |

La lista operativa se mantiene en [pendientes.md](pendientes.md). La actualización documental cierra las contradicciones sobre funcionalidades existentes; no sustituye las verificaciones de ejecución ni la sustentación.

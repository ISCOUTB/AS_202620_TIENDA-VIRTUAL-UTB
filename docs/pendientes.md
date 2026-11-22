# Pendientes de cierre y evolución

**Última revisión: 2026-11-22.** La aplicación ya está desplegada en [tiendautb.iscoutb.dev](https://tiendautb.iscoutb.dev/), dirección publicada en el README y confirmada por el equipo. La [matriz de cierre](cierre-proyecto.md) distingue documentación, implementación y evidencia de ejecución.

## Funcionalidades implementadas

| Capacidad cerrada en código | Evidencia |
|---|---|
| Identidad, JWT y roles por tienda | [Identidad](../backend/app/modules/identity/router.py), [ADR 0016](adr/0016-autenticacion-jwt.md). |
| Administración de productos y estado activo | [Catálogo](../backend/app/modules/catalog/router.py), [guía](api/administracion-catalogo.md). |
| Lectura, escritura y ajustes de inventario | [Inventario](../backend/app/modules/inventory/router.py), [pruebas](../backend/tests/test_inventory_escrituras.py). |
| Pedidos por tienda, idempotencia, cancelación y ciclo de vida | [Pedidos](../backend/app/modules/orders/service.py), [pruebas](../backend/tests/test_orders.py). |
| Carrito, reserva, pedidos propios y administración conectados | [Reserva](../frontend/components/tienda/PanelPedido.tsx), [administración](../frontend/components/admin/PanelAdmin.tsx). |
| Alembic, RLS y reglas entre módulos | [Migraciones](../backend/alembic/versions/), [arquitectura](../backend/tests/test_architecture.py). |
| Medición de cinco compradores concurrentes | [Escenario 4](medicion-escenario-4.md), registrado el 2026-11-08. |
| Dominio y despliegue Dokploy | [Compose](../deploy/compose.lab.yaml), [guía](despliegue-dokploy.md). |

Estas capacidades no quedan pendientes de implementación. Sus verificaciones finales se enumeran a continuación.

## Evidencia para la evaluación

- Registrar el hash final, el desplegado y la fecha límite oficial.
- Identificar los hashes revisados en S10 y S16 y comparar el alcance.
- Vincular el enunciado del desafío final con código, pruebas y ejecución.
- Conservar un run de CI del commit final. El [PR #19](https://github.com/ISCOUTB/AS_202620_TIENDA-VIRTUAL-UTB/pull/19) reportó 48 fallos de Vitest en `api-client.test.ts`; reproducirlos y resolverlos o explicar el resultado vigente.
- Repetir E2E tras el rediseño y los cambios de acceso de noviembre. Los resultados de octubre son históricos.
- Completar AC-01 con resultados por rol, AC-02 con conteo de pasos y AC-03 con tiempo de propagación de stock. AC-04 ya tiene medición local.
- Adjuntar comentarios humanos de revisión técnica en PR y aportes sustantivos de cada integrante.
- Ratificar colectivamente los ADR que figuran como propuestas. Implementación y ratificación son estados distintos.

## Operación del despliegue existente

- Registrar fecha, hora y respuestas de salud, readiness, catálogo e inventario; realizar el recorrido de [cierre](cierre-proyecto.md).
- Confirmar `SEED_ON_DEPLOY=false` tras la siembra; el seed puede actualizar productos demo.
- Verificar el Schedule de `python -m app.tareas.vencer_pedidos` y conservar su ejecución. El comando ya está implementado y tiene pruebas.
- Confirmar respaldo externo y documentar una restauración de prueba en un entorno aislado. Un volumen persistente no sustituye al respaldo.
- Confirmar la baja de recursos antiguos de Render, Vercel y Neon y la revocación de credenciales antiguas. Borrar archivos no elimina recursos remotos.
- Registrar costos reales de servidor y respaldo en [costos](costos-despliegue.md).

## Seguridad y calidad pendientes

- **Registro:** la interfaz redirige `/registro` y `/auth/crear-cuenta` al acceso, pero `POST /identity/register` sigue público. Aplicar una política coherente en ambas capas.
- **Límite de intentos:** implementar las mitigaciones A-01 y A-03 de [amenazas](seguridad-amenazas-privacidad.md).
- **Sesión y cabeceras:** JWT en `localStorage`; faltan cabeceras de seguridad y la migración a cookie `httpOnly` con protección CSRF del [ADR 0011](adr/0011-sesion-localstorage.md).
- **Timeout:** catálogo SSR con límite de 3 s; proxy y cliente general sin timeout propio. Añadirlo y comprobar su respuesta al usuario.
- **Privacidad:** resolver las diferencias de consentimiento, rectificación, supresión y retención señaladas en [arc42 sección 11](arc42/11-riesgos-y-deuda-tecnica.md), con código y pruebas.
- **Dependencias:** llevar la auditoría reproducible a CI y revisar hallazgos vigentes. Los números del 2026-11-01 no son una auditoría actual.
- **Sonar y cobertura:** existe [Quality Gate aprobado en PR #19](https://github.com/ISCOUTB/AS_202620_TIENDA-VIRTUAL-UTB/pull/19#issuecomment-7040896955). La afirmación antigua de que no se analiza ningún PR ya no describe esa evidencia. Verificar análisis y cobertura del commit final; el job omite pasos cuando no existe `SONAR_TOKEN`.
- **Reproducibilidad Python:** evaluar requisitos con hashes para `pip --require-hashes`, todavía no incorporados.

## Datos de la cafetería

- Confirmar precios de Antojos, Punto Fit y Alegría; actualizar `precio_confirmado` y la política estática de indexación cuando corresponda.
- Asignar fotos reales a las portadas de tiendas: `FOTO_TIENDA` sigue vacío. Ya hay imágenes de referencia de productos y fotos de cafetería usadas en la portada.
- Confirmar horario provisional y dirección exacta del campus.
- Completar la carta de Almuerzo 02, actualmente sin productos.

## Evolución no incluida en la entrega

- Notas por ítem en contrato y formulario, junto con la revisión de sesión del ADR 0011.
- Pantalla y endpoint de asignación de roles; hoy se realiza mediante siembra u operación de base de datos.
- Comando para crear cuentas sin reescribir productos demo y cambio de contraseña desde la aplicación.
- Redis, retries con backoff, mensajería/DLQ y réplicas solo si se adoptan las propuestas correspondientes; no están implementados.

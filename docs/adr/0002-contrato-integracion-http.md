# ADR 0002: Integración HTTP síncrona con contrato OpenAPI versionado

- **Estado:** Propuesta implementada, pendiente de revisión del equipo.
- **Fecha:** 2026-09-15
- **Relacionada:** [ADR 0001: monolito modular](0001-monolito-modular.md).

## Contexto

Next.js consulta `GET /catalog/products` desde un componente de servidor
(`frontend/app/page.tsx`) y necesita la respuesta para renderizar el catálogo.
FastAPI expone esa consulta y `GET /health`. Identidad, pedidos e inventario
todavía son paquetes reservados; no existen integraciones por mensajería.
El tipo `Product` del frontend se mantiene manualmente, por lo que un cambio
en nombres o tipos de campos del backend podría romper la vista.

**Escenario de calidad asociado** *(vínculo añadido 2026-09-27 para cerrar la
no conformidad señalada en la revisión S7)*: el
[escenario 4 — disponibilidad](../escenarios-calidad.md) mide la consecuencia
de acoplamiento de esta decisión: al ser HTTP síncrono, la página del catálogo
solo renderiza si la API responde, y con ~5 consultas concurrentes todas deben
recibir respuesta correcta. El
[escenario 3 — rendimiento](../escenarios-calidad.md) acota el presupuesto de
latencia del salto síncrono: el cambio de existencias debe reflejarse al
recargar la vista en menos de 2 segundos, lo que descarta introducir un salto
de mensajería adicional en el camino de lectura.

## Alternativas consideradas

| Alternativa | Ventajas | Costos y adecuación al alcance actual |
|---|---|---|
| HTTP síncrono y OpenAPI | Respuesta directa para renderizar; aprovecha FastAPI y la infraestructura existente. | El renderizado depende de la disponibilidad del backend; requiere controlar los cambios del contrato. |
| Mensajería y AsyncAPI | Desacopla en el tiempo a productores y consumidores de eventos. | Requiere transporte de mensajes, reintentos, idempotencia y una estrategia de consistencia; no resuelve por sí sola la consulta inmediata del catálogo. |
| HTTP sin contrato guardado | Menor trabajo inicial. | La documentación dinámica cambia con el código y no ofrece una referencia revisable para detectar desviaciones. |

## Decisión

Se conserva la integración **HTTP síncrona con JSON** entre Next.js y FastAPI.
Se guarda el contrato OpenAPI 3.1.0 en
[`docs/api/openapi.json`](../api/openapi.json), inicialmente con `info.version`
`0.2.0`, alineada con la versión que ya declara la aplicación.

Se adopta una estrategia **code-first con contrato guardado y revisado**:
FastAPI genera la especificación a partir de rutas y modelos; el equipo
exporta explícitamente el archivo y revisa su diferencia antes de incorporarlo
a Git. CI nunca lo regenera: compara la implementación con el archivo guardado
y valida respuestas HTTP reales del proveedor contra ese archivo.

El contrato cubre exclusivamente las dos rutas implementadas. `precio_centavos`
es un entero que el frontend interpreta como centavos de COP. `existencias`
permanece en la respuesta actual del catálogo; esta decisión no resuelve la
[deuda de propiedad de inventario identificada en S6](../violaciones-s6.md).
La respuesta de salud se declara mediante un modelo que exige `status: "ok"`.
Ese endpoint indica disponibilidad del proceso, no verifica dependencias externas.

### Versionado y cambios

- Git conservará el historial del contrato junto con código, pruebas y ADR.
  Esta preparación local debe incorporarse mediante el commit del equipo.
- Durante `0.x`, una ruptura aumenta MINOR (`0.2.0` → `0.3.0`);
  cambios compatibles y correcciones aumentan PATCH (`0.2.0` → `0.2.1`).
- Desde `1.0.0`, rupturas aumentan MAJOR, ampliaciones compatibles MINOR y
  correcciones sin cambio de interfaz PATCH.
- Quitar `nombre`, cambiar `precio_centavos` a texto o eliminar una ruta son
  rupturas. Se deben coordinar con el frontend; subir la versión no las corrige.
- Antes de exportar se actualiza `version` en `backend/app/main.py`, cuando
  corresponda. La igualdad del contrato detecta cambios, pero la clasificación
  de compatibilidad y el incremento correcto requieren revisión humana.
- Las rutas actuales no incluyen versión en la URL. Si se necesitan consumidores
  con versiones incompatibles simultáneas, se decidirá cómo coexistirán antes
  de retirar la interfaz anterior.

### Verificación en el pipeline

En cada `push` y `pull_request`, GitHub Actions:

1. Valida que el documento sea una especificación OpenAPI válida.
2. Comprueba igualdad entre el contrato guardado y el generado por FastAPI.
3. Invoca las dos rutas con `TestClient`, incluyendo el arranque de la aplicación,
   y valida código HTTP, tipo de contenido y cuerpo JSON contra el contrato.
4. Demuestra que quitar `nombre` o convertir el precio a texto produce un error
   de validación. Estos casos negativos pasan cuando detectan la ruptura.
5. Publica un reporte JUnit como artefacto `pruebas-contrato`.

Un incumplimiento hace fallar el job. Impedir que se fusionen cambios con CI
fallido requiere una regla de protección de rama en GitHub, fuera de estos archivos.

## Consecuencias

- El equipo dispone de un contrato legible por herramientas y revisable en Git.
- La documentación y el proveedor deben mantenerse sincronizados explícitamente;
  incluso cambios descriptivos requieren revisar y exportar el archivo.
- La dependencia síncrona de FastAPI continúa; el frontend ya muestra un mensaje
  cuando falla la consulta. No se agregan garantías de disponibilidad o rendimiento.
- Las pruebas usan SQLite en memoria y el cliente HTTP de prueba. No verifican
  red, PostgreSQL, despliegue ni ejecución del frontend, ni constituyen un contrato
  dirigido por consumidores. El tipo TypeScript todavía se mantiene manualmente.
- Nuevas operaciones, parámetros y errores de negocio necesitarán casos propios.
  La igualdad del documento no es una comprobación automática de compatibilidad
  con todas las versiones históricas.

## Referencias técnicas

- [OpenAPI Spec Validator](https://github.com/python-openapi/openapi-spec-validator): validación del documento OpenAPI.
- [JSON Schema: validación en Python](https://python-jsonschema.readthedocs.io/en/v4.15.0/validate/): validación de los cuerpos JSON con Draft 2020-12.

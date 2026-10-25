# S12 — Consistencia de datos

Fecha: 2026-10-25. Alcance: comportamiento implementado en la API 0.5.0.
Esta entrega incrementa S11: explicita las garantías y sus límites, diseña la
caché y registra la decisión de persistencia más costosa de revertir.

## Evidencias de la entrega

1. Tabla operación → garantía: este documento.
2. [Diseño de caché y política de invalidación](cache-s12.md): propuesta, aún sin implementación.
3. [ADR 0018: transacción compartida entre Pedidos e Inventario](adr/0018-transaccion-compartida-pedidos-inventario.md): decisión aplicada en el código.

Se entrega el enlace al repositorio o al commit que contiene estos archivos.
El PDF de una página es opcional; no sustituye la evidencia enlazada.

## Operaciones y garantías

Los nombres de rutas siguientes son los del backend; el navegador accede por
el proxy de Next.js. «Atómica» significa que los cambios de la operación se
confirman juntos o se revierten. No significa que todas las lecturas del
sistema sean serializables ni que las pantallas se actualicen solas.

| Operación | Garantía implementada | Mecanismo y evidencia | Límite |
|---|---|---|---|
| Crear pedidos (`POST /orders`) | Pedido, líneas, historial, reducción de existencias y movimiento de inventario se confirman juntos; un fallo de stock revierte el intento completo, incluidas otras tiendas del carrito. | Una sesión y un `commit` en [router](../backend/app/modules/orders/router.py); [servicio](../backend/app/modules/orders/service.py) llama al contrato público de Inventario. [Pruebas](../backend/tests/test_orders.py): creación, carrito de dos tiendas y stock insuficiente. | No hay transacción distribuida ni pago electrónico incluido. |
| Comprar la última unidad | No se confirman dos reservas de una única unidad disponible. | `UPDATE` atómico de existencias y restricción de cantidad no negativa en [migración 0004](../backend/alembic/versions/0004_admin_general_supervisa.py); prueba `test_ultima_unidad_la_gana_un_solo_comprador` en [test_orders](../backend/tests/test_orders.py). | La disponibilidad mostrada antes de comprar es orientativa; el intento perdedor recibe 400. |
| Reintentar creación con `Idempotency-Key` | La misma cuenta y clave recuperan los pedidos existentes sin volver a restar unidades del inventario. | Restricción única `(usuario_id, clave_idempotencia, tienda_id)`, recuperación tras conflicto y vigencia de 24 h en [servicio](../backend/app/modules/orders/service.py). [Pruebas de reintento, cuenta y vencimiento](../backend/tests/test_orders.py). | Devuelve el estado actual, no una respuesta HTTP original almacenada. No compara el cuerpo del reintento. Pasadas 24 h rechaza la clave; no la elimina automáticamente. La suite citada prueba reintentos secuenciales, no la carrera de dos claves iguales. |
| Cancelar pedido (`POST /orders/{id}/cancel`) | Estado, historial y reposición de unidades forman una transacción. Una cancelación ya cerrada se rechaza. | [Servicio](../backend/app/modules/orders/service.py), `version_id_col` en [modelo](../backend/app/modules/orders/models.py) y rollback ante conflicto (409). [Pruebas de cancelación](../backend/tests/test_orders.py). | El comprador cancela solo antes del pago; la tienda puede cancelar hasta antes de la entrega. No se modela un reembolso bancario. |
| Avanzar estado (`POST /orders/{id}/estado`) | Solo admite transiciones del ciclo definido y confirma estado e historial juntos. | Máquina de estados y control de versión en [servicio](../backend/app/modules/orders/service.py). [Prueba del ciclo de vida](../backend/tests/test_orders.py). | Una escritura concurrente puede devolver 409: se debe recargar y revisar antes de reintentar. |
| Vencer pedidos pendientes | Cancela pendientes de más de 24 h y repone stock; repetir la tarea no vuelve a cancelar pedidos cerrados. | [Tarea transaccional](../backend/app/tareas/vencer_pedidos.py), selección `FOR UPDATE SKIP LOCKED` en [repositorio](../backend/app/modules/orders/repository.py); [pruebas de vencimiento](../backend/tests/test_orders.py). | El código existe; la programación en Dokploy figura pendiente. Con ejecución cada 15 minutos, 24 h es el umbral, no una hora exacta de liberación. Fallos o bloqueos pueden retrasarla más. |
| Fijar o ajustar inventario (`PUT /inventory/{id}`, `POST /inventory/{id}/adjust`) | Cantidad y movimiento se confirman juntos; no admite cantidades negativas y detecta cambios concurrentes durante la transacción. | [Repositorio](../backend/app/modules/inventory/repository.py), versión ORM y `CHECK`; [pruebas de escrituras](../backend/tests/test_inventory_escrituras.py) y [bloqueo optimista](../backend/tests/test_esquema.py). | La versión protege la transacción del servidor; no detecta por sí sola que el usuario escribió una cantidad absoluta desde una pantalla antigua. |
| Crear o editar producto | Escritura transaccional con restricciones de precio y categoría; el pedido conserva su copia de nombre y precio. | [Router de catálogo](../backend/app/modules/catalog/router.py), [esquema](../backend/tests/test_esquema.py) y [prueba de creación del pedido](../backend/tests/test_orders.py). | El catálogo no usa control optimista de versión: no se promete detectar toda edición concurrente. |
| Consultar catálogo y existencias | Lecturas directas a la API, sin caché persistente de datos; al recargar se vuelve a consultar. | `no-store` y composición paralela en [catalogo-servidor.ts](../frontend/lib/catalogo-servidor.ts). | Dos peticiones separadas no son una instantánea conjunta. El stock puede cambiar después de leerlo. El objetivo de menos de 2 s del escenario 3 requiere medición; no es una garantía temporal demostrada aquí. |
| Consultar pedidos propios o cola de tienda | Filtra por usuario/tienda y aplica autorización de API y RLS. | [Router](../backend/app/modules/orders/router.py), [pruebas RLS](../backend/tests/test_rls.py) y [permisos](../backend/tests/test_admin_por_tienda.py). | RLS es aislamiento de acceso, no nivel de aislamiento transaccional; varias consultas no garantizan una instantánea única. |

## Alcance de la consistencia

El engine no configura un nivel de aislamiento explícito en
[database.py](../backend/app/shared/database.py). La protección de las
escrituras depende de transacciones, restricciones, actualizaciones atómicas
y versiones; no se atribuye aislamiento `SERIALIZABLE` al despliegue.
Tampoco se garantiza disponibilidad de escritura cuando PostgreSQL falla.

Las referencias entre módulos son lógicas, sin claves foráneas cruzadas
([ADR 0013](adr/0013-migraciones-alembic-y-esquema.md)). Por ello, una escritura
SQL fuera de los contratos puede crear referencias inválidas: compartir base
no asegura por sí solo todas las invariantes del dominio.

## Verificación y límites de la evidencia

Las pruebas enlazadas son evidencia ejecutable existente. Para reproducirlas,
usar exclusivamente una base PostgreSQL de pruebas y seguir el
[README](../README.md#pruebas-automatizadas): la suite vacía tablas y revierte
migraciones. No ejecutarla contra datos de la tienda.

El [informe E2E del 24 de octubre](pruebas-e2e-testsprite.md) registra 76 casos
automatizados de frontend más uno manual y 36 de API aprobados. Es evidencia
histórica: esta entrega documental no declara una nueva corrida ni prueba
la caché propuesta. Las comprobaciones de esa caché se definen en su diseño.

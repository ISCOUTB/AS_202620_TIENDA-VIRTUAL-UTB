# ADR 0018: Mantener Pedidos e Inventario en una transacción PostgreSQL

- Fecha: 2026-10-25.
- Estado: decisión implementada, documentada para S12; ratificación colectiva pendiente.
- Relación: [ADR 0001](0001-monolito-modular.md), [ADR 0010](0010-no-extraer-modulos.md), [ADR 0013](0013-migraciones-alembic-y-esquema.md) y [ADR 0014](0014-seguridad-rls.md).

## Contexto

Una reserva crea un pedido por tienda y consume unidades disponibles. El
comprador paga fuera de la aplicación; una cancelación o un vencimiento debe
devolver las unidades. Los escenarios exigen evitar sobreventa y reflejar
el stock al recargar, con una infraestructura académica de un solo stack.

La decisión de datos elegida como más costosa de revertir es conservar una
base PostgreSQL y una frontera transaccional compartida para Pedidos e
Inventario. No se trata solo del proveedor: los contratos, la compensación,
la seguridad y las pruebas dependen de que ambos cambios sean atómicos.

## Alternativas

| Alternativa | Ventaja | Costo o consecuencia |
|---|---|---|
| Una base y transacción local compartida (elegida) | Commit o rollback de pedido y stock juntos; operación y recuperación sencillas. | Acopla disponibilidad, escalado y evolución de la transacción de ambos módulos. |
| Bases independientes con saga y eventos durables | Permite despliegue y escalado autónomos. | Exige reservas explícitas, estados intermedios, outbox/inbox, consumidores idempotentes, reconciliación y compensaciones ante mensajes perdidos o repetidos. |
| Misma base, pero commits independientes para pedido y stock | Reduce el alcance de cada transacción. | Introduce ventanas de pedido sin reducción de existencias o reducción de existencias sin pedido, sin obtener independencia física; requiere recuperación adicional. |

## Decisión y correspondencia con el código

Mantener una sesión y una transacción para todos los pedidos del intento,
sus líneas, historial y movimientos de stock. Pedidos utiliza el contrato
público de Inventario, sin importar sus repositorios internos. PostgreSQL
es la fuente de verdad; una futura caché no autoriza compras.

- [Router de pedidos](../../backend/app/modules/orders/router.py): `_confirmar` realiza commit o rollback.
- [Servicio](../../backend/app/modules/orders/service.py): agrupa por tienda, copia nombre/precio y resta unidades del inventario; cancelar repone unidades.
- [Contrato público de Inventario](../../backend/app/modules/inventory/public.py): invoca las funciones SQL con la misma sesión.
- [Migración 0004](../../backend/alembic/versions/0004_admin_general_supervisa.py): movimiento atómico y guardas de acceso; [modelos](../../backend/app/modules/orders/models.py): versión y clave única de idempotencia.
- [Tarea de vencimiento](../../backend/app/tareas/vencer_pedidos.py): confirma cancelaciones y reposiciones en una transacción; su programación operativa sigue pendiente según el runbook.

La compensación de un pedido pendiente ocurre en una transacción posterior.
Esto no convierte la creación en una saga distribuida: no existen broker,
eventos durables ni commits independientes entre los dos módulos.

## Por qué revertirla resulta costoso

Separar las bases eliminaría el commit conjunto que hoy respalda las
garantías de la API. Habría que migrar stock y movimientos, conservar IDs y
trazabilidad de pedidos, sustituir funciones SQL y el contexto RLS que cruza
estos datos, y rediseñar los reintentos para tolerar confirmaciones parciales.
También cambiarían los estados visibles y las expectativas de las pruebas.

Cambiar el TTL o retirar Redis solo modifica una optimización de lectura;
cambiar esta frontera afecta la corrección de cada reserva y devolución.
Las copias de nombre/precio y las referencias lógicas entre módulos ayudan
a una migración, pero no resuelven la coordinación de escrituras.

## Consecuencias y límites

- No hay reserva confirmada sin su correspondiente reducción de existencias ni cancelación confirmada sin reposición dentro de estas operaciones.
- Una caída de PostgreSQL impide reservar; esta decisión no ofrece alta disponibilidad por sí sola.
- Las transacciones pueden sufrir contención o conflictos: no se garantiza éxito de todos los intentos concurrentes.
- No se declara aislamiento serializable ni una instantánea conjunta de las lecturas públicas.
- El checkout de varias tiendas es todo o nada: la falta de stock de una revierte las demás.

## Cuándo y cómo reconsiderar

Reabrir si mediciones muestran contención persistente que no se resuelve
con índices/transacciones breves, o si aparece una necesidad concreta de
desplegar o escalar Inventario independientemente. Antes de migrar:

1. Definir nuevas garantías y estados de reserva con el negocio.
2. Implementar eventos durables e idempotencia de consumidores, y probar fallos entre cada paso.
3. Copiar y reconciliar existencias, movimientos e identificadores con un corte controlado de escrituras.
4. Verificar que no haya reservas pendientes sin reconciliar antes de cambiar el escritor autorizado.
5. Mantener un plan de retorno con reconciliación; restaurar una copia antigua sin más perdería pedidos y movimientos de inventario posteriores.

## Evidencia

[test_orders.py](../../backend/tests/test_orders.py) cubre creación,
rollback por stock insuficiente, separación por tienda, reintento,
cancelación, vencimiento y carrera por la última unidad.
[test_esquema.py](../../backend/tests/test_esquema.py) cubre restricciones
y bloqueo optimista. Ver [matriz S12](../consistencia-s12.md) para límites
de cada garantía. Se referencian pruebas existentes, sin declarar una nueva
ejecución en esta entrega documental.

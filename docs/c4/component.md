# C4 nivel 3 de componentes de la API

**Fecha de revisión:** 2026-11-22. **Sistema:** Tienda Virtual UTB. **Contenedor ampliado:** API FastAPI del [nivel 2](container.md). **Notación:** Mermaid `C4Component`.

Los componentes son módulos del mismo proceso. Las flechas entre ellos representan llamadas Python a contratos públicos; no representan microservicios ni un bus de eventos. La API mantiene una sesión transaccional compartida para crear un pedido y reducir stock ([ADR 0018](../adr/0018-transaccion-compartida-pedidos-inventario.md)).

```mermaid
C4Component
    title Componentes de la API de Tienda Virtual UTB
    Container(web, "Cliente web", "Next.js", "Lectura SSR y proxy same-origin /api/proxy")
    Container_Boundary(api, "API FastAPI") {
        Component(main, "Composición y rutas", "app/main.py", "Registra routers, identidad y observabilidad")
        Component(identity, "Identidad", "modules/identity", "Login, registro API, perfil, JWT y roles")
        Component(catalog, "Catálogo", "modules/catalog", "Tiendas, productos, precios y activación")
        Component(inventory, "Inventario", "modules/inventory", "Existencias, ajustes, descuento y reposición")
        Component(orders, "Pedidos", "modules/orders", "Idempotencia, creación por tienda y ciclo de vida")
        Component(shared, "Servicios transversales", "app/shared", "Sesiones, contexto RLS, errores, logs y métricas")
    }
    Container(job, "Vencimiento", "Comando Python", "app.tareas.vencer_pedidos; programación externa")
    ContainerDb(db, "Base de datos", "PostgreSQL 17", "Tablas por módulo, Alembic y RLS")
    Rel(web, main, "Solicita operaciones", "HTTP/JSON; Bearer en rutas protegidas")
    Rel(main, identity, "Registra router y resolvedor de identidad", "Python")
    Rel(main, catalog, "Registra router", "Python")
    Rel(main, inventory, "Registra router", "Python")
    Rel(main, orders, "Registra router", "Python")
    Rel(orders, catalog, "Consulta productos", "catalog.public")
    Rel(orders, inventory, "Descuenta o repone stock", "inventory.public")
    Rel(inventory, catalog, "Consulta producto y tienda", "catalog.public")
    Rel(identity, catalog, "Resuelve tiendas para roles globales", "catalog.public")
    Rel(identity, shared, "Construye contexto y usa sesión", "Python")
    Rel(catalog, shared, "Usa sesión y controles de acceso", "Python")
    Rel(inventory, shared, "Usa sesión y controles de acceso", "Python")
    Rel(orders, shared, "Usa sesión y controles de acceso", "Python")
    Rel(shared, db, "Aplica contexto y ejecuta consultas de los módulos", "SQLAlchemy / SQL")
    Rel(job, orders, "Cancela reservas vencidas", "orders.public")
```

| Componente | Ubicación | Responsabilidad y prueba |
|---|---|---|
| Composición | [main.py](../../backend/app/main.py) | Monta la API y el resolvedor de identidad; [salud](../../backend/tests/test_health.py) y [observabilidad](../../backend/tests/test_observability.py). |
| Identidad | [router](../../backend/app/modules/identity/router.py), [public](../../backend/app/modules/identity/public.py) | Autentica y resuelve roles actuales; [pruebas](../../backend/tests/test_identity.py). |
| Catálogo | [router](../../backend/app/modules/catalog/router.py), [public](../../backend/app/modules/catalog/public.py) | Lee y administra metadatos de productos; [pruebas](../../backend/tests/test_catalog_admin.py). |
| Inventario | [router](../../backend/app/modules/inventory/router.py), [public](../../backend/app/modules/inventory/public.py) | Posee `existencias` y `movimientos_existencias`; [pruebas](../../backend/tests/test_inventory_escrituras.py). |
| Pedidos | [router](../../backend/app/modules/orders/router.py), [service](../../backend/app/modules/orders/service.py), [public](../../backend/app/modules/orders/public.py) | Coordina creación, estados, cancelación y vencimiento; [pruebas](../../backend/tests/test_orders.py). |
| Transversales | [database](../../backend/app/shared/database.py), [seguridad](../../backend/app/shared/seguridad.py) | Proporciona sesiones y contexto por transacción, sin poseer datos de negocio; [RLS](../../backend/tests/test_rls.py). |
| Tarea de vencimiento | [vencer_pedidos](../../backend/app/tareas/vencer_pedidos.py) | Ejecuta compensaciones como principal sistema. Existe el comando; verificar su Schedule en Dokploy. |

Cada módulo agrupa router, esquemas, repositorio y modelos; Pedidos añade un servicio para coordinar el caso de uso. La [prueba de arquitectura](../../backend/tests/test_architecture.py) impide imports estáticos de internos de otro módulo. No verifica imports dinámicos ni SQL arbitrario. La estructura interna de Catálogo también se detalla en [arc42](../arc42/arc42-template-EN.md).

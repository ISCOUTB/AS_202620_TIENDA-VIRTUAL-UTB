# Elemento 6: Decisiones de Arquitectura (ADRs) y Trade-offs Reales

> **Alineación con la Rúbrica Oficial:** Sustenta el **Criterio 2 (Decisiones y evolución — 1,00 pts)** al mostrar cómo cada cambio estructural se pensó, se discutió y se documentó con sus compromisos técnicos.

---

## 1. Por qué usamos ADRs en este proyecto

Cuando un equipo empieza a programar sin registrar sus decisiones, con el paso de las semanas nadie recuerda por qué una tabla se diseñó de cierta forma o por qué se descartó una librería. 

Para evitar esa desorganización, usamos el formato de registros de decisiones de arquitectura (ADR) propuesto por Michael Nygard. Cada documento responde a cuatro preguntas prácticas:
1. ¿Cuál era el problema o la necesidad puntual?
2. ¿Qué caminos alternativos consideramos?
3. ¿Cuál elegimos y por qué?
4. ¿Qué cosas tuvimos que sacrificar al tomar esa decisión?

---

## 2. Las 4 Decisiones Críticas explicadas sin rodeos

### ADR 0001 y 0010: Monolito modular en lugar de microservicios
- **El dilema:** Éramos cuatro personas programando para cinco puntos de venta en un solo campus. Partir la aplicación en cuatro microservicios independientes con Docker habría significado llamadas HTTP entre módulos que podían fallar por red a mitad de camino, latencia extra en el checkout y cuatro veces más trabajo de configuración.
- **La decisión:** Construir un monolito modular. Todo corre en un solo proceso FastAPI, pero con cuatro carpetas de dominio aisladas (`identity`, `catalog`, `inventory`, `orders`). Cuando un módulo necesita datos de otro, no hace consultas directas a sus tablas: llama a una función pública de contrato en memoria.
- **Lo que ganamos:** Checkout inmediato en milisegundos, despliegue en un clic sobre Dokploy y consistencia transaccional en una sola base de datos.
- **Lo que sacrificamos:** No podemos desplegar una actualización del catálogo sin reiniciar el contenedor donde corren los pedidos. Para la escala de una cafetería universitaria, ese reinicio tarda dos segundos y no justifica la complejidad de microservicios.

### ADR 0014: Aislamiento multitienda forzado en PostgreSQL (Row Level Security)
- **El dilema:** Antojos, Punto Fit y Alegría son negocios distintos. Si controlamos los permisos únicamente con código Python mediante un filtro `WHERE tienda_id = X`, el día que alguien olvide esa línea en un endpoint nuevo, el administrador de una cafetería podría ver o editar los pedidos del vecino.
- **La decisión:** Activar Row Level Security (RLS) directamente en PostgreSQL 17. Cada vez que llega una petición autenticada, la conexión fija la variable de sesión `app.current_store_id`. Si el usuario pertenece a la tienda 1, el motor de base de datos físicamente no le devuelve filas de la tienda 2.
- **Lo que ganamos:** Seguridad garantizada en la capa de datos. Aunque un programador cometa un error en el código de la API, la base de datos bloquea el acceso cruzado.
- **Lo que sacrificamos:** Configurar variables de sesión en cada transacción con SQLAlchemy agrega dos líneas de código por conexión.

### ADR 0017: Administrador general en modo supervisión (solo lectura)
- **El dilema:** La universidad quería un usuario con rol de administrador general. La tentación habitual es darle permisos de superusuario con control total sobre todas las tiendas.
- **La decisión:** Restringir al administrador general a un modo de supervisión estricto. Puede ver las colas de pedidos, las ventas del día y el catálogo de las cinco cafeterías, pero su interfaz no tiene botones para modificar precios, cambiar existencias ni alterar estados de pedidos.
- **Lo que ganamos:** Evitamos que un funcionario central modifique por error las condiciones comerciales de un negocio privado concesionado.
- **Lo que sacrificamos:** Si un punto de comida necesita corregir un precio con urgencia, debe hacerlo el administrador asignado a esa tienda específica.

### ADR 0018: Transacción compartida directa en lugar de colas asíncronas
- **El dilema:** Para descontar stock al hacer un pedido, muchos sugieren arquitecturas dirigidas por eventos con Kafka o RabbitMQ. Sin embargo, en una cafetería con alta concurrencia, las colas asíncronas pueden tardar segundos en enterarse de que el stock bajó a cero, permitiendo que dos estudiantes reserven el mismo último almuerzo.
- **La decisión:** Mantener la reserva de pedidos y el descuento de inventario dentro de la misma transacción SQL local con bloqueo pesimista (`SELECT ... FOR UPDATE`).
- **Lo que ganamos:** Cero sobreventa. O el stock se descuenta y el pedido se crea en ese mismo instante, o la base de datos revierte todo y le avisa de inmediato al comprador.
- **Lo que sacrificamos:** Los esquemas de pedidos e inventario quedan acoplados dentro de la misma instancia de base de datos.

---

## 3. Catálogo completo de los 18 ADRs del repositorio

| Número | Decisión adoptada | Alternativa descartada y motivo |
|---|---|---|
| **0001** | Monolito modular | Microservicios (descartados por sobrecarga operativa y latencia innecesaria). |
| **0002** | Contratos OpenAPI 3.1 | Documentación manual (descartada por desincronización entre frontend y backend). |
| **0003** | Frontend en Next.js 15 | SPA en React puro (descartada para aprovechar renderizado en servidor y SEO). |
| **0004** | Backend en contenedor Docker | Despliegue en máquina virtual directa (descartado por falta de reproducibilidad). |
| **0005** | PostgreSQL 17 relacional | Base de datos NoSQL (descartada porque el inventario requiere transacciones ACID). |
| **0006** | Infraestructura como Código | Configuración manual en paneles web (descartada por falta de auditoría). |
| **0007** | Despliegue unificado en Dokploy | Servicios dispersos en múltiples proveedores gratuitos con límites de suspensión. |
| **0008** | Catálogo e Inventario separados | Tabla única de productos con stock (descartada para separar metadatos de movimientos). |
| **0009** | Sin componente generativo de IA | Chatbot de compras (descartado por costos y falta de valor en un menú fijo). |
| **0010** | No extraer módulos prematuros | Extracción de pedidos a microservicio (descartada por no tener cuello de botella real). |
| **0011** | Sesión en LocalStorage | Cookies HttpOnly con backend en otro dominio (descartada por bloqueo de dominios cruzados). |
| **0012** | Proxy interno `/api/proxy` en Next.js | Peticiones directas a la API desde el navegador (descartada para evitar problemas de CORS). |
| **0013** | Migraciones con Alembic | Creación de tablas con `create_all()` (descartada porque rompía bases de datos con datos). |
| **0014** | Seguridad con RLS en Postgres | Validación únicamente en Python (descartada para tener defensa en profundidad). |
| **0015** | Control de paquetes con lockfile | Instalación con versiones abiertas (descartada por inconsistencias de build). |
| **0016** | Autenticación JWT y Argon2id | Sesiones en base de datos con consultas por petición (descartadas por costo en lecturas). |
| **0017** | Supervisor general solo lectura | Superusuario con permisos de edición global (descartado para proteger concesiones). |
| **0018** | Transacción local compartida | Patrón Saga con eventos asíncronos (descartado para evitar sobreventa de stock). |

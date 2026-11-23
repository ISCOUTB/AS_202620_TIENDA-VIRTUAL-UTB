# Elemento 5: Seguridad en Profundidad y Aislamiento Multitienda (RLS + RBAC)

> **Alineación con la Rúbrica Oficial:** Sustenta el **Criterio 3 (Calidad, resiliencia y seguridad verificadas — 1,00 pts)** al demostrar la aplicación de defensas por capas y la implementación de PostgreSQL Row Level Security (RLS) en el motor de base de datos.

---

## 1. El Principio de Defensa en Profundidad

En arquitecturas multitenant (como una universidad con 5 cafeterías comerciales independientes), confiar el aislamiento de datos únicamente a la capa de aplicación es una mala práctica conocida como *seguridad superficial*: si un programador olvida agregar `WHERE tienda_id = :id` en una nueva consulta SQL, los datos de una tienda se filtran a otra.

Diseñamos una arquitectura de **Defensa en Profundidad estructurada en tres capas**:

```
[ Capa 1: Autenticación en API ]
     │  Tokens JWT HS256 + Contraseñas cifradas con Argon2id
     ▼
[ Capa 2: Autorización por Roles en FastAPI (RBAC) ]
     │  Comprador vs Admin de Tienda vs Supervisor General
     ▼
[ Capa 3: PostgreSQL Row Level Security (RLS) ]
     │  Políticas forzadas en el motor de base de datos (ADR 0014)
     ▼
[ Datos Aislados en Disco ]
```

---

## 2. Capa 1 y 2: Autenticación JWT y Roles Asignados

- **Algoritmo de contraseñas:** Argon2id (ganador del Password Hashing Competition), inmune a ataques con GPUs.
- **Autenticación:** Tokens firmados con JWT HS256 con tiempo de expiración y claims estructurados (`sub`, `roles`, `tienda_id`).
- **Matriz de Roles:**
  1. **Comprador (`buyer`):** Puede consultar catálogo público, crear reservas y ver únicamente sus propios pedidos. Tiene bloqueado cualquier endpoint administrativo.
  2. **Administrador de Tienda (`store_admin`):** Asignado estrictamente a una tienda física (ej. `antojos`, `puntofit`, `alegria`). Solo puede editar precios, stock y despachar pedidos de su tienda asignada.
  3. **Administrador General / Supervisor (`general_admin` - ADR 0017):** Dispone de visibilidad global de las 5 cafeterías para auditoría institucional, pero **sin controles de edición ni alteración de pedidos**.

---

## 3. Capa 3: PostgreSQL Row Level Security (ADR 0014)

La innovación arquitectónica más sólida del proyecto es delegar el aislamiento al motor de PostgreSQL 17 mediante **Row Level Security (RLS)**.

### Configuración en la Migración Alembic 0002
📄 **Archivo:** `backend/migrations/versions/0002_rls.py`

1. Se crea un usuario de base de datos sin privilegios de superusuario (`tienda_app`).
2. Se activa RLS en las tablas críticas:
   ```sql
   ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
   ALTER TABLE existencias ENABLE ROW LEVEL SECURITY;
   ```
3. Se definen las políticas de seguridad:
   ```sql
   CREATE POLICY pedidos_tienda_admin ON pedidos
     FOR ALL
     TO tienda_app
     USING (
       tienda_id = current_setting('app.current_store_id', true)::int
       OR current_setting('app.is_supervisor', true) = 'true'
     );
   ```

### Cómo Funciona en Cada Petición HTTP
Cuando un administrador inicia sesión y llama a la API:
1. El middleware de seguridad (`backend/app/shared/seguridad.py`) extrae el `tienda_id` del token JWT verificado.
2. Al abrir la conexión a la base de datos con SQLAlchemy, ejecuta de inmediato:
   ```sql
   SET LOCAL ROLE "tienda_app";
   SET LOCAL app.current_store_id = '1';
   ```
3. Cualquier consulta posterior ejecutada por SQLAlchemy (incluso un simple `SELECT * FROM pedidos`) es filtrada **automáticamente por el motor de PostgreSQL**. Si la consulta intenta acceder a la tienda 2, PostgreSQL devuelve 0 filas o genera un error de permisos `42501 (insufficient_privilege)`.

---

## 4. Verificación Automatizada: `test_rls.py` y `test_admin_por_tienda.py`

La seguridad no se asume: se prueba contra ataques simulados:

- 📄 `backend/tests/test_rls.py`: Prueba directamente contra una base de datos PostgreSQL que:
  - Un usuario conectado como `tienda_app` con contexto de tienda 1 no puede ver registros de la tienda 2.
  - Intentar insertar un pedido con `tienda_id = 2` mientras el contexto es `1` lanza inmediatamente una excepción de violación de RLS.
- 📄 `backend/tests/test_admin_por_tienda.py`: Verifica a nivel de endpoint HTTP que:
  - Admin de Antojos recibe HTTP 403 al llamar `POST /catalog/products` intentando asignar otra tienda.
  - Admin de Punto Fit recibe HTTP 403 al intentar avanzar el estado de un pedido de Antojos.

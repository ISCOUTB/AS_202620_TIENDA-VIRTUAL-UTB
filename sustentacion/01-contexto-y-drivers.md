# Elemento 1: Contexto de Negocio, Drivers y Requisitos de Calidad (QAW / ATAM)

> **Alineación con la Rúbrica Oficial:** Sustenta el **Criterio 1 (Sistema funcional y respuesta al desafío — 1,25 pts)** al demostrar que el sistema no es una aplicación genérica, sino una solución diseñada para restricciones operativas reales del campus UTB.

---

## 1. El Problema del Campus y Stakeholders

En el campus de la Universidad Tecnológica de Bolívar (UTB) operan **cinco puntos de venta de comida independientes**:
1. **Antojos** (snacks y fritos tradicionales).
2. **Punto Fit** (opciones saludables y ensaladas).
3. **Alegría** (repostería y café).
4. **Almuerzo 01** (menú del día principal).
5. **Almuerzo 02** (menú ejecutivo alternativo).

### La Fricción Operativa Real
- **Picos de congestión concentrados:** Los descansos de 15 minutos entre clases y la hora de almuerzo (12:00 m a 2:00 pm) saturan los mostradores físicos.
- **Falta de inventario en tiempo real:** Los estudiantes hacen filas de hasta 20 minutos solo para descubrir en la ventanilla que el producto deseado ya se agotó.
- **Cobro en sitio:** Las cafeterías no cuentan con integración a pasarelas bancarias ni datáfonos web; su operación financiera se basa en cobro físico (efectivo, Nequi manual o datáfono en mostrador).

### Stakeholders del Sistema
- **Compradores (Estudiantes, Docentes y Personal):** Necesitan consultar la disponibilidad real y reservar su pedido con hora programada de recogida para evitar filas.
- **Administradores de Tienda (Personal de cada Cafetería):** Necesitan despachar pedidos rápidamente desde una cola organizada y actualizar existencias sin que personal de otros puntos modifique sus datos.
- **Supervisor General (Administración del Campus):** Requiere visibilidad global de las métricas de servicio de todas las tiendas en modo de solo lectura (ADR 0017).

---

## 2. Árbol de Utilidad (Utility Tree ATAM)

Para priorizar las decisiones de diseño sin caer en ambigüedades, utilizamos el método **ATAM (Architecture Tradeoff Analysis Method)**. Cada atributo de calidad se clasificó según su **Impacto en el Negocio (IN)** y su **Riesgo Arquitectónico (RA)** en una escala Alto (H), Medio (M) o Bajo (L):

```
UTILITY TREE
│
├── Security
│   ├── Autenticación de usuarios (login JWT, contraseñas Argon2id) ──────── (IN: H, RA: M)
│   └── Autorización por rol y tienda (RLS en base de datos) [AC-01] ──────── (IN: H, RA: M)
│
├── Usability
│   ├── Flujo de reserva en máximo 4 pasos [AC-02] ────────────────────────── (IN: H, RA: L)
│   └── Mensajes claros de agotamiento de existencias ─────────────────────── (IN: M, RA: L)
│
├── Performance
│   ├── Reflejo de existencias en menos de 2 s tras reserva [AC-03] ───────── (IN: H, RA: M)
│   └── Carga inicial de catálogo en SSR optimizado ───────────────────────── (IN: M, RA: L)
│
└── Availability
    ├── Concurrencia en hora pico (5 usuarios simultáneos sin error) [AC-04]  (IN: M, RA: M)
    └── Recuperación limpia ante reinicio de contenedores ─────────────────── (IN: L, RA: L)
```

---

## 3. Especificación Formal de los 4 Escenarios de Calidad

Los 4 escenarios prioritarios se formularon siguiendo el estándar de 6 partes del Software Engineering Institute (SEI):

### Escenario 1 (AC-01): Seguridad — Autorización por Rol y Aislamiento Multitienda
- **Fuente:** Un administrador autenticado de la tienda *Punto Fit*.
- **Estímulo:** Intenta modificar el precio o descontar inventario de un producto perteneciente a la tienda *Antojos*.
- **Ambiente:** Operación normal en producción.
- **Artefacto:** API de administración (`/catalog`, `/inventory`) y motor PostgreSQL 17.
- **Respuesta:** El sistema rechaza la operación de inmediato devolviendo HTTP 403 Forbidden o HTTP 404/Privilege Denied sin alterar los datos.
- **Medida:** **100% de rechazo** en la matriz de operaciones rol × tienda no autorizada. Verificado en `backend/tests/test_admin_por_tienda.py` y `backend/tests/test_rls.py`.

### Escenario 2 (AC-02): Usabilidad — Flujo Completo de Reserva
- **Fuente:** Comprador autenticado (estudiante o docente).
- **Estímulo:** Desea reservar un producto disponible en el catálogo para recoger al terminar su clase.
- **Ambiente:** Catálogo en línea con datos activos.
- **Artefacto:** Frontend Next.js (búsqueda, carrito y confirmación de pedido).
- **Respuesta:** El comprador completa la reserva desde la portada hasta la pantalla de confirmación.
- **Medida:** El flujo se completa en **máximo 4 pasos/pantallas** (1: Ver tienda/catálogo → 2: Agregar producto → 3: Seleccionar hora de recogida → 4: Confirmar reserva). Verificado en pruebas E2E con TestSprite.

### Escenario 3 (AC-03): Rendimiento — Reflejo de Inventario entre Sesiones
- **Fuente:** Comprador B navegando el catálogo simultáneamente.
- **Estímulo:** El Comprador A confirma la reserva del último producto disponible.
- **Ambiente:** Operación normal.
- **Artefacto:** Servicio transaccional de pedidos (`orders/service.py`) y lectura SSR de catálogo.
- **Respuesta:** Al recargar la página del catálogo, el producto aparece marcado como agotado o con stock disminuido.
- **Medida:** Tiempo transcurrido entre la confirmación del Comprador A y la visibilidad para el Comprador B **menor a 2,0 segundos**. Garantizado por la transacción compartida ACID (ADR 0018) y caché HTTP `no-store` en lecturas de stock.

### Escenario 4 (AC-04): Disponibilidad — Tolerancia a Consultas Concurrentes en Hora Pico
- **Fuente:** 5 compradores simultáneos consultando catálogo e inventario.
- **Estímulo:** Solicitudes concurrentes a `GET /catalog/products` y `GET /inventory`.
- **Ambiente:** Servidor API en contenedor sobre PostgreSQL 17.
- **Artefacto:** Backend FastAPI, pool de conexiones SQLAlchemy y base de datos.
- **Respuesta:** Todas las solicitudes se atienden sin pérdidas de paquetes ni fallas internas.
- **Medida:** **30 de 30 cargas exitosas** (6 corridas de 5 usuarios), **0 errores HTTP** (0 timeouts, 0 5xx), peor latencia observada de **41,78 ms** y sonda `/health` respondiendo 200 en 1,12 ms. Reporte empírico en `docs/medicion-escenario-4.md`.

---

## 4. Tensión Arquitectónica (Trade-off Central)

La arquitectura resuelve una tensión fundamental:
> **Seguridad Estricta vs. Simplicidad Operacional**
> Separar físicamente las bases de datos de cada tienda garantizaría aislamiento absoluto, pero requeriría 5 instancias PostgreSQL, 5 pipelines de migración y coordinación multi-base de datos inviable para un equipo pequeño.  
> **Solución arquitectónica:** Usar una única instancia de PostgreSQL 17 gobernada por **Row Level Security (RLS)**. El motor filtra las filas a nivel de kernel de base de datos sin sobrecosto de infraestructura ni complejidad operacional.

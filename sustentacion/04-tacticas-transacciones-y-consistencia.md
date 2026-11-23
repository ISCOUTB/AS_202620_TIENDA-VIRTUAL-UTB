# Elemento 4: Tácticas de Arquitectura, Consistencia y Transaccionalidad

> **Alineación con la Rúbrica Oficial:** Sustenta el **Criterio 1 (Sistema funcional y respuesta al desafío — 1,25 pts)** y el **Criterio 3 (Calidad, resiliencia y seguridad verificadas — 1,00 pts)** al evidenciar cómo las tácticas del SEI resuelven problemas de concurrencia y tolerancia a fallos.

---

## 1. Táctica de Consistencia: Transacción ACID Compartida (ADR 0018)

Uno de los mayores desafíos de diseño en aplicaciones de comercio es la **prevención de la sobreventa** (dos clientes reservando simultáneamente el último producto en existencia).

### El Dilema Arquitectónico: ¿Saga Distribuida o Transacción Local?
En arquitecturas de microservicios separadas, la reserva requiere el patrón **Saga** (coreografiada u orquestada) con eventos asíncronos y transacciones compensatorias. Si la red falla o el servicio de inventario tarda, el comprador experimenta estados inconsistentes o reservas canceladas minutos después.

### La Solución Implementada: Transacción Compartida Atómica
Al elegir un monolito modular sobre PostgreSQL 17 (ADR 0018), eliminamos la complejidad de la mensajería asíncrona y resolvemos la consistencia mediante una **transacción ACID local con bloqueo pesimista**:

📄 **Ubicación en código:** `backend/app/modules/orders/service.py` y `backend/app/modules/inventory/public.py`

```python
# Flujo conceptual en backend/app/modules/orders/service.py:
def crear_reserva_pedido(db: Session, comprador_id: int, tienda_id: int, items: list[ItemPedido]):
    with db.begin():  # Transacción atómica en PostgreSQL
        # 1. Bloqueo pesimista de stock por producto
        for item in items:
            existencia = db.query(Existencia).filter(
                Existencia.producto_id == item.producto_id,
                Existencia.tienda_id == tienda_id
            ).with_for_update().first()  # SELECT ... FOR UPDATE
            
            if not existencia or existencia.cantidad < item.cantidad:
                raise StockInsuficienteError(f"No hay existencias para {item.producto_id}")
                # ROLLBACK automático e inmediato: no se crea pedido ni se cobra
            
            # 2. Descuento de stock y registro en kardex
            existencia.cantidad -= item.cantidad
            db.add(MovimientoExistencia(...))
        
        # 3. Creación del pedido con sus líneas en estado pendiente_pago
        pedido = Pedido(comprador_id=comprador_id, tienda_id=tienda_id, estado="pendiente_pago")
        db.add(pedido)
    # Al salir del bloque, COMMIT atómico en PostgreSQL
```

### Garantías Demostrables:
- **Atomicidad (A):** O se descuenta el stock y se crea el pedido, o no ocurre ninguna de las dos cosas.
- **Aislamiento (I):** `with_for_update()` impide que dos hilos simultáneos descuenten la misma unidad física.
- **Durabilidad (D):** El registro queda confirmado en disco por el motor PostgreSQL.

---

## 2. Táctica de Resiliencia: Sondas de Salud Desacopladas (Liveness vs Readiness)

Para operar de forma robusta en Dokploy y entornos de contenedores, la API no expone un único health check genérico, sino dos sondas con propósitos diferenciados:

| Endpoint | Propósito | Comportamiento Técnico |
|---|---|---|
| `GET /health` | **Liveness Probe** | Comprueba si el proceso Uvicorn/FastAPI está vivo y recibiendo peticiones HTTP. Responde 200 de inmediato sin tocar la base de datos. |
| `GET /health/ready` | **Readiness Probe** | Ejecuta un `SELECT 1` real en PostgreSQL 17 a través del pool de SQLAlchemy. Si la base de datos está iniciando o recuperándose de un fallo, devuelve 503 Service Unavailable, evitando enviar tráfico a un contenedor no listo. |

📄 **Verificación en el despliegue activo:**
- `curl -i https://tiendautb.iscoutb.dev/api/proxy/health` → `200 OK`
- `curl -i https://tiendautb.iscoutb.dev/api/proxy/health/ready` → `200 OK`

---

## 3. Táctica de Recuperación: Tarea de Vencimiento de Pedidos Huérfanos

¿Qué sucede si un estudiante reserva un almuerzo a las 11:00 am pero nunca acude a pagarlo ni recogerlo?  
Sin un mecanismo de recuperación, ese inventario quedaría secuestrado indefinidamente y la cafetería perdería la venta.

Implementamos un comando programado de recuperación y compensación:

📄 **Archivo:** `backend/app/tareas/vencer_pedidos.py`

```python
def vencer_pedidos_expirados(db: Session, horas_expiracion: int = 24) -> int:
    """Busca pedidos en 'pendiente_pago' con más de 24 horas, los cancela y repone stock."""
    limite = datetime.now(timezone.utc) - timedelta(hours=horas_expiracion)
    
    with db.begin():
        pedidos_vencidos = db.query(Pedido).filter(
            Pedido.estado == "pendiente_pago",
            Pedido.fecha_creacion < limite
        ).with_for_update().all()
        
        for pedido in pedidos_vencidos:
            pedido.estado = "cancelado"
            pedido.motivo_cancelacion = "Expiración por tiempo límite de recogida"
            # Reponer existencias de cada ítem en el inventario
            for linea in pedido.lineas:
                reponer_existencias(db, pedido.tienda_id, linea.producto_id, linea.cantidad)
                
    return len(pedidos_vencidos)
```

---

## 4. Táctica de Tolerancia a Fallos en Frontend: Caché Fallback

En el frontend Next.js (`frontend/lib/catalogo-servidor.ts`), las consultas de catálogo se ejecutan en modo SSR. Si la API experimenta un reinicio breve o micro-corte de red:
1. El frontend captura la excepción en lugar de mostrar un error 500 no controlado.
2. Renderiza una vista defensiva con los datos de referencia en caché local señalando claramente el estado fuera de línea.
3. Se evita la degradación total de la experiencia del usuario.

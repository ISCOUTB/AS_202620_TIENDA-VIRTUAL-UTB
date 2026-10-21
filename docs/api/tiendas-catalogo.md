# Tiendas y catálogo: lo que el frontend necesita del contrato

**Estado:** propuesta de diseño. Nada de este documento está implementado en la
API `0.3.0`. Complementa [`administracion-catalogo.md`](administracion-catalogo.md)
y el contrato de diseño [`../openapi/tienda-virtual.yaml`](../openapi/tienda-virtual.yaml).

## 1. El problema

El frontend se construyó para cinco puntos dentro de **una sola cafetería**:

| Slug | Nombre | Categoría |
|---|---|---|
| `antojos` | Antojos | Tienda de barrio |
| `punto-fit` | Punto Fit | Fresco y ligero |
| `alegria` | Alegría | Helados y sándwiches |
| `almuerzo-01` | Almuerzo 01 | Línea oriental |
| `almuerzo-02` | Almuerzo 02 | Por definir |

El contrato actual devuelve:

```json
{
  "id": 1,
  "nombre": "Café americano",
  "descripcion": "Café negro sin leche",
  "precio_centavos": 350000,
  "existencias": 20
}
```

`ProductOut` **no tiene tienda ni categoría**. Sin ese dato el cliente no puede
agrupar el catálogo por punto, y hoy la asignación vive en
`frontend/lib/catalogo.ts`, duplicando información que pertenece al backend.
Ese es el primer hueco a cerrar.

## 2. Cambios propuestos al contrato

### 2.1 `ProductOut` gana `tienda` y `categoria`

```yaml
ProductOut:
  type: object
  required: [id, nombre, descripcion, precio_centavos, existencias, tienda]
  properties:
    id: { type: integer }
    nombre: { type: string }
    descripcion: { type: string }
    precio_centavos: { type: integer, minimum: 0 }
    existencias: { type: integer, minimum: 0 }
    tienda:
      type: string
      enum: [antojos, punto-fit, alegria, almuerzo-01, almuerzo-02]
    categoria:
      type: string
      description: Rótulo corto de señalética ("Tienda de barrio", "Línea oriental").
    presentacion:
      type: string
      nullable: true
      description: "Grande", "Personal", "Entero", "Medio".
    precio_confirmado:
      type: boolean
      default: true
      description: >
        false = precio de referencia, aún no confirmado por la tienda. El
        frontend lo marca y excluye la tienda del índice de buscadores.
```

`precio_confirmado` es el reemplazo contractual del booleano `esMuestra` que
hoy vive en el catálogo del frontend. **No es un detalle cosmético**: el sitio
publica precios, y publicar un precio sin confirmar como si fuera definitivo es
desinformar.

### 2.2 `OrderItemRequest` gana `notas`

Hoy:

```yaml
OrderItemRequest:
  required: [product_id, cantidad]
  properties:
    product_id: { type: integer }
    cantidad: { type: integer, minimum: 1 }
```

Consecuencia en la interfaz: los sabores de snacks y helados **no se pueden
pedir**. El frontend lo resuelve diciendo la verdad —«el sabor se elige al
recoger»— y no ofreciendo un selector que no se puede enviar.

Propuesta:

```yaml
OrderItemRequest:
  required: [product_id, cantidad]
  properties:
    product_id: { type: integer }
    cantidad: { type: integer, minimum: 1 }
    notas:
      type: string
      maxLength: 140
      nullable: true
      description: "Sin cebolla", "Sabor queso", etc. Se imprime en el ticket."
```

Hasta que exista, la interfaz mantiene la frase actual. **No** se envía un
campo que el contrato rechazaría.

### 2.3 `OrderCreateRequest` gana `hora_recogida`

El frontend deja elegir una franja de recogida y hoy la guarda solo en
`localStorage`. El mostrador no la recibe.

```yaml
OrderCreateRequest:
  required: [items]
  properties:
    items:
      type: array
      minItems: 1
      items: { $ref: '#/components/schemas/OrderItemRequest' }
    hora_recogida:
      type: string
      format: time
      nullable: true
      description: Franja acordada con el mostrador (America/Bogota).
```

Mientras no exista, la hora se presenta como **acuerdo con el mostrador**, no
como compromiso del sistema. Es la diferencia entre una expectativa y una
promesa que el backend no puede cumplir.

### 2.4 `POST /orders` debe exponer `Idempotency-Key`

El diseño de [`../idempotencia-saga-s11.md`](../idempotencia-saga-s11.md) ya lo
exige. El frontend **ya envía** la cabecera (`lib/pedidos.ts` genera un UUID por
intento), pero el endpoint no está publicado. Cuando lo esté, la cabecera debe
ser obligatoria y documentada en el `400`/`409` correspondiente.

## 3. Operaciones que faltan para completar el flujo

| Operación | Método y ruta | Módulo | Necesaria para |
|---|---|---|---|
| Iniciar sesión | `POST /identity/login` | identity | todo el flujo de compra |
| Registrar cuenta | `POST /identity/register` | identity | alta del estudiante |
| Sesión actual | `GET /identity/me` | identity | `/cuenta` sin parpadeo |
| Crear pedido | `POST /orders` | orders | reserva |
| Listar mis pedidos | `GET /orders` | orders | historial en `/cuenta` |
| Ajustar existencias | `PATCH /inventory/{product_id}` | inventory | panel `/admin` |

El panel `/admin` funciona hoy con un **borrador local** explícitamente
marcado. No se implementó una escritura falsa: cuando el `PATCH` exista, el
componente cambia una función y el resto de la vista queda igual.

## 4. Estado de cada tienda en el frontend

| Tienda | Productos | Precios | `indexable` | Motivo |
|---|---|---|---|---|
| Antojos | 22 | de referencia | no | la tienda no los confirmó |
| Punto Fit | 12 | de referencia | no | idem |
| Alegría | 9 | de referencia | no | idem |
| Almuerzo 01 | 8 | **confirmados** | sí | carta real del punto |
| Almuerzo 02 | 0 | — | no | sin carta publicada |

La regla es doble: `indexable` requiere ≥ 8 productos **y** al menos un precio
confirmado (`lib/catalogo.ts → tiendaCompleta`). Así una tienda no entra al
índice por tener muchos productos de muestra.

## 5. Qué NO se propone

- **Un endpoint por tienda** (`/stores/{slug}/products`). Duplicaría el
  catálogo y rompería el carrito global, que es un solo `POST /orders`.
- **Precios por variante** en este incremento. El contrato no tiene variantes y
  el mostrador resuelve el sabor al entregar.
- **Pago en línea (Wompi)**. Está declarado como extensión futura, no como
  parte de este contrato. Añadirlo ahora obligaría a un estado de pedido
  «pagado» y a una máquina de estados que el backend no tiene.

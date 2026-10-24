# PRD — Tienda Virtual UTB (versión 0.5.0)

## 1. Resumen

Tienda Virtual UTB permite a estudiantes de la Universidad Tecnológica de
Bolívar **apartar** productos en las tiendas de la cafetería del campus y
recogerlos entre clases. **No hay pago en línea**: el pedido se paga en el
mostrador al recoger. Si no se paga en 24 horas, el pedido se cancela solo y
las unidades vuelven a la tienda.

Interfaz en español (Colombia). Precios en pesos colombianos con punto de
miles (ej. «$19.600»).

- Frontend: Next.js 15 (App Router) en `http://localhost:3000`.
- Backend: FastAPI + PostgreSQL. El navegador habla con la API solo a través
  del proxy same-origin `/api/proxy/*`.
- Autenticación: JWT (Bearer) guardado en `localStorage`.

## 2. Usuarios y roles

| Rol | Puede |
|---|---|
| Visitante (sin sesión) | Ver portada, tiendas, cartas, precios, existencias y buscar. No puede apartar. |
| Comprador (`comprador`) | Todo lo anterior + carrito, apartar pedidos, ver «Mis pedidos» y cancelar mientras estén «Por pagar». |
| Administrador de tienda (`admin_tienda`) | Panel `/admin` **solo de su tienda**: inventario (sumar/restar/fijar), cola de pedidos (confirmar pago → entregar, cancelar), alta/edición/desactivación de productos. No ve ni toca otras tiendas. |
| Responsable de inventario | Panel `/admin` de su tienda: inventario y cola de pedidos (no edita productos). |
| Administrador general (`admin_general`) | **Solo supervisa**: ve el panel de las cinco tiendas (KPI, inventario, cola de pedidos) con el aviso «Modo supervisión», pero **no puede cambiar nada**: sin botones de ajuste, sin «Editar», sin «Producto nuevo», sin acciones en la cola. La API le responde 403. |

Toda cuenta nueva creada desde la web es «comprador».

### Cuentas de prueba (datos de demostración)

| Correo | Contraseña | Rol |
|---|---|---|
| `ana@utb.edu.co` | `Comprador-2026` | Comprador |
| `admin.antojos@utb.edu.co` | `Tienda-2026` | Admin de **Antojos** únicamente |
| `admin.punto-fit@utb.edu.co` | `Tienda-2026` | Admin de **Punto Fit** únicamente |
| `admin.alegria@utb.edu.co` | `Tienda-2026` | Admin de **Alegría** únicamente |
| `admin.almuerzo-01@utb.edu.co` | `Tienda-2026` | Admin de **Almuerzo 01** únicamente |
| `admin.almuerzo-02@utb.edu.co` | `Tienda-2026` | Admin de **Almuerzo 02** únicamente |
| `admin@utb.edu.co` | `Admin-Demo-2026` | Administrador general (solo supervisa) |

Datos sembrados: ana tiene pedidos en Almuerzo 01 y en Antojos en todos los
estados (por tienda: 8 «Por pagar», 1 «Pagado», 1 «En preparación», 1
«Entregado», 1 «Cancelado»).

## 3. Tiendas

| Slug | Nombre | Carta |
|---|---|---|
| `antojos` | Antojos | 22 productos, precios de referencia |
| `punto-fit` | Punto Fit | 12 productos, precios de referencia |
| `alegria` | Alegría | 13 productos, precios de referencia |
| `almuerzo-01` | Almuerzo 01 | 8 productos, precios **confirmados** |
| `almuerzo-02` | Almuerzo 02 | Sin productos: muestra «Este punto todavía no publica su carta.» |

## 4. Páginas

| Ruta | Contenido |
|---|---|
| `/` | Portada: titular «Cinco tiendas, un solo pase.», buscador de productos (placeholder «Arroz, granola, helado…»), «Elige tienda», «Lo más pedido», preguntas frecuentes. |
| `/tiendas/{slug}` | Carta de una tienda con pestañas de tiendas, tarjetas de producto y resumen del pedido (escritorio). |
| `/auth/ingresar` | Login: campos «Correo institucional» y «Contraseña», botón «Entrar». |
| `/auth/crear-cuenta` | Registro de cuenta (nombre, correo, contraseña de 8+ caracteres). |
| `/cuenta` | Pase del usuario: carnet, rol, sección «Pedidos» y sección «Tu carrito». Requiere sesión. |
| `/admin` | Panel de cafetería. Requiere sesión y un rol de gestión; un comprador ve un 403 «Esta área es de administración.» |

## 5. Requisitos funcionales

### 5.1 Catálogo
- RF-01 Cada tarjeta muestra nombre, presentación (si la tiene, ej. «· entero»),
  descripción, precio y existencias: «Quedan N», «Últimas N unidades» (≤ 3) o
  «Agotado». Lo agotado **se muestra**, nunca se oculta, y su botón dice
  «Sin unidades» (deshabilitado).
- RF-02 Los productos con precio no confirmado muestran «Referencia» / «Precio
  de referencia». Es un estado esperado, no un error.
- RF-03 Las existencias se leen en cada carga de página (sin caché): tras un
  pedido o un ajuste de inventario, recargar la página muestra el valor nuevo.
- RF-04 El buscador de la portada encuentra por nombre, descripción,
  presentación o sabor, sin distinguir tildes ni mayúsculas («pina» encuentra
  «Piña»). Requiere al menos 2 letras.
- RF-05 Si la API no responde, se muestra «No pudimos conectar con la tienda.»
  y los botones dicen «En pausa» (no se puede apartar).

### 5.2 Carrito y pedido
- RF-06 «Agregar» añade una unidad; luego aparece un control de cantidad
  (− / +) que no deja superar las existencias.
- RF-07 El carrito es único para todas las tiendas y persiste en el navegador
  24 horas. Se abre con «Ver pedido» (barra/nav) o «Elegir hora y apartar».
- RF-08 En el panel «Tu pedido» se elige la franja «¿A qué hora pasas?»
  (botones de hora). Sin hora, confirmar muestra «Elige la hora a la que vas a
  pasar por el pedido.»
- RF-09 Sin sesión el botón dice «Entrar y apartar» y lleva a `/auth/ingresar`.
- RF-10 Con sesión, «Apartar para las HH:MM» crea los pedidos. **Se crea un
  pedido por tienda**: un carrito con productos de dos tiendas genera dos
  pedidos («Pedidos #X, #Y»). La confirmación dice «Reserva registrada» y el
  carrito se vacía.
- RF-11 Reintentar el mismo pedido (doble clic, fallo de red) no lo duplica
  ni descuenta stock dos veces (cabecera `Idempotency-Key`).
- RF-12 Las existencias bajan al apartar; si no alcanzan, se muestra el error
  de la API y no se crea nada.

### 5.3 Mis pedidos (`/cuenta`)
- RF-13 La sección «Pedidos» lista los pedidos del usuario con tienda, número,
  estado, productos, fecha, hora de recogida y total.
- RF-14 Estados visibles: «Por pagar», «Pagado», «En preparación», «Listo para
  recoger», «Entregado», «Cancelado».
- RF-15 Un pedido «Por pagar» tiene el botón «Cancelar pedido»; al cancelar se
  muestra «Pedido #N cancelado. Las unidades volvieron a la tienda.» y las
  existencias se reponen. Pedidos en otros estados no muestran el botón.

### 5.4 Panel de administración (`/admin`)
- RF-16 Solo aparecen las tiendas que la persona gestiona (el admin de
  Almuerzo 01 solo ve Almuerzo 01; el admin general ve las cinco en modo
  supervisión, sin controles de edición).
- RF-17 KPI: «Productos a la venta», «Agotados», «Precios sin confirmar»,
  «Valor del inventario».
- RF-18 **Pedidos**: cola por tienda (selector «Tienda»). Botones según estado:
  «Confirmar pago» → «Empezar a preparar» → «Marcar listo» → «Entregar», y
  «Cancelar» mientras no esté entregado. «Ver entregados y cancelados» muestra
  los cerrados.
- RF-19 **Inventario**: tabla con filtro por tienda y búsqueda. Botones
  «Restar una unidad» / «Sumar una unidad» y un campo numérico de existencias
  (escribir y Enter fija el conteo). Cada cambio se guarda al momento; el
  valor mostrado es el que devuelve la API. No se puede bajar de 0.
- RF-20 **Productos**: «Producto nuevo» abre un formulario (Tienda, Nombre,
  Precio en pesos, Categoría, Presentación, Descripción, «Precio confirmado por
  la tienda», «A la venta»). «Editar» en una fila abre el mismo formulario con
  los datos. Un nombre repetido en la misma tienda da error. Un producto nuevo
  empieza con 0 existencias. Desmarcar «A la venta» lo saca de la tienda
  pública (en el panel aparece «Inactivo»).
- RF-21 Un admin de tienda no puede ver ni modificar el inventario, los
  productos ni los pedidos de otra tienda (la API responde 403/404).
- RF-21b El admin general no puede modificar nada de ninguna tienda: en el
  panel no hay botones de ajuste, «Editar», «Producto nuevo» ni acciones en
  la cola, y la API responde 403 «El administrador general solo supervisa».

### 5.5 Rutas y sesión
- RF-22 Login con credenciales erróneas muestra un error y no entra.
- RF-23 «Cerrar sesión» en `/cuenta` borra la sesión.
- RF-24 Si el token vence o es inválido (401), la sesión se cierra y se pide
  entrar de nuevo.
- RF-25 `/login` redirige a `/auth/ingresar` y `/registro` a
  `/auth/crear-cuenta`. `/cuenta` y `/admin` sin sesión llevan a
  `/auth/ingresar?next=...` y, tras entrar, vuelven a esa página.
- RF-26 El registro valida nombre (2+ letras), correo y contraseña (8+) y exige
  aceptar los términos; un correo ya registrado muestra error.
- RF-27 `/terminos` y `/privacidad` existen; la navegación inferior (móvil)
  tiene Inicio, Tiendas, Pedidos y Cuenta.

## 6. Fuera de alcance
- Pago en línea, notificaciones por correo, notas por ítem (el sabor de snacks
  y helados se elige en el mostrador).
- Asignación de roles desde la interfaz.

## 7. Criterios de aceptación clave
1. Visitante navega tiendas y busca productos sin sesión.
2. Comprador aparta un pedido con productos de dos tiendas y ve dos pedidos
   «Por pagar» en `/cuenta`; las existencias bajaron.
3. Comprador cancela un pedido y las existencias vuelven.
4. Comprador que entra a `/admin` ve el 403.
5. Admin de tienda confirma el pago y lleva un pedido hasta «Entregado».
6. Admin de tienda ajusta existencias y la tienda pública muestra el valor
   nuevo al recargar.
7. Admin de tienda crea un producto, lo edita y lo desactiva.
8. El admin de una tienda no ve ni modifica otras tiendas; el admin general
   ve todo en modo supervisión y no puede modificar nada.

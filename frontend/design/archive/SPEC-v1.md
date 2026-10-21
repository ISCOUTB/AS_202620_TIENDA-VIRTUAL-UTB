> **Archivado el 2026-10-21.** Versión 1 de la dirección de arte (menú troquelado). Sustituido por `../SPEC.md` v2, «Señalética de campus». Se conserva sin editar como registro de la decisión anterior.

# SPEC — Dirección de arte de la Tienda Virtual UTB

> **Fuente única de verdad del diseño.** Este documento es canónico: re-correr
> `draw.mjs --show` (directorio `.taste-skill/`) re imprime el sheet del que
> deriva, y cualquier cambio de paleta/tipo se hace primero aquí y luego en
> `app/tokens.css`. Las fases de construcción se guiaron por este spec.
>
> - **Dirección página (tienda):** `page-is-the-object` · seed **967880227** ·
>   drawn 2026-10-19 · sector `restaurant` · tone `editorial` · paleta conservada de la marca.
> - **Dirección app (admin/pedidos):** `Accent ladder` · seed **1033765725** ·
>   drawn 2026-10-19 · kind `smb-admin` · light · `--keep palette,type`.
> - **Redraws aplicados:** ninguno de paleta ni de familia tipográfica. El
>   tamaño *display* se re-mapeó (ver §3) para que el nombre entre en una línea
>   con una serif normal, como exige la regla de dos líneas.

## 1. La idea

> En esta página, **el menú impreso de la cafetería UTB y su ticket de compra**
> se convierten **en la propia página**: un sheet de papel con filas alineadas,
> precios tabulares y bordes troquelados, que el carrito convierte en un ticket
> que nunca se imprime dos veces.

- **Prueba del competidor:** Rappi/páginas genéricas de café son rejillas de
  tarjetas con carrito estándar; "el menú troquelado con su ticket idempotente"
  no les sirve — el artefacto es de esta cafetería.
- **El dato que solo este cliente tiene:** precios en centavos del contrato
  (`350000` = $3.500), existencias por producto separadas del catálogo, y la
  `Idempotency-Key` de S11: *un pedido = un ticket, nunca dos*.

**La cosa viva:** el menú con existencias en vivo — cada fila muestra las
unidades reales de hoy y el estado `Agotado` es honesto (cero se imprime como
cero); al señalar una fila, su foto aparece en el marco fijo (movimiento
firma). Con dedo/touch la foto va en línea en la propia fila.

## 2. Paleta (conservada de la marca UTB, mapeada a roles)

Una tierra, una tinta, un acento — dos o tres tintas planas como un trabajo a
dos tintas. Valores viven **solo** en `app/tokens.css` (verificado por
`npm run check:tokens`).

| Rol | Token | Valor | Uso |
|---|---|---|---|
| Tierra (ground) | `--tk-tierra` | `#f4f7f9` | Fondo de página (papel azulado — opción "hacia la tinte más pálida del acento") |
| Superficie | `--tk-superficie` | `#ffffff` | El sheet de papel, tarjetas, paneles admin |
| Superficie 2 | `--tk-superficie-2` | `#e9eff4` | Paso de tono entre superficies (nunca línea ni sombra) |
| Tinta | `--tk-tinta` | `#17324d` | Texto corrido; **ground oscuro del hero** |
| Tinta tenue | `--tk-tinta-tenue` | `#50677b` | Notas, descripciones, unidades |
| Acento (UTB) | `--tk-acento` | `#005aa9` | Acción sólida, dato principal, nav activa |
| Acento hondo | `--tk-acento-hondo` | `#00417d` | Hover/activo del acento |
| Tintas del acento | `--tk-acento-50/100/200` | `#f0f6fb` / `#dceafa` / `#bcd6f4` | Solo admin: áreas de "accent ladder" (nav activa, badges, tracks) |
| Estado | `--tk-ok` `--tk-aviso` `--tk-error` | `#1c7c49` `#9a6700` `#b3261e` | Estados de pedido/stock, 3–10% del color total |
| Línea | `--tk-linea` | `#d9e2ea` | Solo tablas/formularios admin (reglas de 1px permitidas ahí) |

Prohibido: gradientes, glass, sombras en reposo, violeta/indigo, crema+terracota.

## 3. Tipografía — Literata (una familia, dos pesos + itálica)

Literata: serif de pantalla con gran altura-x; los títulos son el propio texto
en peso medio y mayor tamaño. Se carga con `next/font/google` (subsets latin,
`display: "swap"`) — **la fuente debe estar realmente cargada** (el inspector
falla si cae al fallback).

| Paso | Rol | Valor |
|---|---|---|
| 1 · display | `h1` del hero | `clamp(3.5rem, 7.5vw, 7.25rem)` · peso 500 · tracking `-0.02em` · leading `1.05` |
| 2 · head | Títulos de sección | `clamp(2rem, 1.3rem + 3.2vw, 4rem)` · peso 500 |
| 3 · lead | Declaraciones/párrafos de entrada | `clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)` · 400 |
| 4 · body | Texto corrido (≥16px siempre) | `clamp(1.125rem, 1.05rem + 0.3vw, 1.3125rem)` · 400 · leading 1.6 |
| 5 · small | Notas, unidades, pies (mín. 13px) | `clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)` |

- Énfasis: peso 600 o itálica — **nunca** color/versalitas/subrayado en una palabra.
- Precios y cifras: **cifras tabulares** (`font-variant-numeric: tabular-nums`).
- Sentence case en todos los títulos; sin eyebrows ni etiquetas diminutas en caja alta.
- `--tk-font-titulo` = `--tk-font-texto` = Literata (una sola familia en toda la tienda).

**Ajuste de la regla de dos líneas:** `Tienda Virtual UTB` (18 caracteres) a
`10vw` no cabe en una línea con una serif normal ⇒ el paso display baja a
`7.5vw` (máx 115px a 1440) y entra a ~72% del ancho. En teléfono va a dos
líneas a `15vw` (permitido por blueprints).

## 4. Tienda (page run) — composición por secciones

**Marco:** un solo par de márgenes exteriores (`clamp(16px, 5vw, 32px)`),
`h1` en la primera pantalla, un título en cada sección, sin tramos vacíos de
más de media pantalla. Botones: una sola forma decidida aquí — **recto**
(`--tk-radio-btn: 0` para botones/acciones de la tienda), un solo radio de 4px
(`--tk-radio`) para paneles admin. Sin sombras en reposo; separación por paso de tono.

### 4.1 Hero — "Tabbed folder stack" (ground oscuro plano)
- Ground plano en `--tk-tinta` (sin foto detrás: decisión explícita).
- Fila superior 24px: wordmark **centrado** + un enlace de texto a la derecha.
- `h1` una línea centrada (display, peso 500, color `--tk-superficie`); debajo,
  oración de apoyo a 20px, centrada, `max-width: 46ch`.
- Desde ~51% de altura: pila de carpetas (bandas planas 86% del viewport,
  centradas, desfasadas 64px, cuya **pestaña trapecial con `clip-path`** lleva
  el nombre de una sección). Número de carpetas = secciones reales (3):
  «Menú», «Cómo pedir», «Preguntas». La carpeta delantera se sale por abajo y
  lleva la acción sólida «Ver el menú» (esquina superior izquierda, 32px).
- Teléfono: headline a 15vw dos líneas, carpetas desde 48svh, banda a 52px,
  pestañas 32px, botón a ancho completo.
- La forma de pestaña se repite en la esquina superior de los botones.

### 4.2 Sección «list» — El menú impreso (banda)
- Sheet de papel `--tk-superficie`, 640px, centrado, **bordes superior e
  inferior festoneados** (`clip-path`, ondas someras), 64px de padding,
  simétrico como una carta impresa.
- Dentro: nombre de sección 40–48px, nota de una línea 15px, **grupos** cada
  56px: nombre de grupo 22px centrado → filas 17px: producto a la izquierda
  (medida 420px), **precio a la derecha con cifras tabulares**, descripción de
  una línea 14px en tinta tenue. Alineación pura, sin puntos guía.
- Cada fila lleva su estado: `N disponibles` (small) o `Agotado` en
  `--tk-error`. Al señalar la fila → foto del producto en el marco fijo
  (firma). Teléfono: foto en línea en la fila.
- Detrás del sheet: **foto real a sangre** (set "Interior and table",
  preferencia 5 de la hoja) como ground de la banda.
- Cierre: horario en dos líneas centradas (small).
- **Foto de producto:** hotlink centralizado en `lib/mocks/imagenes.ts`
  (decisión del equipo: sin descargas; un solo archivo para reparar enlaces).

### 4.3 Sección «how-it-works» — Itinerario en un ticket (tabla)
- Slip de papel 420–480px en columnas 7–11, **borde inferior en zigzag**
  (`clip-path`), borde superior recto; título (2–4 palabras) + párrafo 30ch en
  columnas 1–5 alineados arriba con el slip.
- Filas del ticket: texto a la izquierda, **duración a la derecha con líder de
  puntos redondos de 4px** (tabular). Bajo encabezados en negrita.
- Fila final invertida (texto en papel sobre barra de tinta 44px): el resultado.
- Contenido (claim: «Pides en el mostrador digital, recoges entre clases»):
  1. «Eliges del menú» — `1 min` · 2. «Confirmas el pedido — *un solo ticket*» — `30 s`
  · 3. «Recoges en la cafetería con tu código» — `5–10 min`.
  Fila invertida: **«Total: menos de 10 minutos de espera»**.
- Teléfono: título y párrafo primero, slip a ancho completo − 16px.

### 4.4 Sección «faq» — Fichas con pestaña (stack)
- Título 2–4 palabras en columnas 3–10; **5 fichas superpuestas** (se ven 96px
  de cada una), cada una con pestaña de 200×40px que avanza 150px a la derecha
  (`clip-path`), rotando entre 2–3 colores de paleta (superficie / superficie-2
  / tinte del acento).
- Pregunta visible 20px medium; al elegir, la ficha se expande con la respuesta
  17px, máx. 50ch; **una abierta a la vez, la primera abierta al cargar**.
- Contenido: `Horario` («¿Hasta cuándo puedo pedir?») · `Pago` («¿Cómo pago?»)
  · `Agotados` («¿Y si se agota mientras pido?») · `Quiénes` («¿Quién puede
  pedir?») · `Datos` («¿Qué hacen con mis datos?»).
- Teléfono: fichas a ancho completo, 88px visibles, pestañas de 120px cada 48px.

### 4.5 Footer — «la vuelta del objeto»
Wordmark a ancho completo, nombre del proyecto con qué hace, equipo (4
integrantes con código institucional), **créditos de cada imagen con su
licencia/fuente**, y la nota de datos de muestra donde aplique.

### 4.6 Movimiento — «Index with preview» + capa completa
1. **Firma:** fila del menú → foto del producto en marco fijo, crossfade
   ~240ms exacto; otras filas se atenúan. Touch: foto en línea.
2. Entradas por sección: título → texto → imagen, escalón 60–90ms, suben
   16–32px con opacidad, una sola vez.
3. Feedback en todo control (hover/press/focus visible).
4. Movimiento solo con `transform`/`opacity` y fallback
   `prefers-reduced-motion` que conserva el contenido.

## 5. Admin (app run) — «Accent ladder» + shell «Ruled T-frame»

- **Movimiento del estilo:** el color UTB a full solo en marcas pequeñas
  (botón sólido único, serie de datos, ícono de nav activa); sus tintas pálidas
  hacen todo el trabajo de área (nav activa con tinte + texto oscuro, badges,
  tracks). Presupuesto de color 3–10%. Prohibido: tinte pleno en áreas
  grandes, segunda familia de acento, gradientes, barra de acento + tinte a la vez.
- **Rostro propio (elegido):** la escalera construida desde el hue de la marca
  (azul UTB) + **los objetos del producto en el bloque principal** (miniaturas
  40px de los productos reales) + tierra hacia la tinte más pálida (ya es
  `--tk-tierra`).
- **Shell:** sidebar 210–240px + topbar 64px con reglas de 1px, mismo ground;
  nav en pitch 40px (light) con labels sentence-case; la topbar lleva contenido
  real (búsqueda o nombre del objeto). Teléfono: topbar 48–56px + menú a
  pantalla completa.
- **Screens usados:** `list` (tabla con pestañas + toolbar) para
  `/admin/productos`, `/admin/inventario`, `/admin/pedidos`; `overview` (strip
  de KPIs 3–5 celdas + gráfico/rail) para `/admin`. Tabla: labels 12–13px gris
  sin relleno, filas 48–56px, números a la derecha con cifras tabulares, una
  marca de estado por fila, un kebab al final; sin zebra, sin tarjeta contenedora.
- **Elemento firma del brief:** *sell-out strip* — franja de productos
  agotados por hora de cierre con la distancia al cierre. Se construye con data
  mock hasta que el backend exponga movimientos; si no, se sustituye por el
  listado «Agotados hoy» con el mismo formato de fila.
- KPIs con dato real de `/metrics` y `/health/ready` en `/admin/salud`.
- Estados de datos honestos: ceros como cero, ausente como guion gris, vacío
  conserva su marco. Cero emojis, cero `01/02/03`, cero monospace fuera de
  código real.

## 6. Estados transversales (todas las vistas)

`live` → datos reales · `preview` → mock marcado como «datos de muestra» o
aviso «próximamente» si el backend responde 404/405/501 · caída de red →
error con reintento. Además: skeleton, vacío, `Agotado`, 401/403 (pedir
inicio de sesión / sin permiso). Fuente de verdad de qué endpoint vive:
`lib/api/endpoints.ts`.

## 7. Contrato — pendientes a ratificar por el backend (no bloquean el frontend)

1. `POST /orders` con header `Idempotency-Key` (docs/idempotencia-saga-s11.md).
2. `POST /catalog/products` y `PATCH /catalog/products/{id}` (docs/api/administracion-catalogo.md).
3. `GET /catalog/products/{id}` (detalle; ya en el YAML de diseño).
4. Cookie httpOnly para el JWT en vez de Bearer en localStorage (decisión de seguridad del equipo).

## 8. Puertas de verificación (idempotentes)

```bash
cd frontend
npm run verify   # gen:api + check:tokens + lint + typecheck + build
node <skill>/scripts/lint.mjs <archivos>
node <skill>/scripts/inspect.mjs <url>   # 0 FAIL en 1440/768/390
```

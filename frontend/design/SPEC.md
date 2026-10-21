# SPEC v3 — «Campus oscuro»

> **Fuente única de verdad del diseño.** Los valores viven en
> `frontend/app/tokens.css`; este documento explica **por qué** cada uno está
> ahí. Cualquier cambio de paleta o tipografía se decide primero aquí y luego se
> aplica a tokens. `npm run check:tokens` impide que aparezca un valor de color
> literal fuera de ese archivo.
>
> - **Versión:** 3 · 2026-10-21 · sustituye a `archive/SPEC-v2.md`.
> - **Dirección:** el lenguaje visual de la app oficial de la UTB —oscuro, azul
>   de marca y superficies redondeadas— aplicado a una tienda, no copiado de la
>   app.
> - **Alcance:** portada, tienda, pase (auth + cuenta), panel de cafetería y
>   documentos legales.
> - **Archivos que manda:** `app/tokens.css` (valores), `app/globals.css`
>   (capas, `.sabana`, `.tarjeta`, `.prosa`, utilidades).

## 0. Qué cambia respecto a la v2

La v2 («Señalética de campus») era un sistema de orientación: papel, bandas con
la esquina cortada, radio 0, tipografía editorial. Era coherente y propio, pero
no hablaba el idioma de la UTB: la universidad ya tiene una app, y un estudiante
que la usa a diario no reconocía en la tienda a la misma institución.

La v3 **adopta el lenguaje de esa app**: fondo oscuro, sábana azul de marca,
superficies redondeadas, una sola familia tipográfica y el carnet del pase. La
tienda pasa a ser «una pantalla más de la UTB». No se copia la app: se reusa su
vocabulario visual con contenido y estructura propios.

| v2 | v3 |
|---|---|
| Señalética de edificio | App institucional |
| Fondo claro, tintas profundas | **Todo oscuro**, sábana azul |
| Radio 0, esquinas cortadas | Radio 20/14/999, esquinas redondeadas |
| Dos familias (Archivo + Literata) | Una familia (**Archivo**) + serif solo en prosa legal |
| Un solo CTA ámbar | Sistema azul de la marca; ámbar reservado al acento |
| Sin sombras ni degradados | **Degradado de marca** y sombra suave en superficies |

Lo que **sobrevive** de la v2: la disciplina de tokens (una sola fuente de
color), los cinco puntos con tres acentos de tienda, la numeración `01`–`05`, el
estado de horario calculado en el servidor, y la honestidad con los precios no
confirmados (`esMuestra` / `noindex`).

## 1. La idea

> **La cafetería, dentro de la app que ya conoces.** El sitio entra por una
> sábana azul idéntica a la de la app oficial y no sale de su idioma: oscuro,
> redondeado, con la misma sensación de «esto es la UTB». Cinco puntos, un solo
> pase, y ninguna pantalla que parezca una plantilla de tienda.

- **Prueba del competidor:** cualquier plantilla de «tienda de comida» es clara,
  con tarjetas de sombra difusa y un carrito flotante. Un sitio oscuro de punta a
  punta con una sábana azul de marca, arcos concéntricos y un carnet no se
  confunde con eso.
- **El dato que solo este cliente tiene:** cinco puntos dentro de una sola
  cafetería, con precios en centavos del contrato (`350000` = $3.500) y
  existencias separadas del catálogo. El cero se imprime como cero.

**La cosa viva:** el estado del horario. «Abierto hasta las 8:00 p. m.» se
calcula en el servidor cada minuto (`revalidate = 60`) contra la zona de Bogotá.
Decide si el estudiante sale del salón.

## 2. Sistema visual

### 2.1 Color

Paleta derivada del azul del logo UTB, sin alterarlo. El sitio es oscuro de punta
a punta; las superficies claras son la excepción (el carnet) y nada más.

| Token | Valor | Rol |
|---|---|---|
| `--tk-tinta` | `#04060e` | **ground** del sitio |
| `--tk-navy` | `#0b1120` | panel profundo, sábana de sección |
| `--tk-tarjeta` | `#12161f` | superficie de tarjeta |
| `--tk-tarjeta-alta` | `#1c222e` | tarjeta elevada y controles |
| `--tk-deep` | `#03045e` | azul profundo de marca (carnet) |
| `--tk-sabana-1` | `#0b2bd6` | **sábana azul**: base del degradado |
| `--tk-sabana-2` | `#2b4dff` | sábana azul: alto del degradado |
| `--tk-azure` | `#0077b6` | enlaces, íconos |
| `--tk-cyan` | `#00b4d8` | acento Punto Fit; dato vivo |
| `--tk-cyan-claro` | `#90e0ef` | texto secundario sobre la sábana |
| `--tk-cyan-palido` | `#caf0f8` | superficie clara alterna (carnet) |
| `--tk-ambar` | `#ffc300` | acento Antojos; CTA sobre oscuro |
| `--tk-amarillo` | `#ffd60a` | **solo** foco de teclado y badge «nuevo» |
| `--tk-superficie` | `#ffffff` | texto principal sobre oscuro |
| `--tk-tenue` | `#9aa6b6` | texto secundario sobre oscuro |
| `--tk-linea` | `#232a36` | hairline de tarjeta y regla |
| `--tk-borde` | `#5c6b80` | borde de control |
| `--tk-ok` / `--tk-aviso` / `--tk-error` | `#22c55e` / `#f0b429` / `#ff7b72` | estado |
| `--tk-arco` / `--tk-halo` / `--tk-sombra` | `#ffffff14` / `#6f95ff40` / `#000000a6` | material de la sábana y profundidad |

**Reglas medidas, no supuestas** (contraste WCAG 2.1 sobre el fondo indicado):

- Texto principal sobre oscuro → `--tk-superficie` (blanco: **17.6** sobre
  tarjeta). Secundario → `--tk-tenue` (**6.9**). Acento de dato →
  `--tk-cyan-claro` (**11.3**).
- La sábana lleva un degradado `sabana-1 → sabana-2`. Sobre **cualquier** punto
  del degradado, blanco ≥ **4.6** y `--tk-cyan-claro` ≥ **4.5**: ambos son
  seguros para texto.
- `--tk-ambar` como texto sobre oscuro da **11.4**: vale como acento de dato; su
  uso preferente sigue siendo relleno con texto en `--tk-tinta` (**12.5**).
- `--tk-cyan` como texto sobre oscuro da **8.15**, bien. **Nunca** sobre claro
  (**2.46**, prohibido): sobre el carnet se usa como relleno.
- `--tk-error` (**6.2**) y `--tk-ok` (**6.9**) llevan siempre palabra al lado;
  el color no informa solo.
- `--tk-borde` (**3.4** sobre tarjeta) cumple 3:1 para componentes no textuales.

### 2.2 El logo

El logo UTB tiene versión **monocroma blanca** y este proyecto la usa sobre la
sábana azul y sobre el carnet, igual que la app oficial. Se obtiene del archivo
azul con el filtro `` [filter:brightness(0)_invert(1)] ``, nunca con una segunda
copia del archivo. Sobre el carnet claro se usa el archivo original.

### 2.3 Tipografía

Una sola familia para la interfaz, igual que la app, y una serif que solo aparece
en la prosa legal.

- **Archivo** (`100–900`, eje `wdth`) — display, títulos, rótulos y cifras.
- **Literata** — **únicamente** dentro de `.prosa` (`/terminos`, `/privacidad`).

Cuatro tratamientos, uno por tienda. Es el diferenciador que el color no puede
dar (solo hay tres acentos para cinco tiendas), y **ninguno usa serif**:

| Tienda | Tratamiento | Implementación |
|---|---|---|
| Antojos | **Condensada** | Archivo 800, caja alta, `font-stretch: 75%` |
| Punto Fit | **Limpia** | Archivo 400, tracking +0.02 em |
| Alegría | **Editorial** | Archivo 500 itálica |
| Almuerzo 01 / 02 | **Numerada** | Archivo 700, tracking −0.02 em |

Escala: `--tk-texto-base` … `--tk-display` con `clamp()`. Tailwind **no** infiere
longitud en `text-[var(--x)]`: para tamaños se usan las clases `.display`,
`.titulo` y `.titulo-seccion`, que ya leen los tokens.

### 2.4 Acabado y geometría

- **Radio:** `--tk-radio` 20 px (tarjetas y controles), `--tk-radio-sm` 14 px
  (chips y campos), `--tk-radio-sabana` 28 px (esquinas inferiores de la
  cabecera) y `--tk-radio-pill` 999 px (pills). Es la geometría redondeada de la
  app; sustituye al radio 0 de la v2.
- **Sombra:** `--tk-sombra` en superficies elevadas (panel del pedido). Una sola
  sombra, suave.
- **Degradado:** solo el de marca (`--tk-sabana-1 → --tk-sabana-2`) y el velo
  oscuro de las fotos. Nada de degradados decorativos de color.
- Sin `backdrop-filter`. Sin glass. Sin neón.

### 2.5 La sábana (`.sabana`)

Es la **firma** del sistema y lo primero que se ve en la app oficial. Un bloque
de cabecera con:

1. degradado de marca `sabana-1 → sabana-2`;
2. **arcos concéntricos** (`.arcos`) dibujados con `--tk-arco` sobre el degradado;
3. un **halo radial** (`--tk-halo`) descentrado;
4. esquinas inferiores de `--tk-radio-sabana`.

Se usa en la portada, en la cabecera de tienda, en `/auth/*`, en `/terminos` y
`/privacidad`, y en la imagen Open Graph (que reproduce el mismo degradado y los
mismos arcos dibujados como círculos, porque satori no soporta
`repeating-radial-gradient`).

### 2.6 El carnet (`.credencial`)

El pase de cuenta es la única superficie clara del sitio: `cyan-palido` sobre
`deep`, con las iniciales del usuario, su rol y el modo de sesión. Vive en
`/auth/*` y `/cuenta`, **nunca** en la tienda. La sábana azul le sirve de marco.

### 2.7 Movimiento

Dos únicas animaciones, sobre `transform`/`opacity`, apagadas con
`prefers-reduced-motion`:

- `aparecer`: entrada de sección (16 px, `--tk-dur-lenta`).
- Desplazamiento de 4 px en la flecha del directorio al pasar el cursor.

Nada más: sin parallax, sin contadores animados, sin typewriter.

### 2.8 Chrome y navegación

- **Barra superior** (`components/chrome/Nav.tsx`): una franja de `tinta`
  translúcida con desenfoque, el logo blanco, las tiendas y el acceso al pase.
  El desenfoque existe solo para sostener la legibilidad sobre la sábana
  mientras se hace scroll; es el único `backdrop-filter` del sitio.
- **Nav inferior flotante en móvil** (`NavInferior`, dentro del mismo módulo):
  cuatro destinos — **Inicio · Tiendas · Pedido · Pase** — con el carrito
  integrado como tercera pestaña. El pedido se abre desde cualquier pantalla con
  el evento `EVENTO_ABRIR_PEDIDO` (`abrirPedido()`), no con un estado global
  paralelo. En escritorio no existe.

## 3. Estructura de páginas

### `/` — portada

1. **Hero en sábana**: h1 «Cinco puntos. Un solo pase.», lead, CTA ámbar.
2. **Directorio solapado**: 5 filas (número, chip de acento, nombre, categoría,
   horario, flecha). Es navegación, no decoración; se solapa con la sábana.
3. **El lugar**: franja de 4 fotos reales.
4. **Las tiendas**: por cada tienda, ficha con su tratamiento + campo de color
   con su motivo mientras no haya foto asignada.
5. **Cómo funciona**: 3 pasos sobre oscuro.
6. **Tu pase**: credencial sobre la sábana.
7. **Preguntas**: `details/summary` nativos (funcionan sin JS).
8. **Cierre**: sábana con CTA.

### `/tiendas/[slug]`

Sábana con el nombre en su tratamiento + estado de horario en vivo. Columna
izquierda fija con la ficha, la foto (o el campo de color) y el CTA; derecha con
la carta como **filas**: nombre, presentación, descripción, sabores, existencias
y precio. El pedido se abre desde el nav inferior; en escritorio, desde la barra
del carrito.

### `/auth/ingresar`, `/auth/crear-cuenta`

Panel izquierdo en **sábana** con el logo blanco, el índice del corredor y el
horario; panel derecho oscuro con el formulario. Una sola columna en móvil, con
la sábana reducida a cabecera. El fallback de `Suspense` usa tarjetas, no
`clip-path`.

### `/cuenta`

Guard de sesión + el **carnet** (iniciales, rol, código, modo), pedidos y carrito
agrupado por tienda.

### `/admin`

Chrome propio (barra en `navy` con el logo blanco, sin navegación de tiendas).
KPIs, resumen por tienda y tabla de inventario con filtro y ajuste **en borrador
local**, marcado como tal: el endpoint de mutación no está publicado.

### `/terminos`, `/privacidad`

Sábana de cabecera + fondo `tinta`; el cuerpo es `.prosa` (la única serif del
sitio), a 74 ch. Sin ilustraciones.

## 4. Componentes

| Componente | Regla |
|---|---|
| `Boton` | 5 variantes: sólido, ámbar, claro, contorno, texto. Radio `--tk-radio-sm`. |
| `Badge` | Estado con texto obligatorio; el color nunca informa solo. |
| `Etiqueta` | Rótulo 13 px, caja alta, tracking 0.08 em. |
| `Campo` | Etiqueta arriba, línea inferior 2 px, error en texto + `role="alert"`. |
| `CampoFoto` | Campo de color con arcos y el motivo de la tienda mientras no haya foto. |
| `ProductoCard` | Fila de carta, no tarjeta. El precio es lo más grande de la fila. Acento por tienda. |
| `CarritoBarra` | Barra fija + panel; escucha `EVENTO_ABRIR_PEDIDO`; confirma contra `POST /orders`. |
| `NavInferior` | Nav flotante de móvil con el carrito integrado; no existe en escritorio. |
| `JsonLd` | Datos estructurados desde las mismas fuentes que el HTML; escapa `<`. |

## 5. Accesibilidad

- Contraste mínimo 4.5:1 en texto y 3:1 en componentes, verificado por token
  (§2.1).
- Foco visible siempre, en `--tk-amarillo`, `outline-offset: 2px`.
- Enlace «Saltar al contenido» en el layout público.
- `aria-current="page"` en el destino activo del nav.
- Todo control tiene nombre accesible (`aria-label` o texto visible).
- `prefers-reduced-motion` desactiva las dos animaciones.
- Los estados nunca dependen solo del color: siempre llevan palabra.

## 6. SEO y datos estructurados

- `metadataBase` y URLs absolutas desde `lib/seo.ts` (`NEXT_PUBLIC_SITIO_URL`).
- JSON-LD: `Organization` + `WebSite` (layout), `CafeOrCoffeeShop` + `Menu`
  (portada), `BreadcrumbList` + `ItemList` (tienda), `FAQPage` (portada).
- `sitemap.ts` incluye solo tiendas con `indexable: true`. Publicar precios sin
  confirmar en el índice sería desinformar: **Antojos, Punto Fit y Alegría quedan
  con `noindex` hasta que la tienda confirme sus precios**.
- `/cuenta`, `/admin` y `/auth/*` no se indexan (metadata + `robots.txt` +
  cabecera `X-Robots-Tag` desde el middleware).
- La imagen Open Graph se genera en `app/opengraph-image.tsx` leyendo
  `tokens.css` con `colorDeToken`: no hay una segunda copia de la paleta.

## 7. Prohibiciones

1. Colores fuera de `tokens.css` (lo verifica `npm run check:tokens`, incluso en
   comentarios; los `.svg` están exentos porque son autocontenidos).
2. Recolorear el logo UTB: solo el archivo original o su versión monocroma
   blanca por filtro.
3. Radios distintos de los cuatro tokens, o sombras distintas de `--tk-sombra`.
4. Degradados decorativos distintos del de marca; glass fuera de la barra
   superior; neón.
5. Serif fuera de `.prosa`.
6. Íconos de librería; solo SVG dibujado para este sitio.
7. Emojis en la interfaz.
8. Texto de relleno tipo «Lorem ipsum» o «Descubre la experiencia».
9. Inventar precios sin marcarlos como referencia.
10. Ocultar un producto agotado en lugar de decir «Agotado».
11. Fingir un pedido cuando el endpoint no existe.

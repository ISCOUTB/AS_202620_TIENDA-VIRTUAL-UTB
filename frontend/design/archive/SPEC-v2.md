# SPEC v2 — «Señalética de campus»

> **Fuente única de verdad del diseño.** Los valores viven en
> `frontend/app/tokens.css`; este documento explica **por qué** cada uno está
> ahí. Cualquier cambio de paleta o tipografía se decide primero aquí y luego
> se aplica a tokens. `npm run check:tokens` impide que aparezca un color
> literal fuera de ese archivo.
>
> - **Versión:** 2 · 2026-10-21 · sustituye a `archive/SPEC-v1.md`.
> - **Dirección:** señalética de campus — un sistema de orientación, no una
>   tienda online genérica.
> - **Alcance:** landing, tienda, pase (auth + cuenta), panel de cafetería.

## 0. Qué cambia respecto a la v1

La v1 proponía «el menú impreso y su ticket troquelado». Era coherente, pero
ponía el papel en el centro y dejaba el color y la tipografía en segundo plano.
La v2 invierte la jerarquía: **el campus es un lugar por el que uno se orienta**
y la cafetería es uno de sus destinos. El resultado se reconoce como UTB antes
de leer una sola palabra, y distingue cinco puntos con solo tres acentos de
color porque la identidad la carga la tipografía.

| v1 | v2 |
|---|---|
| Metáfora: papel impreso | Metáfora: señalética de edificio |
| Acento único ámbar | Tres acentos + sistema azul |
| Una familia tipográfica | Dos familias, cuatro tratamientos |
| Tarjetas con foto | Filas de carta + campos de color con motivo |
| Esquina recta | Una sola forma: banda con esquina superior derecha cortada |

El ticket troquelado **sobrevive** en un solo lugar: el pase de la cuenta
(`.troquel`, §2.6). Deja de ser la idea general y pasa a ser un detalle con
significado.

## 1. La idea

> **Lo que en el campus es un letrero, aquí es la interfaz.** Cinco puntos,
> cada uno con su banda de color, su número y su manera de escribir su nombre.
> El directorio de la portada es literalmente un directorio de edificio, y
> sirve: se puede tocar.

- **Prueba del competidor:** cualquier plantilla de «tienda de comida» usa
  rejilla de tarjetas, sombras suaves y un carrito flotante redondeado. Un
  sistema de señalética con radio 0, bandas cortadas y numeración de dos
  dígitos no se parece a eso, y no es un tema intercambiable.
- **El dato que solo este cliente tiene:** cinco puntos dentro de una sola
  cafetería, con precios en centavos del contrato (`350000` = $3.500) y
  existencias separadas del catálogo. El cero se imprime como cero.

**La cosa viva:** el estado del horario. «Abierto hasta las 8:00 p. m.» se
calcula en el servidor cada minuto (`revalidate = 60`) contra la zona de
Bogotá. No es un adorno: es la información que decide si el estudiante sale
del salón.

## 2. Sistema visual

### 2.1 Color

Paleta derivada del azul del logo UTB, sin alterarlo. Un ground profundo, un
primario, tres acentos y neutros derivados.

| Token | Valor | Rol |
|---|---|---|
| `--tk-tinta` | `#000814` | ground de marca, nav, footer, secciones oscuras |
| `--tk-navy` | `#001d3d` | panel elevado sobre tinta |
| `--tk-deep` | `#03045e` | **primario**: texto sobre claro, botón sólido, bandas |
| `--tk-azure` | `#0077b6` | enlaces, íconos, borde de foco secundario |
| `--tk-cyan` | `#00b4d8` | acento Punto Fit; dato vivo sobre oscuro |
| `--tk-cyan-claro` | `#90e0ef` | texto secundario sobre oscuro |
| `--tk-cyan-palido` | `#caf0f8` | superficie alterna; campo del pase |
| `--tk-ambar` | `#ffc300` | acento Antojos; **único CTA sobre oscuro** |
| `--tk-amarillo` | `#ffd60a` | solo foco de teclado y badge |
| `--tk-superficie` | `#ffffff` | fondo de contenido |
| `--tk-tinta-tenue` | `#44576a` | texto secundario sobre claro |
| `--tk-linea` | `#d7e6ef` | reglas decorativas |
| `--tk-borde` | `#6b8497` | borde de controles |

**Reglas medidas, no supuestas** (contraste WCAG sobre el fondo indicado):

- El azul del logo (`#093ad8`) **solo sobre claro**: blanco 8.05, `caf0f8`
  6.64. Sobre `#000814` da 2.50 y sobre `#001d3d` 2.10. **No existe versión
  invertida en la marca UTB y este proyecto no la crea**: en fondos oscuros
  va el wordmark tipográfico.
- `#00b4d8` como texto sobre blanco da 2.46: **prohibido**. Se usa como
  relleno o como texto sobre `#000814` (8.15).
- `#0077b6` sobre blanco da 4.02: solo UI o texto ≥ 24 px, nunca cuerpo.
- Ámbar y amarillo **siempre como relleno**; el texto encima va en `--tk-tinta`
  (12.5 / 14.2). Nunca como texto sobre claro.
- `--tk-borde` sobre blanco da 3.91: cumple 3:1 para componentes no textuales.

### 2.2 Tipografía

Dos familias variables, cargadas con `next/font` (sin FOUT por CDN externa):

- **Archivo** (`100–900`, eje `wdth`) — display, rótulos, cifras.
- **Literata** (`200–900`) — cuerpo editorial y citas.

Cuatro tratamientos, uno por tienda. Es el diferenciador que el color no puede
dar (solo hay tres acentos para cinco tiendas):

| Tienda | Tratamiento | Implementación |
|---|---|---|
| Antojos | **Condensada** | Archivo 800, caja alta, `font-stretch: 75%` |
| Punto Fit | **Limpia** | Archivo 400, tracking +0.02 em |
| Alegría | **Editorial** | Literata 500 itálica |
| Almuerzo 01 / 02 | **Numerada** | Archivo 700, tracking −0.02 em |

Escala: `--tk-texto-base` … `--tk-display` con `clamp()`. El h1 de la portada
usa `--tk-display` (hasta 96 px); los títulos de sección, `--tk-titulo-seccion`.

### 2.3 El motivo

**Una sola forma en todo el sitio:** banda con la esquina superior derecha
cortada (`clip-path`).

- `.corte` — esquina cortada. Marca lo **accionable** (botones, badges,
  campos de imagen).
- `.pestana` — cortes arriba a la izquierda y a la derecha. Marca lo
  **navegable** (pestañas, filas del directorio).
- Radio: **0 en todo el sitio**. Sin excepciones.
- Sin sombras, sin degradados de color, sin `backdrop-filter`, sin glass.

El foco de teclado vive en el wrapper `.recorte`, porque un `outline` dentro de
un elemento con `clip-path` se recorta y sería invisible (WCAG 2.4.7).

### 2.4 Profundidad

No hay profundidad simulada. La jerarquía se construye con:

1. **Ground**: oscuro (`tinta`) ↔ claro (`superficie` / `cyan-palido`).
2. **Escala**: un solo salto grande por sección.
3. **Reglas**: 1 px de `--tk-linea`; 2 px de `--tk-deep` en cabeceras de tabla.
4. **Numeración**: `01`–`05` en rótulos tabulares.

### 2.5 Movimiento

Dos únicas animaciones, ambas sobre `transform`/`opacity`, y ambas apagadas con
`prefers-reduced-motion`:

- `aparecer`: entrada de sección (16 px, 480 ms).
- Desplazamiento de 4 px en la flecha del directorio al pasar el cursor.

Nada más. Sin parallax, sin contadores animados, sin typewriter.

### 2.6 El pase

El único residuo del ticket de la v1: la tarjeta de acceso y de cuenta usa
`.troquel` (perforación de puntos al borde izquierdo) más la esquina cortada.
Aparece en `/auth/*` y `/cuenta`, nunca en la tienda.

## 3. Estructura de páginas

### `/` — portada

1. **Hero**: h1 «Cinco puntos. Un solo pase.», lead en Literata, CTA ámbar y
   **el directorio** (5 filas: número, chip de acento, nombre, categoría,
   horario, flecha). Es navegación, no decoración.
2. **El lugar**: franja de 4 fotos reales.
3. **Las tiendas**: por cada tienda, banda de señalética + ficha + campo de
   color con su motivo.
4. **Cómo funciona**: 3 pasos sobre oscuro, celdas separadas por 1 px.
5. **Tu pase**: 5 beneficios numerados sobre `cyan-palido`.
6. **Preguntas**: `details/summary` nativos (funcionan sin JS).
7. **Cierre**: banda `deep` con CTA ámbar.

### `/tiendas/[slug]`

Banda a sangre con el nombre en su tratamiento + estado de horario en vivo.
Columna izquierda fija con ficha y CTA; derecha con la carta como **filas**:
nombre, presentación, descripción, sabores, existencias y precio. Barra de
pedido fija cuando hay unidades.

### `/auth/ingresar`, `/auth/crear-cuenta`

Panel izquierdo oscuro con wordmark tipográfico, índice del corredor y una
franja de foto; panel derecho `cyan-palido` con el pase troquelado. Una sola
columna en móvil, con el panel oscuro reducido a franja.

### `/cuenta`

Guard de sesión + tarjeta del pase (iniciales, rol, código, modo), pedidos y
carrito agrupado por tienda.

### `/admin`

Chrome propio (barra oscura mínima, sin navegación de tiendas). KPIs, resumen
por tienda y tabla de inventario con filtro y ajuste **en borrador local**,
marcado como tal: el endpoint de mutación no está publicado.

### `/terminos`, `/privacidad`

Prosa a 74 ch, cabecera oscura, sin ilustraciones.

## 4. Componentes

| Componente | Regla |
|---|---|
| `Boton` | 5 variantes: sólido, ámbar, claro, contorno, texto. Siempre `.corte`. |
| `Badge` | Estado con texto obligatorio; el color nunca informa solo. |
| `Etiqueta` | Rótulo 13 px, caja alta, tracking 0.08 em. |
| `Campo` | Etiqueta arriba, línea inferior 2 px, error en texto + `role="alert"`. |
| `CampoFoto` | Campo de color con el motivo de la tienda mientras no haya foto. |
| `ProductoCard` | Fila de carta, no tarjeta. El precio es lo más grande de la fila. |
| `CarritoBarra` | Barra fija + panel; confirma contra `POST /orders`. |
| `JsonLd` | Datos estructurados desde las mismas fuentes que el HTML. |

## 5. Accesibilidad

- Contraste mínimo 4.5:1 en texto y 3:1 en componentes, verificado por token
  (§2.1).
- Foco visible siempre, en ámbar `#ffd60a`, `outline-offset: 2px`, fuera del
  `clip-path`.
- Enlace «Saltar al contenido» en el layout público.
- `aria-current="page"` en la tienda activa del nav.
- Todo control tiene nombre accesible (`aria-label` o texto visible).
- `prefers-reduced-motion` desactiva las dos animaciones.
- Los estados nunca dependen solo del color: siempre llevan palabra.

## 6. SEO y datos estructurados

- `metadataBase` y URLs absolutas desde `lib/seo.ts` (`NEXT_PUBLIC_SITIO_URL`).
- JSON-LD: `Organization` + `WebSite` (layout), `CafeOrCoffeeShop` + `Menu`
  (portada), `BreadcrumbList` + `ItemList` (tienda), `FAQPage` (portada).
- `sitemap.ts` incluye solo tiendas con `indexable: true`. Publicar precios sin
  confirmar en el índice sería desinformar: **Antojos, Punto Fit y Alegría
  quedan con `noindex` hasta que la tienda confirme sus precios**.
- `/cuenta`, `/admin` y `/auth/*` no se indexan (metadata + `robots.txt` +
  cabecera `X-Robots-Tag` desde el middleware).
- La imagen Open Graph se genera en `app/opengraph-image.tsx` leyendo
  `tokens.css`: no hay una segunda copia de la paleta.

## 7. Prohibiciones

1. Colores fuera de `tokens.css`.
2. Versión invertida o recoloreada del logo UTB.
3. Radio de borde distinto de 0.
4. Sombras, degradados de color, glass o neón.
5. Íconos de librería; solo SVG dibujado para este sitio.
6. Emojis en la interfaz.
7. Texto de relleno tipo «Lorem ipsum» o «Descubre la experiencia».
8. Inventar precios sin marcarlos como referencia.
9. Ocultar un producto agotado en lugar de decir «Agotado».
10. Fingir un pedido cuando el endpoint no existe.

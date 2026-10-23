# SPEC v4 — «Azul de marca, claro y oscuro»

> **Fuente única de verdad del diseño.** Los valores viven en
> `frontend/app/tokens.css`; este documento explica **por qué** cada uno está
> ahí. `pnpm run check:tokens` impide que aparezca un color literal fuera de ese
> archivo.
>
> - **Versión:** 4 · 2026-10-22 · sustituye a `archive/SPEC-v3.md`.
> - **Referencia visual:** artefacto «Tienda UTB rediseño», dirección A
>   («Azul de marca»): Inicio móvil, Tienda móvil, Carrito móvil, Inicio
>   escritorio (con la banda «La cuenta»), Tienda escritorio y Carrito
>   escritorio.
> - **Archivos que mandan:** `app/tokens.css` (valores), `app/globals.css`
>   (utilidades de Tailwind, `.sabana`, `.esqueleto`, `.prosa`, revelado y
>   View Transitions), `lib/movimiento.ts` (GSAP), `lib/tema.ts` (tema).

## 0. Qué cambia respecto a la v3

| v3 «Campus oscuro» | v4 «Azul de marca» |
|---|---|
| Solo oscuro | **Claro y oscuro**, con preferencia del sistema y elección guardada |
| Archivo + Literata | **DM Sans** (interfaz) + **Fraunces** (títulos) |
| Tres acentos para cinco tiendas | **Un acento por tienda** (ámbar, verde, violeta, cian, azul) |
| Productos como filas | Tarjetas con foto 4:3 (filas en móvil, como el artefacto) |
| Carrito en barra + modal | **Panel lateral** en escritorio, **hoja inferior** en móvil |
| Dos animaciones CSS | **GSAP** con reglas fijas y movimiento reducido |
| Estados de carga ad hoc | **Esqueletos** con tokens del tema, sin salto de maquetación |

Sobrevive: la disciplina de tokens, la honestidad con precios no confirmados
(«Referencia», `noindex`), «Agotado» nunca se esconde, el horario calculado en
el servidor y el modo demostración cuando la API no responde.

## 1. La idea

La tienda abre siempre con la **sábana azul** de la marca (degradado con un
brillo cian en la esquina) y la barra flota encima. Debajo, superficies
redondeadas, claras u oscuras según el tema, con una tarjeta que se solapa con
la sábana. Cada tienda se reconoce por su **acento** y su **ícono**, nunca solo
por el color.

## 2. Sistema visual

### 2.1 Color

Primitivas (`--tk-p-*`) una sola vez; semánticas con valor claro en `:root` y
oscuro en `:root[data-theme="dark"]` (copiado en `@media
(prefers-color-scheme: dark)` para cuando no hay JavaScript).

| Token | Claro | Oscuro | Rol |
|---|---|---|---|
| `--tk-fondo` | `#f3f5fa` | `#050a1c` | ground |
| `--tk-tarjeta` | `#ffffff` | `#0b1230` | tarjetas, hojas, pie |
| `--tk-suave` / `-2` | `#f1f4fb` / `#eaeef8` | `#121b3d` | chips, pasos, control segmentado |
| `--tk-tinta` | `#0a1330` | `#f1f4ff` | texto |
| `--tk-tenue` | `#4b5672` | `#a6b1d3` | texto secundario |
| `--tk-linea` | `#e1e6f0` | `#223060` | hairline |
| `--tk-borde` | `#7d88a1` | `#5d6ea6` | borde de control (3:1) |
| `--tk-enlace` | `#093ad8` | `#80c0ff` | enlaces, acento de texto |
| `--tk-primario` | `#093ad8` | `#093ad8` | botón principal (texto blanco 7.6:1) |
| `--tk-primario-suave` | `#e7edfd` | `#16246a` | control de cantidad, pestaña activa |
| `--tk-aviso` | `#8a5a00` | `#ffd266` | «Últimas N», referencia |
| `--tk-sabana` | degradado `#0a3fe0 → #0018c9` + brillo | `#0a2fb0 → #030b45` + brillo tenue | cabecera de cada página |
| `--tk-banda` | `#0a1330` | `#0b1230` + filo `#223060` | banda «La cuenta» (siempre oscura) |
| `--tk-carnet*` | blanco, tinta, azul | igual | el carnet es plástico claro en ambos temas |

**Acentos de tienda** (`--tk-t-<tienda>`, `-sobre`, `-suave`, `-tinta`; en
código, `paletaTienda(slug)` de `lib/tiendas.ts`):

| Tienda | Relleno | Texto encima | Suave claro / oscuro |
|---|---|---|---|
| Antojos | `#ffbc15` | negro | `#fff2cc` / `#33280a` |
| Punto Fit | `#71ec37` | negro | `#e2fbd6` / `#14321a` |
| Alegría | `#6259e2` | blanco | `#e6e4ff` / `#1f1c4d` |
| Almuerzo 01 | `#70f2fc` | negro | `#d9fcff` / `#0c3438` |
| Almuerzo 02 | `#093ad8` | blanco | `#e7edfd` / `#16246a` |

El acento es **relleno**; como texto se usa su `-tinta` (≥ 4.5:1 sobre su
`-suave`). Sobre la sábana solo va blanco. El foco (`--tk-foco`) es azul sobre
superficies y blanco dentro de la sábana.

### 2.2 El logo

Archivo azul original sobre claro y sobre el carnet; versión blanca por
filtro sobre la sábana (`[filter:brightness(0)_invert(1)]`) y, en el pie,
`--tk-logo-filtro` (ninguno en claro, blanco en oscuro). Nunca otra copia.

### 2.3 Tipografía

- **DM Sans** (variable, `next/font`) — interfaz, cuerpo, cifras.
- **Fraunces** 600 (variable) — titular, títulos de sección, nombres de
  tienda, «Tu pedido», nombre del carnet.
- Monoespaciada del sistema solo para códigos (carnet, ids).

Escala: `.display` 34 → 68 px, `.titulo` 34 → 52, `.titulo-seccion`
22 → 32, `.lead` 16 → 18, `.rotulo` 13 px caja alta +0.06 em.

### 2.4 Geometría

Radios: 12 (miniaturas), 14 (campos, franjas), 18 (botón de bloque,
preguntas), 24 (tarjetas), 28 (hojas), 32 (cabeceras con foto), pill.
Sombras: `--tk-sombra` (tarjeta elevada), `-alta` (flotantes), `-primaria`
(barra «Ver pedido»), `-hoja` (panel), `-carnet`. Contenedor de 1200 px con
márgenes de 16 px a 320 px y 24 px en escritorio.

### 2.5 La sábana (`.sabana` + `.bajo-nav`)

Degradado de marca con brillo cian en la esquina superior derecha. Abre
**todas** las páginas: la barra (`Nav`) flota encima, transparente, con texto
blanco. La primera sección de contenido se solapa (−32 px en móvil, −64 px en
escritorio) con esquinas de 28/32 px.

### 2.6 El carnet (`components/auth/Carnet.tsx`)

Proporción de tarjeta (1.586:1), franja azul arriba, anillo decorativo,
logo, iniciales sobre azul, nombre en Fraunces, código monoespaciado, rol y
código de barras decorativo. Inclinado −2.5° en la banda «La cuenta» y en
`/cuenta`.

### 2.7 Chrome y navegación

- **Barra superior** (`Nav`): logo, enlaces de sección (Tiendas · Cómo
  funciona · La cuenta · Preguntas; en una tienda, «Todas las tiendas»),
  pedido con contador, tema e «Ingresar». Bajo `lg` los enlaces van a un
  **menú desplegable** (diálogo, Escape, foco, GSAP).
- **Navegación inferior** (`NavInferior`, solo móvil): Inicio · Tiendas ·
  Pedidos · Cuenta; activo con pastilla azul suave.
- **Barra «Ver pedido»** (`BarraPedido`): con unidades; sobre la navegación
  inferior en móvil, abajo a la derecha en escritorio (salvo en una tienda,
  donde manda el resumen lateral).
- **Pedido** (`PanelPedido`): global, se abre con `abrirPedido()`.

### 2.8 Movimiento (GSAP)

Dependencias: `gsap@3.12.5`, `@gsap/react@2.1.1`. Todo pasa por
`lib/movimiento.ts`, que registra `useGSAP` y `ScrollTrigger` y fija los
números:

| Uso | Duración | Curva | Detalle |
|---|---|---|---|
| Entrada de sección (`Revelar`) | 0.6 s | `power2.out` | opacidad + 16 px, escalón 0.06 s, al llegar al 88 % del viewport |
| Menú, panel del pedido | 0.42 s / salida 0.28 s | `power3.out` / `power2.in` | velo + deslizamiento (lateral en `lg`, desde abajo en móvil) |
| Confirmación de «agregar» | 0.45 s | `back.out(3)` | rebote de escala del control y del contador del pedido |
| Cambio de pestaña de la carta | 0.48 s | `power2.out` | tarjetas escalonadas |
| Revelado del tema | 0.7 s | `power2.out` | ver §2.9 |

Reglas:

1. Solo `transform` y `opacity`. Nada anima `width`, `height`, `top`…
2. Siempre `useGSAP` con `scope` (contexto acotado, se revierte al
   desmontar) y solo en componentes de cliente.
3. Siempre `gsap.matchMedia()` con `CONDICIONES`: con
   `prefers-reduced-motion: reduce` no hay tween, todo queda en su estado
   final.
4. Sin parpadeo del HTML del servidor: el script inicial pone
   `data-motion="si"` y CSS oculta los `[data-revelar]` hasta que GSAP marca
   `data-revelado` en el mismo fotograma; si el JavaScript no llega, una
   animación de respaldo los muestra a los 2.5 s.
5. Hover sin GSAP: `.levanta` (−3 px y sombra) en CSS, solo con `hover:hover`.

### 2.9 Tema claro / oscuro con revelado circular

- **Sin destello:** `lib/tema-inicial.ts` → script en línea en `<head>` que
  fija `data-theme` antes del primer pintado (elección guardada en
  `localStorage["tvutb.tema"]` dentro de `try/catch`; si no, el sistema).
- **Botón** (`BotonTema`): el ícono lo decide CSS (`.solo-claro` /
  `.solo-oscuro`), así no se equivoca durante la hidratación.
- **Revelado** (`lib/tema.ts → alternarTema`):
  1. centro del botón (x, y) y radio = distancia a la esquina más lejana;
  2. `document.startViewTransition()` captura el tema viejo y cambia
     `data-theme`;
  3. globals.css apaga el fundido por defecto
     (`::view-transition-old/new(root) { animation: none }`);
  4. se anima `clip-path: circle(r at x y)` de 0 al radio sobre
     `::view-transition-new(root)` con la Web Animations API, con fotogramas
     muestreados de la curva GSAP `power2.out` (0.7 s). Dentro del círculo,
     tema nuevo; fuera, el viejo.
- **Respaldo:** sin `startViewTransition` o con movimiento reducido, cambio
  instantáneo. Mientras cambia, `.tema-cambiando` congela las transiciones de
  color para que nada «parpadee» por su cuenta.
- Sin elección guardada, la página sigue al sistema también en vivo.

### 2.10 Esqueletos

`components/ui/Esqueleto.tsx`: bloque base `.esqueleto` (color
`--tk-esqueleto`, brillo `--tk-esqueleto-brillo` que se desliza con
`transform`; sin brillo con movimiento reducido) y variantes que copian la
caja del contenido: tarjeta de producto (fila en móvil, tarjeta desde `sm`),
tarjeta de tienda, filas, cabecera de detalle, tabla, formulario; además
`EsqueletoCuenta` y `EsqueletoAdmin`. Se usan en los `loading.tsx` de
`(public)`, `tiendas/[slug]`, `cuenta`, `auth` y `admin`, en el `Suspense` de
`/auth/ingresar` y en los estados de carga de cliente (sesión, carrito,
borrador de inventario). El contenedor anuncia la carga con `aria-busy` y un
texto para lectores de pantalla; los bloques son `aria-hidden`.

## 3. Páginas

| Ruta | En el artefacto | Composición |
|---|---|---|
| `/` | Sí (móvil y escritorio) | Sábana con titular, buscador y foto · «Elige tienda» solapada (fichas en móvil, tarjetas desde `md`) · promo (móvil) · «Lo más pedido» (carrusel en móvil, rejilla en escritorio) · «Cómo funciona» · banda «La cuenta» con carnet y 5 beneficios · Preguntas |
| `/tiendas/[slug]` | Sí | Sábana con las cinco pastillas · cabecera con foto y velo, categoría, nombre, chips · nota · carta con «Para uno / Para compartir» (si hay de los dos) · resumen «Tu pedido» en `lg` |
| Pedido | Sí | Hoja inferior / panel lateral: líneas con cantidad, franja horaria (radios nativos), nota de pago, total, «Apartar para las …», confirmación real o demostración |
| `/cuenta` | No (mismo lenguaje) | Sábana · tarjeta con saludo, carnet real, estados y acciones · pedidos · carrito por tienda |
| `/auth/*` | No | Sábana lateral (arriba en móvil) con las cinco tiendas · formulario en tarjeta |
| `/admin` | No | Sábana compacta · cabecera · 4 KPI · tiendas · tabla de inventario con borrador local |
| `/terminos`, `/privacidad` | No | Sábana · `.prosa` en tarjeta solapada |
| 404, error | No | Pantalla completa en sábana con código en Fraunces y salidas |

La búsqueda de la portada filtra el catálogo del propio frontend
(`buscarProductos`): no hay endpoint de búsqueda y no se inventa.

## 4. Componentes

| Componente | Regla |
|---|---|
| `Boton` | primario, claro, oscuro, suave, contorno, texto · 44 px (56 px `lg`) · `cuadrado` = radio 18 |
| `Badge` | pill de 24 px; el color nunca informa solo |
| `Campo` | rótulo arriba, control de 52 px, error en texto con `role="alert"` |
| `Icono` / `IconoTienda` | trazo propio, `currentColor`, siempre `aria-hidden` |
| `MarcadorFoto` | campo suave de la tienda con rayado e ícono mientras no haya foto |
| `ProductoCard` | fila (móvil) / tarjeta (`sm+`); «Agregar» → control de cantidad |
| `Cantidad` | «− n +», botones de 44×44 |
| `TarjetaTienda` | foto 16:10, ficha con ícono montada, categoría, nombre, frase |
| `CartaTienda` | pestañas ARIA + rejilla |
| `PanelPedido`, `BarraPedido`, `ResumenPedido` | §2.7 |
| `BuscadorProductos` | `role="search"`, resultados como enlaces, estado vivo |
| `Carnet` | §2.6 |
| `Revelar` | §2.8 |
| `BotonTema` | §2.9 |

## 5. Accesibilidad

- Contraste ≥ 4.5:1 en texto y ≥ 3:1 en componentes, en los dos temas.
- Foco visible siempre (3 px, `--tk-foco`, blanco sobre la sábana).
- Objetivos táctiles ≥ 44 px; navegación inferior de 56 px.
- «Saltar al contenido», `aria-current` en navegación, diálogos con
  `aria-modal`, Escape y foco atrapado/devuelto.
- `prefers-reduced-motion`: sin GSAP, sin brillo de esqueleto, sin círculo.
- Sin desplazamiento horizontal de página de 320 px en adelante: las filas
  que se deslizan (`.fila-desliza`) lo hacen dentro de su caja.

## 6. Prohibiciones

1. Colores fuera de `tokens.css` (`pnpm run check:tokens`).
2. Recolorear el logo UTB fuera de su versión blanca por filtro.
3. Animar propiedades de maquetación o animar sin `matchMedia`.
4. Íconos de librería, emojis, texto de relleno.
5. Inventar precios sin marcarlos como referencia o esconder un agotado.
6. Fingir un pedido o un endpoint que no existe.

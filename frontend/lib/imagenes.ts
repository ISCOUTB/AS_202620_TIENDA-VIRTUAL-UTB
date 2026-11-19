/**
 * Imágenes — ÚNICO lugar donde viven las rutas de fotos.
 *
 * Las 13 fotos originales se movieron de `src/` (donde vivían junto al
 * código) a `public/img/` con nombres ASCII y numeración estable:
 *   src/WhatsApp Image 2026-10-21 at 7.56.05 AM (1).jpeg → cafeteria-01.jpg
 *   … y así hasta cafeteria-13.jpg
 *
 * El `alt` de cada foto describe lo que muestra. Como el equipo todavía no
 * ha asignado cada foto a una tienda, aquí se usa un alt honesto y genérico;
 * al mapearlas se reemplaza el texto y se rellena `FOTO_TIENDA`.
 *
 * `FOTO_TIENDA` vacío = la tienda usa el campo de color diseñado (ver
 * components/tienda/MarcadorFoto.tsx), no una caja gris.
 */

import type { SlugTienda } from "./tiendas";

export type Foto = { src: string; alt: string };

const RUTA = "/img";

/** Las 13 fotos de la cafetería, en orden estable. */
export const FOTO_CAFETERIA: Foto[] = Array.from({ length: 13 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    src: `${RUTA}/cafeteria-${n}.jpg`,
    alt: `Foto de la cafetería UTB (${n})`,
  };
});

/**
 * Foto principal de cada tienda. Se completa cuando el equipo asigne las
 * fotos; hasta entonces la tienda usa su campo de color con el motivo.
 */
export const FOTO_TIENDA: Partial<Record<SlugTienda, Foto>> = {};

export function fotoTienda(slug: SlugTienda): Foto | null {
  return FOTO_TIENDA[slug] ?? null;
}

/**
 * Logo institucional.
 *
 * El archivo es la versión azul sobre transparente. Sobre fondos oscuros se
 * usa su versión monocroma blanca, como en la app oficial de la UTB, mediante
 * el filtro de los componentes (SPEC v3). Sobre el carnet se usa tal cual.
 */
export const LOGO = {
  src: "/utb-logo.png",
  alt: "Universidad Tecnológica de Bolívar",
  ancho: 616,
  alto: 301,
} as const;

/** Selección fija para la franja "El lugar" de la landing. */
export const FOTOS_LUGAR: Foto[] = FOTO_CAFETERIA.slice(0, 4);

/**
 * Fotos de producto recortadas, sin fondo (`public/img/productos/*.webp`):
 * lienzo transparente 4:5 con el producto centrado, como las fotos de
 * estudio de un catálogo. Son imágenes de referencia del producto, no fotos
 * tomadas en la cafetería.
 *
 * El nombre del archivo es el `slug` del producto; las presentaciones de un
 * mismo producto (grande/pequeño, medio/entero) y los repetidos entre tiendas
 * comparten foto vía `ALIAS_FOTO`.
 */
const FOTOS_PRODUCTO = new Set<string>([
  "arroz-la-placita",
  "arroz-la-valenciana",
  "arroz-oriental",
  "banano",
  "bombombum-bolsa",
  "bombombum-personal",
  "cheetos",
  "chicles-trident",
  "choco-break-bolsa",
  "choco-break-personal",
  "chocolatina-jett",
  "chow-mein",
  "cocosette",
  "de-todito",
  "doritos",
  "fresas-con-crema",
  "galletas-bridge",
  "galletas-festival",
  "gaseosa-cocacola",
  "gaseosa-pepsi",
  "gaseosa-postobon",
  "gol-chocolate-mani",
  "golpe-con-todo",
  "granola-yogur-griego",
  "granola",
  "hatsu",
  "helado-chocolate",
  "helado-combinado",
  "helado-fresa",
  "helado-vainilla",
  "helado-yogur-griego",
  "jugos-hit",
  "jugos",
  "kraks-mani",
  "manzana",
  "mecatos",
  "pastas-verduras",
  "pera",
  "pina",
  "platanos-maduros",
  "platanos",
  "pollo-agridulce",
  "pollo-frito",
  "sandwich",
  "submarinos",
  "te",
  "wrap-pollo",
]);

const ALIAS_FOTO: Record<string, string> = {
  "de-todito-grande": "de-todito",
  "de-todito-pequeno": "de-todito",
  "pollo-frito-entero": "pollo-frito",
  "pollo-frito-medio": "pollo-frito",
  "arroz-la-placita-media": "arroz-la-placita",
  "arroz-la-placita-entero": "arroz-la-placita",
  "jugos-alegria": "jugos",
  "te-alegria": "te",
  // Productos que solo vienen de la API: comparten la foto de referencia
  // más cercana. Café y empanada aún no tienen recorte (usan el logo).
  "sandwich-mixto": "sandwich",
  "jugo-de-naranja": "jugos",
};

/** Ruta de la foto recortada del producto, o `null` si aún no tiene. */
export function fotoProducto(slug: string): string | null {
  const clave = ALIAS_FOTO[slug] ?? slug;
  return FOTOS_PRODUCTO.has(clave) ? `${RUTA}/productos/${clave}.webp` : null;
}

/**
 * Portada de cada tienda en su página y en su tarjeta: una foto de la
 * cafetería elegida por lo que muestra (el letrero o el mostrador de esa
 * tienda) y su encuadre. Conserva el `alt` genérico y honesto de la foto: no
 * afirma que sea una foto oficial de la tienda. Cuando el equipo asigne fotos
 * propias (`FOTO_TIENDA`), esas mandan.
 */
const PORTADA_TIENDA: Record<SlugTienda, { indice: number; encuadre: string }> = {
  antojos: { indice: 1, encuadre: "object-[center_30%]" },
  "punto-fit": { indice: 2, encuadre: "object-[25%_35%]" },
  alegria: { indice: 2, encuadre: "object-[85%_35%]" },
  "almuerzo-01": { indice: 10, encuadre: "object-center" },
  "almuerzo-02": { indice: 12, encuadre: "object-[center_60%]" },
};

export function portadaTienda(slug: SlugTienda): Foto & { encuadre: string } {
  const propia = fotoTienda(slug);
  if (propia) return { ...propia, encuadre: "object-center" };
  const { indice, encuadre } = PORTADA_TIENDA[slug];
  return { ...FOTO_CAFETERIA[indice], encuadre };
}

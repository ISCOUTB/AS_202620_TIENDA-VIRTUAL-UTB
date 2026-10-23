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

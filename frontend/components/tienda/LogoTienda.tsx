import type { SlugTienda } from "@/lib/tiendas";

/**
 * Logo de cada tienda (SPEC v5 §2.2): un monograma en minúsculas dentro de un
 * círculo de su acento, con un anillo interior fino. Reemplaza a los íconos
 * de trazo: a 24 px un ícono se vuelve una mancha, un monograma se sigue
 * leyendo, y juntos funcionan como las burbujas de marca de una app de
 * domicilios.
 *
 * - Antojos `an` · Punto Fit `.fit` (el punto del nombre) · Alegría `al` ·
 *   Almuerzo 01 `01` · Almuerzo 02 `02`.
 * - SVG con `viewBox` fijo: el tamaño de letra escala con el círculo, así un
 *   solo componente sirve de 20 a 96 px.
 * - Decorativo por defecto (el nombre siempre está al lado). Con `etiqueta`
 *   se vuelve imagen con nombre accesible.
 */
type Marca = { texto: string; tamano: number; fondo: string; tinta: string; anillo: string };

// Clases completas y literales: Tailwind solo genera las que ve escritas.
const MARCA: Record<SlugTienda, Marca> = {
  antojos: { texto: "an", tamano: 44, fondo: "fill-antojos", tinta: "fill-antojos-sobre", anillo: "stroke-antojos-sobre" },
  "punto-fit": { texto: ".fit", tamano: 36, fondo: "fill-fit", tinta: "fill-fit-sobre", anillo: "stroke-fit-sobre" },
  alegria: { texto: "al", tamano: 44, fondo: "fill-alegria", tinta: "fill-alegria-sobre", anillo: "stroke-alegria-sobre" },
  "almuerzo-01": { texto: "01", tamano: 40, fondo: "fill-alm1", tinta: "fill-alm1-sobre", anillo: "stroke-alm1-sobre" },
  "almuerzo-02": { texto: "02", tamano: 40, fondo: "fill-alm2", tinta: "fill-alm2-sobre", anillo: "stroke-alm2-sobre" },
};

export function LogoTienda({
  slug,
  tamano = 40,
  etiqueta,
  className = "",
}: {
  slug: SlugTienda;
  tamano?: number;
  /** Nombre accesible; sin él el logo es decorativo. */
  etiqueta?: string;
  className?: string;
}) {
  const m = MARCA[slug];
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 100 100"
      role={etiqueta ? "img" : undefined}
      aria-label={etiqueta}
      aria-hidden={etiqueta ? undefined : true}
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <circle cx="50" cy="50" r="50" className={m.fondo} />
      <circle cx="50" cy="50" r="45" fill="none" strokeWidth="1.5" className={`${m.anillo} opacity-25`} />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={m.tamano}
        fontWeight={800}
        letterSpacing="-1.5"
        className={`${m.tinta} font-display`}
      >
        {m.texto}
      </text>
    </svg>
  );
}

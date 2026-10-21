import type { Acento, SlugTienda } from "@/lib/tiendas";

/**
 * Campo de color con el motivo de la tienda (design/SPEC.md v3 §2.4).
 *
 * Existe porque las 13 fotos todavía no están asignadas a cada tienda. En
 * lugar de una caja gris de "imagen no disponible" —el tic más obvio de un
 * sitio inacabado— cada tienda muestra su acento, los arcos concéntricos de
 * la app y su propio motivo. Cuando el equipo asigne las fotos en
 * lib/imagenes.ts, este componente se reemplaza por next/image sin tocar el
 * resto.
 *
 * Ningún color literal: todo sale de las utilidades de tokens.
 */

const FONDO: Record<Acento, string> = {
  ambar: "bg-ambar",
  cyan: "bg-cyan",
  azul: "gradiente-marca",
};

const TINTA: Record<Acento, string> = {
  ambar: "text-tinta",
  cyan: "text-tinta",
  azul: "text-superficie",
};

export function CampoFoto({
  acento,
  slug,
  nombre,
  className = "",
  compacto = false,
}: {
  acento: Acento;
  slug: SlugTienda;
  nombre: string;
  className?: string;
  compacto?: boolean;
}) {
  return (
    <div
      className={[
        "@container relative isolate overflow-hidden rounded-[var(--tk-radio)]",
        FONDO[acento],
        TINTA[acento],
        compacto ? "aspect-[4/3]" : "aspect-[3/2]",
        className,
      ].join(" ")}
      role="img"
      aria-label={`Motivo de ${nombre}: ${descripcionMotivo(slug)}`}
    >
      <span aria-hidden="true" className="arcos absolute inset-0" />
      <Motivo slug={slug} />
      <span
        aria-hidden="true"
        className={[
          "absolute bottom-5 left-5 right-5 font-display font-extrabold uppercase leading-[0.85] tracking-[-0.03em]",
          // cqw: el nombre se ajusta al ancho del propio campo, no al viewport.
          "text-[clamp(1.5rem,15cqw,4.5rem)]",
        ].join(" ")}
      >
        {nombre}
      </span>
    </div>
  );
}

function descripcionMotivo(slug: SlugTienda): string {
  switch (slug) {
    case "antojos":
      return "la bolsa del estante";
    case "punto-fit":
      return "el punto";
    case "alegria":
      return "el swirl del helado";
    default:
      return "la bandeja";
  }
}

/** Los cuatro motivos, dibujados con currentColor (sin hex). */
function Motivo({ slug }: { slug: SlugTienda }) {
  const comun = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-[0.22]"
    >
      {slug === "antojos" ? (
        <g {...comun}>
          <path d="M18 34h64l-6 52H24z" />
          <path d="M36 34c0-10 5-16 14-16s14 6 14 16" />
          <path d="M18 46h64" strokeDasharray="4 4" />
        </g>
      ) : null}

      {slug === "punto-fit" ? (
        <g {...comun}>
          <circle cx="50" cy="50" r="34" />
          <circle cx="50" cy="50" r="22" />
          <circle cx="50" cy="50" r="9" fill="currentColor" stroke="none" />
          <path d="M16 84h68" strokeDasharray="3 5" />
        </g>
      ) : null}

      {slug === "alegria" ? (
        <g {...comun}>
          <path d="M50 50c0-18 14-30 30-30s18 14 6 24-24 6-36 6z" />
          <path d="M50 50c0 18-14 30-30 30S2 66 14 56s24-6 36-6z" />
          <circle cx="50" cy="50" r="3" fill="currentColor" stroke="none" />
        </g>
      ) : null}

      {slug.startsWith("almuerzo") ? (
        <g {...comun}>
          <rect x="12" y="34" width="76" height="44" />
          <path d="M12 46h76" />
          <circle cx="34" cy="60" r="7" />
          <path d="M52 56h26M52 64h18" />
        </g>
      ) : null}
    </svg>
  );
}

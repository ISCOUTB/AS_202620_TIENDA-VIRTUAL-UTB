import Image from "next/image";
import { LOGO } from "@/lib/imagenes";

/** Anchos de las barras del código del artefacto («A · Inicio escritorio»). */
const BARRAS = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 3, 1, 2, 2];

/** Trazo del código de barras decorativo: una barra sí, una no. */
function trazoCodigo(): string {
  let x = 0;
  return BARRAS.map((ancho, i) => {
    const d = i % 2 === 0 ? `M${x} 0h${ancho}v26h-${ancho}z` : "";
    x += ancho + 1;
    return d;
  }).join("");
}

const CODIGO = trazoCodigo();

/**
 * El carnet digital (SPEC v4 §2.6, sección «La cuenta» del artefacto).
 *
 * Plástico claro en los dos temas, como el carnet real: franja azul arriba,
 * anillo decorativo en la esquina, logo en su color, iniciales sobre azul,
 * nombre en Fraunces, código en monoespaciada, rol y código de barras.
 * Inclinado −2.5°; con `recto` se muestra derecho (la cuenta real).
 */
export function Carnet({
  nombre,
  codigo,
  rol,
  lugar = "Cafetería La Placita",
  recto = false,
  className = "",
}: {
  nombre: string;
  codigo: string;
  rol: string;
  lugar?: string;
  recto?: boolean;
  className?: string;
}) {
  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={[
        "relative isolate flex aspect-[1.586/1] w-full max-w-[400px] flex-col overflow-hidden rounded-[22px] bg-carnet px-5 pb-4 pt-5 text-carnet-tinta shadow-carnet sm:px-6 sm:pb-5 sm:pt-[22px]",
        recto ? "" : "-rotate-[2.5deg]",
        className,
      ].join(" ")}
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-carnet-azul" />
      <div
        aria-hidden="true"
        className="absolute -right-[70px] -top-[70px] -z-10 h-[200px] w-[200px] rounded-pill border-[28px] border-carnet-azul-suave"
      />

      <div className="flex items-center justify-between gap-3">
        <Image src={LOGO.src} alt={LOGO.alt} width={LOGO.ancho} height={LOGO.alto} className="h-[22px] w-auto sm:h-[26px]" />
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-carnet-tenue">
          Carnet digital
        </span>
      </div>

      <div className="mt-auto flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-carnet-azul text-lg font-bold tracking-[0.02em] text-blanco sm:h-14 sm:w-14 sm:text-[1.1875rem]"
        >
          {iniciales}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold leading-tight sm:text-[1.3125rem]">{nombre}</p>
          <p className="mt-0.5 truncate font-mono text-[0.8125rem] tracking-[0.06em] text-carnet-tenue">{codigo}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-carnet-linea pt-3 sm:mt-4 sm:pt-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-6 shrink-0 items-center rounded-pill bg-carnet-azul-suave px-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-carnet-azul">
            {rol}
          </span>
          <span className="hidden truncate text-[0.6875rem] font-semibold text-carnet-tenue min-[380px]:inline">{lugar}</span>
        </div>
        <svg
          aria-hidden="true"
          width="96"
          height="26"
          viewBox="0 0 96 26"
          className="h-[22px] w-auto shrink-0 fill-carnet-tinta sm:h-[26px]"
        >
          <path d={CODIGO} />
        </svg>
      </div>
    </div>
  );
}

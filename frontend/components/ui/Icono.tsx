import type { SlugTienda } from "@/lib/tiendas";

/**
 * Íconos de trazo dibujados para el sitio (SPEC v4 §4): sin librería, con
 * `currentColor`, siempre `aria-hidden` (el nombre accesible va en el botón
 * o enlace que los contiene).
 */

export type NombreIcono =
  | "sol"
  | "luna"
  | "buscar"
  | "mas"
  | "menos"
  | "cerrar"
  | "atras"
  | "flecha"
  | "info"
  | "inicio"
  | "tiendas"
  | "pedidos"
  | "cuenta"
  | "menu"
  | "foto"
  | "reloj"
  | "caja"
  | "campana"
  | "check";

const TRAZOS: Record<NombreIcono, string> = {
  sol: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  luna: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  buscar: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5",
  mas: "M12 5v14M5 12h14",
  menos: "M5 12h14",
  cerrar: "M6 6l12 12M18 6 6 18",
  atras: "M15 6l-6 6 6 6",
  flecha: "M5 12h14M13 6l6 6-6 6",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01",
  inicio: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  tiendas: "M4 9h16l-1.5-5h-13zM5 9v11h14V9M9.5 20v-5h5v5",
  pedidos: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  cuenta: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  foto: "M6 4h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM9 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM21 16l-5-5-9 9",
  reloj: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  caja: "M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10",
  campana: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
  check: "M5 12.5l4.5 4.5L19 7.5",
};

/** Trazo propio de cada tienda (el mismo del artefacto de diseño). */
const TRAZO_TIENDA: Record<SlugTienda, string> = {
  antojos: "M6 7h12l1 14H5zM9 7a3 3 0 0 1 6 0",
  "punto-fit":
    "M12 7c-2-2-7-1.5-7 4 0 4 3 9 5 9 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-5 5-9 0-5.5-5-6-7-4zM12 7c0-2 1-4 3-4",
  alegria: "M7.5 10a4.5 4.5 0 0 1 9 0zM7.5 10 12 21l4.5-11",
  "almuerzo-01": "M3 11h18c0 5-4 9-9 9s-9-4-9-9zM9 4v4M12 3v5M15 4v4",
  "almuerzo-02": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
};

type PropsBase = { tamano?: number; grosor?: number; className?: string };

function Trazo({ d, tamano = 20, grosor = 2, className }: PropsBase & { d: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}

export function Icono({ nombre, ...resto }: PropsBase & { nombre: NombreIcono }) {
  return <Trazo d={TRAZOS[nombre]} {...resto} />;
}

export function IconoTienda({ slug, ...resto }: PropsBase & { slug: SlugTienda }) {
  return <Trazo d={TRAZO_TIENDA[slug]} grosor={1.9} {...resto} />;
}

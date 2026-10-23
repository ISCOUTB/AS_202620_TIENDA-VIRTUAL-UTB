/**
 * Las tiendas de la cafetería UTB — fuente única de su identidad.
 *
 * Color (design/SPEC.md v4 §2.1): cada tienda tiene su propia paleta
 * (`paletaTienda`): ámbar Antojos, verde Punto Fit, violeta Alegría, cian
 * Almuerzo 01 y azul Almuerzo 02. El color nunca es el único diferenciador:
 * cada tienda lleva además su nombre y su ícono propio.
 *
 * `acento` y `tratamiento` son el modelo de la v3; se conservan porque los
 * usan las pruebas y quien solo conozca tres acentos (`clasesAcento`).
 *
 * Ningún color literal aquí: las paletas son clases de Tailwind que leen
 * los tokens de app/tokens.css.
 */

export type SlugTienda =
  | "antojos"
  | "punto-fit"
  | "alegria"
  | "almuerzo-01"
  | "almuerzo-02";

/** Acento de color. `azul` = sistema azul, sin color propio de tienda. */
export type Acento = "ambar" | "cyan" | "azul";

/** Tratamiento tipográfico: la misma familia, cuatro maneras. */
export type Tratamiento = "condensada" | "limpia" | "editorial" | "numerada";

export type Horario = {
  /** Día 0 = domingo … 6 = sábado. */
  dias: number[];
  abre: string; // "07:00"
  cierra: string; // "20:00"
};

export type Tienda = {
  slug: SlugTienda;
  nombre: string;
  /** Rótulo corto de señalética, en caja alta. */
  categoria: string;
  tagline: string;
  /** 40–60 palabras para la landing y el JSON-LD. */
  descripcion: string;
  acento: Acento;
  tratamiento: Tratamiento;
  /** Nombre del motivo gráfico propio, documentado en el SPEC. */
  motivo: string;
  /** Ruta de la foto cuando esté asignada; null hasta el mapeo. */
  foto: string | null;
  horario: Horario;
  /** false = no se indexa hasta tener 8 productos y copy completo. */
  indexable: boolean;
  /** Tres ganchos para la tarjeta de la landing. */
  destacados: string[];
  /** Nota visible cuando hay decisiones que se resuelven en el mostrador. */
  nota?: string;
};

// Horario provisional: la cafetería todavía no lo confirmó (docs/pendientes.md).
const HORARIO_CAMPUS: Horario = { dias: [1, 2, 3, 4, 5], abre: "07:00", cierra: "20:00" };

export const TIENDAS: Tienda[] = [
  {
    slug: "antojos",
    nombre: "Antojos",
    categoria: "Tienda de barrio",
    tagline: "Lo que se antoja entre clases, sin caminar hasta la esquina.",
    descripcion:
      "La tienda de barrio que vive dentro de la cafetería. Mecatos, fritos, galletas, chicles y gaseosas: lo mismo que comprarías en la esquina, pero a un pasillo de tu salón. De todito, Cheetos, Submarinos y Bombombum por unidad o por bolsa, para compartir o para el bolsillo.",
    acento: "ambar",
    tratamiento: "condensada",
    motivo: "La bolsa y el gancho del estante",
    foto: null,
    horario: HORARIO_CAMPUS,
    indexable: false,
    destacados: [
      "Mecatos por unidad o por bolsa",
      "Gaseosas y jugos Hit fríos",
      "Dulces que ya no se consiguen en otros lados",
    ],
    nota: "Los precios de esta tienda están por confirmar. Se muestran valores de referencia.",
  },
  {
    slug: "punto-fit",
    nombre: "Punto Fit",
    categoria: "Fresco y ligero",
    tagline: "Frutas, granolas y helados de yogur griego para el día largo.",
    descripcion:
      "El punto de lo fresco dentro del campus. Fruta cortada, fresas con crema, granolas de todos los sabores, granola con yogur griego, helados de yogur griego, pastas con verduras y wraps de pollo. Para los que almuerzan ligero entre clase y clase, sin quedarse con hambre a las tres de la tarde.",
    acento: "cyan",
    tratamiento: "limpia",
    motivo: "El punto: círculo, anillo y contador",
    foto: null,
    horario: HORARIO_CAMPUS,
    indexable: false,
    destacados: [
      "Fruta fresca del día",
      "Granola con yogur griego",
      "Hatsu, tés y helados de yogur",
    ],
    nota: "Los precios de esta tienda están por confirmar. Se muestran valores de referencia.",
  },
  {
    slug: "alegria",
    nombre: "Alegría",
    categoria: "Helados y sándwiches",
    tagline: "Helado, sándwich y un té bien hecho. El premio de la tarde.",
    descripcion:
      "La versión buena de un antojo. Helados de vainilla, chocolate y fresa, sándwiches armados al momento, chocolatinas Jett y mecacos, con jugos y tés para acompañar. Si el día fue largo, aquí se cierra con algo que valga la pena y no con lo primero que aparezca.",
    acento: "azul",
    tratamiento: "editorial",
    motivo: "El swirl del helado",
    foto: null,
    horario: HORARIO_CAMPUS,
    indexable: false,
    destacados: [
      "Helados servidos al momento",
      "Sándwiches armados en el mostrador",
      "Jugos y tés para acompañar",
    ],
    nota: "Los precios de esta tienda están por confirmar. Se muestran valores de referencia.",
  },
  {
    slug: "almuerzo-01",
    nombre: "Almuerzo 01",
    categoria: "Línea oriental",
    tagline: "Arroces y pollo para compartir, servidos calientes.",
    descripcion:
      "La línea oriental de la cafetería: pollo frito con arepitas, arroz oriental, arroz La Placita, arroz La Valenciana, chow mein y pollo agridulce con arroz frito. Porciones individuales para el almuerzo y platos enteros para compartir en la mesa del campus.",
    acento: "azul",
    tratamiento: "numerada",
    motivo: "La bandeja",
    foto: null,
    horario: HORARIO_CAMPUS,
    indexable: true,
    destacados: [
      "Pollo frito con arepitas, entero o medio",
      "Cuatro arroces distintos",
      "Chow mein y agridulce a $19.600",
    ],
  },
  {
    slug: "almuerzo-02",
    nombre: "Almuerzo 02",
    categoria: "Por definir",
    tagline: "El segundo punto de almuerzo del campus, abriendo pronto.",
    descripcion:
      "El segundo restaurante de almuerzos de la cafetería UTB. Su carta y su nombre están por definir; mientras tanto se publica la información general del punto y se avisa por correo cuando abra.",
    acento: "azul",
    tratamiento: "numerada",
    motivo: "La bandeja",
    foto: null,
    horario: HORARIO_CAMPUS,
    indexable: false,
    destacados: [
      "Próximamente en el campus",
      "Almuerzos para estudiantes y ejecutivos",
      "Avisos por correo al abrir",
    ],
    nota: "Esta tienda aún no tiene carta publicada.",
  },
];

export function tiendaPorSlug(slug: string): Tienda | undefined {
  return TIENDAS.find((t) => t.slug === slug);
}

export const SLUGS_TIENDA = TIENDAS.map((t) => t.slug);

/**
 * Utilidad de clases por acento (modelo de tres acentos de la v3).
 *
 * La interfaz v4 colorea cada tienda con su propia paleta (`paletaTienda`);
 * esta función se conserva para quien solo conoce el `Acento` y la mapea a
 * los mismos tokens (`ambar` = Antojos, `cyan` = Almuerzo 01, `azure` =
 * azul de marca).
 */
export function clasesAcento(acento: Acento): {
  fondo: string;
  texto: string;
  borde: string;
  punto: string;
} {
  switch (acento) {
    case "ambar":
      return {
        fondo: "bg-ambar text-antojos-sobre",
        texto: "text-antojos-tinta",
        borde: "border-ambar",
        punto: "bg-ambar",
      };
    case "cyan":
      return {
        fondo: "bg-cyan text-alm1-sobre",
        texto: "text-alm1-tinta",
        borde: "border-cyan",
        punto: "bg-cyan",
      };
    case "azul":
      return {
        fondo: "bg-azure text-sobre-primario",
        texto: "text-enlace",
        borde: "border-azure",
        punto: "bg-azure",
      };
  }
}

/**
 * Paleta propia de cada tienda (SPEC v4 §2.1): cinco acentos, uno por punto.
 *
 * - `relleno` + `sobreRelleno`: chip con el nombre, punto de color, ficha
 *   del ícono. El acento es RELLENO; el texto encima va en `sobreRelleno`.
 * - `suave` + `tinta`: campo de la tarjeta y su texto/ícono (≥ 4.5:1).
 * - `punto`: el punto de color sobre la sábana azul (el azul de Almuerzo 02
 *   se cambia por su versión clara para que se vea).
 *
 * Clases completas y literales para que Tailwind las detecte.
 */
export type PaletaTienda = {
  relleno: string;
  sobreRelleno: string;
  suave: string;
  tinta: string;
  punto: string;
  /** Borde del mismo color que el relleno (fichas sobre el campo suave). */
  bordeSuave: string;
};

const PALETAS: Record<SlugTienda, PaletaTienda> = {
  antojos: {
    relleno: "bg-antojos",
    sobreRelleno: "text-antojos-sobre",
    suave: "bg-antojos-suave",
    tinta: "text-antojos-tinta",
    punto: "bg-antojos",
    bordeSuave: "border-antojos-suave",
  },
  "punto-fit": {
    relleno: "bg-fit",
    sobreRelleno: "text-fit-sobre",
    suave: "bg-fit-suave",
    tinta: "text-fit-tinta",
    punto: "bg-fit",
    bordeSuave: "border-fit-suave",
  },
  alegria: {
    relleno: "bg-alegria",
    sobreRelleno: "text-alegria-sobre",
    suave: "bg-alegria-suave",
    tinta: "text-alegria-tinta",
    punto: "bg-alegria",
    bordeSuave: "border-alegria-suave",
  },
  "almuerzo-01": {
    relleno: "bg-alm1",
    sobreRelleno: "text-alm1-sobre",
    suave: "bg-alm1-suave",
    tinta: "text-alm1-tinta",
    punto: "bg-alm1",
    bordeSuave: "border-alm1-suave",
  },
  "almuerzo-02": {
    relleno: "bg-alm2",
    sobreRelleno: "text-alm2-sobre",
    suave: "bg-alm2-suave",
    tinta: "text-alm2-tinta",
    punto: "bg-alm2-punto",
    bordeSuave: "border-alm2-suave",
  },
};

/** Paleta de una tienda por slug; una desconocida usa la del azul de marca. */
export function paletaTienda(slug: string): PaletaTienda {
  return PALETAS[slug as SlugTienda] ?? PALETAS["almuerzo-02"];
}

/**
 * La misma familia, cuatro tratamientos. Es el diferenciador real de tienda:
 * el color no alcanza porque solo hay tres acentos para cinco tiendas.
 *
 * Los cuatro tratamientos son de Archivo (SPEC v3: una sola familia en la UI;
 * Literata queda reservada a la prosa legal).
 */
export function clasesTratamiento(
  tratamiento: Tratamiento,
  tamano: "banda" | "grande" | "hero",
): string {
  const escala =
    tamano === "banda"
      ? "text-[1.35rem]"
      : tamano === "hero"
        ? "text-[clamp(2.5rem,1.4rem+4vw,4.5rem)]"
        : "text-[2.5rem]";

  switch (tratamiento) {
    case "condensada":
      return `${escala} font-[800] uppercase [font-stretch:75%] leading-[0.9]`;
    case "limpia":
      return `${escala} font-[400] tracking-[0.02em] leading-[1]`;
    case "editorial":
      return `${escala} font-[300] italic tracking-[-0.01em] leading-[1]`;
    case "numerada":
      return `${escala} font-[700] tracking-[-0.02em] leading-[0.95]`;
  }
}

/** Nombre visible de una tienda a partir de su slug (para el carrito). */
export function nombreTienda(slug: string): string {
  return tiendaPorSlug(slug)?.nombre ?? slug;
}

/** Acento de una tienda a partir de su slug (para marcar líneas del carrito). */
export function acentoDeTienda(slug: string): Acento {
  return tiendaPorSlug(slug)?.acento ?? "azul";
}

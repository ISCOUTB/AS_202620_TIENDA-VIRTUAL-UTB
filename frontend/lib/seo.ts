/**
 * SEO — fuente única de URLs, nombres y datos estructurados.
 *
 * `SITIO_URL` alimenta `metadataBase`, `sitemap.ts`, `robots.ts` y las URLs
 * absolutas del JSON-LD. Mientras no exista dominio propio (ver
 * docs/pendientes.md) cae a localhost; en producción se define la variable
 * `NEXT_PUBLIC_SITIO_URL` en el build.
 */

import { TIENDAS, type Tienda } from "./tiendas";
import { PRODUCTOS } from "./catalogo";
import { formatoPrecio } from "./formato";

export const SITIO_URL = (
  process.env.NEXT_PUBLIC_SITIO_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const NOMBRE_SITIO = "Tienda Virtual UTB";

export const DESCRIPCION_SITIO =
  "Pide y reserva en las cuatro tiendas de la cafetería de la Universidad Tecnológica de Bolívar: Antojos, Punto Fit, Alegría y los almuerzos del campus. Recoges entre clases.";

/** URL absoluta de una ruta interna. */
export function urlAbsoluta(ruta: string): string {
  return `${SITIO_URL}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
}

type JsonLd = Record<string, unknown>;

/** Organization + WebSite: una sola vez, en el layout público. */
export function jsonLdSitio(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": urlAbsoluta("/#organizacion"),
        name: "Universidad Tecnológica de Bolívar",
        url: urlAbsoluta("/"),
        logo: urlAbsoluta("/utb-logo.png"),
      },
      {
        "@type": "WebSite",
        "@id": urlAbsoluta("/#sitio"),
        url: urlAbsoluta("/"),
        name: NOMBRE_SITIO,
        inLanguage: "es-CO",
        publisher: { "@id": urlAbsoluta("/#organizacion") },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${urlAbsoluta("/tiendas")}?q={busqueda}`,
          },
          "query-input": "required name=busqueda",
        },
      },
    ],
  };
}

const DIAS = [
  "https://schema.org/Sunday",
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
  "https://schema.org/Saturday",
];

/** La cafetería como lugar: un solo CafeOrCoffeeShop con su menú completo. */
export function jsonLdCafeteria(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    "@id": urlAbsoluta("/#cafeteria"),
    name: "Cafetería UTB",
    description: DESCRIPCION_SITIO,
    url: urlAbsoluta("/"),
    image: urlAbsoluta("/img/cafeteria-01.jpg"),
    logo: urlAbsoluta("/utb-logo.png"),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Cartagena de Indias",
      addressRegion: "Bolívar",
      addressCountry: "CO",
    },
    areaServed: "Campus Universidad Tecnológica de Bolívar",
    hasMenu: {
      "@type": "Menu",
      "@id": urlAbsoluta("/#menu"),
      name: "Menú de la cafetería UTB",
      hasMenuSection: TIENDAS.filter((t) => t.indexable).map((tienda) =>
        menuSeccion(tienda),
      ),
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DIAS.slice(1, 6),
        opens: "07:00",
        closes: "20:00",
      },
    ],
  };
}

function menuSeccion(tienda: Tienda): JsonLd {
  const productos = PRODUCTOS.filter((p) => p.tienda === tienda.slug);
  return {
    "@type": "MenuSection",
    name: tienda.nombre,
    description: tienda.descripcion,
    hasMenuItem: productos.map((p) => ({
      "@type": "MenuItem",
      name: p.nombre,
      description: p.descripcion,
      offers: {
        "@type": "Offer",
        price: (p.precioCentavos / 100).toFixed(0),
        priceCurrency: "COP",
        availability:
          p.existencias === 0
            ? "https://schema.org/SoldOut"
            : "https://schema.org/InStock",
      },
    })),
  };
}

/** Migas de pan para páginas internas. */
export function jsonLdMigas(
  pasos: Array<{ nombre: string; ruta: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: pasos.map((paso, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: paso.nombre,
      item: urlAbsoluta(paso.ruta),
    })),
  };
}

/** FAQPage: se alimenta de las mismas preguntas que renderiza la página. */
export function jsonLdFaq(
  preguntas: Array<{ pregunta: string; respuesta: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preguntas.map((p) => ({
      "@type": "Question",
      name: p.pregunta,
      acceptedAnswer: { "@type": "Answer", text: p.respuesta },
    })),
  };
}

/** ItemList del catálogo de una tienda. */
export function jsonLdListaProductos(tienda: Tienda): JsonLd {
  const productos = PRODUCTOS.filter((p) => p.tienda === tienda.slug);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${tienda.nombre} — ${NOMBRE_SITIO}`,
    numberOfItems: productos.length,
    itemListElement: productos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.nombre,
      url: urlAbsoluta(`/tiendas/${tienda.slug}#${p.slug}`),
    })),
  };
}

/** Precio legible para descripciones de metadatos. */
export function precioTexto(centavos: number): string {
  return formatoPrecio(centavos);
}

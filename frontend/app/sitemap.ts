import type { MetadataRoute } from "next";
import { SITIO_URL } from "@/lib/seo";
import { TIENDAS } from "@/lib/tiendas";

/**
 * Solo se listan las rutas que pueden indexarse. Las tiendas con precios de
 * muestra quedan fuera (lib/tiendas.ts → indexable:false) porque publicar
 * precios sin confirmar en el índice sería desinformar.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();

  const fijas: MetadataRoute.Sitemap = [
    {
      url: `${SITIO_URL}/`,
      lastModified: ahora,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITIO_URL}/terminos`,
      lastModified: ahora,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITIO_URL}/privacidad`,
      lastModified: ahora,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const tiendas: MetadataRoute.Sitemap = TIENDAS.filter((t) => t.indexable).map(
    (t) => ({
      url: `${SITIO_URL}/tiendas/${t.slug}`,
      lastModified: ahora,
      changeFrequency: "daily",
      priority: 0.8,
    }),
  );

  return [...fijas, ...tiendas];
}

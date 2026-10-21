import type { MetadataRoute } from "next";
import { SITIO_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // El pase, las pantallas de acceso y la API no aportan nada al índice
        // y exponen superficie innecesaria.
        disallow: ["/auth/", "/cuenta", "/admin", "/api/"],
      },
    ],
    sitemap: `${SITIO_URL}/sitemap.xml`,
    host: SITIO_URL,
  };
}

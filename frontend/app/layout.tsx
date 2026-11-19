import type { Metadata, Viewport } from "next";
import { DM_Sans, Montserrat } from "next/font/google";
import "./globals.css";
import { SITIO_URL, NOMBRE_SITIO, DESCRIPCION_SITIO } from "@/lib/seo";
import { colorDeToken } from "@/lib/tokens";
import { SCRIPT_TEMA_INICIAL } from "@/lib/tema-inicial";
import { IndicadorNavegacion } from "@/components/chrome/IndicadorNavegacion";

/*
 * Dos familias (design/SPEC.md v5 §2.3):
 * - DM Sans variable para la interfaz, el cuerpo y las cifras.
 * - Montserrat variable para títulos y navegación, en mayúsculas con
 *   tracking: la voz sobria de catálogo.
 * El subset `latin` cubre á é í ó ú ñ ü ¿ ¡.
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITIO_URL),
  title: {
    default: `${NOMBRE_SITIO} — cafetería del campus`,
    template: `%s · ${NOMBRE_SITIO}`,
  },
  description: DESCRIPCION_SITIO,
  applicationName: NOMBRE_SITIO,
  authors: [{ name: "Equipo Tienda Virtual UTB" }],
  openGraph: {
    type: "website",
    siteName: NOMBRE_SITIO,
    title: NOMBRE_SITIO,
    description: DESCRIPCION_SITIO,
  },
  twitter: {
    card: "summary_large_image",
    title: NOMBRE_SITIO,
    description: DESCRIPCION_SITIO,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // La barra del navegador continúa la cinta azul que corona cada página.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: colorDeToken("p-azul") },
    { media: "(prefers-color-scheme: dark)", color: colorDeToken("p-sabana-noche-1") },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `data-theme` y `data-motion` los pone el script de abajo antes del
    // primer pintado; React no los conoce, de ahí suppressHydrationWarning.
    <html
      lang="es-CO"
      className={`${dmSans.variable} ${montserrat.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_INICIAL }} />
      </head>
      {/* GSAP ScrollTrigger (lib/movimiento.ts) toca `body.style` al
          registrarse, antes de que React hidrate: queda un `style=""` vacío
          que React reporta como discrepancia. Es inocuo, así que se silencia
          solo para los atributos de este elemento. */}
      <body suppressHydrationWarning>
        {children}
        {/* Pantalla de carga entre páginas para toda la app (público, cuenta,
            admin y acceso). */}
        <IndicadorNavegacion />
      </body>
    </html>
  );
}

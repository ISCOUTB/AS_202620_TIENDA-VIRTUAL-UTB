import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { SITIO_URL, NOMBRE_SITIO, DESCRIPCION_SITIO } from "@/lib/seo";
import { colorDeToken } from "@/lib/tokens";
import { SCRIPT_TEMA_INICIAL } from "@/lib/tema-inicial";

/*
 * Dos familias (design/SPEC.md v4 §2.3):
 * - DM Sans variable para la interfaz, el cuerpo y las cifras.
 * - Fraunces variable para títulos: hero, secciones, nombres de tienda.
 * El subset `latin` cubre á é í ó ú ñ ü ¿ ¡.
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
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
  // La barra del navegador toma el azul de la sábana, que abre cada página.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: colorDeToken("p-sabana-1") },
    { media: "(prefers-color-scheme: dark)", color: colorDeToken("p-sabana-noche-2") },
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
      className={`${dmSans.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_INICIAL }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

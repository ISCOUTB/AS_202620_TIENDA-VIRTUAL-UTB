import type { Metadata, Viewport } from "next";
import { Archivo, Literata } from "next/font/google";
import "./globals.css";
import { SITIO_URL, NOMBRE_SITIO, DESCRIPCION_SITIO } from "@/lib/seo";
import { colorDeToken } from "@/lib/tokens";

/*
 * Una familia para la interfaz y una serif solo para la prosa legal
 * (design/SPEC.md v3 §2.3):
 * - Archivo variable (peso 100–900 + eje de ancho 62–125) para display, UI y
 *   los cuatro tratamientos de tienda.
 * - Literata variable, usada únicamente dentro de `.prosa` (/terminos,
 *   /privacidad).
 * El subset `latin` cubre á é í ó ú ñ ü ¿ ¡.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  weight: "variable",
  display: "swap",
  variable: "--font-archivo",
});

const literata = Literata({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-literata",
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
  themeColor: colorDeToken("tinta"),
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" className={`${archivo.variable} ${literata.variable}`}>
      <body>{children}</body>
    </html>
  );
}

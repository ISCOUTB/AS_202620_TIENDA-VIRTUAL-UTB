import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Tienda Virtual UTB",
  description: "Esqueleto arquitectónico de la Tienda Virtual UTB",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

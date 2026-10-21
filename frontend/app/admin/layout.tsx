import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { RequiereAdmin } from "@/components/admin/RequiereAdmin";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { LOGO } from "@/lib/imagenes";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

/**
 * Chrome del panel. Deliberadamente distinto al sitio público: barra oscura
 * mínima, sin navegación de tiendas, para que no se confunda con la vista de
 * cliente.
 */
export default function LayoutAdmin({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-tinta text-superficie">
      <header className="border-b border-white/10 bg-navy">
        <div className="contenedor flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src={LOGO.src}
                alt={LOGO.alt}
                width={LOGO.ancho}
                height={LOGO.alto}
                className="h-7 w-auto [filter:brightness(0)_invert(1)]"
              />
            </Link>
            <span className="hidden font-cuerpo text-[0.8125rem] text-cyan-claro sm:inline">
              / administración
            </span>
          </div>
          <nav aria-label="Administración" className="flex items-center gap-4">
            <Link
              href="/cuenta"
              className="rotulo text-cyan-claro underline underline-offset-4"
            >
              Mi pase
            </Link>
            <Link
              href="/"
              className="rotulo text-cyan-claro underline underline-offset-4"
            >
              Ver tienda
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <RequiereAdmin>{children}</RequiereAdmin>
      </main>

      <footer className="border-t border-linea">
        <div className="contenedor flex flex-wrap items-center justify-between gap-3 py-6">
          <Etiqueta>Panel de cafetería · versión de diseño</Etiqueta>
          <p className="font-cuerpo text-[0.8125rem] text-tenue">
            Las mutaciones de inventario se publican cuando exista{" "}
            <span className="cifra">PATCH /inventory/:id</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}

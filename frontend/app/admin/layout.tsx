import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { RequiereAdmin } from "@/components/admin/RequiereAdmin";
import { BotonTema } from "@/components/chrome/BotonTema";
import { LOGO } from "@/lib/imagenes";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

/**
 * Chrome del panel. Misma sábana que el sitio, pero sin tiendas ni pedido:
 * solo el logo, la marca «administración», el tema y dos salidas. Así no se
 * confunde con la vista de cliente.
 */
export default function LayoutAdmin({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-fondo text-tinta">
      <header className="sabana rounded-b-lg pb-14">
        <div className="contenedor flex h-[var(--tk-alto-nav)] items-center gap-3">
          <Link href="/" className="flex min-h-11 shrink-0 items-center" aria-label="Tienda Virtual UTB, inicio">
            <Image
              src={LOGO.src}
              alt=""
              width={LOGO.ancho}
              height={LOGO.alto}
              className="h-[30px] w-auto [filter:brightness(0)_invert(1)]"
            />
          </Link>
          <span className="hidden text-sm font-semibold opacity-90 sm:inline">/ administración</span>
          <span className="flex-1" />
          <nav aria-label="Administración" className="flex items-center gap-1 text-sm font-semibold">
            <Link href="/cuenta" className="inline-flex min-h-11 items-center px-2 underline-offset-4 hover:underline">
              Mi pase
            </Link>
            <Link href="/" className="inline-flex min-h-11 items-center px-2 underline-offset-4 hover:underline">
              Ver tienda
            </Link>
          </nav>
          <BotonTema />
        </div>
      </header>

      <main id="contenido" className="-mt-10">
        <RequiereAdmin>{children}</RequiereAdmin>
      </main>

      <footer className="mt-6 border-t border-linea bg-tarjeta">
        <div className="contenedor flex flex-wrap items-center justify-between gap-3 py-6 text-[0.8125rem] text-tenue">
          <span className="rotulo">Panel de cafetería · versión de diseño</span>
          <p>
            Las mutaciones de inventario se publican cuando exista{" "}
            <span className="font-mono">PATCH /inventory/:id</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}

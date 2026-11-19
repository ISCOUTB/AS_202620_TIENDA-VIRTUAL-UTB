import Link from "next/link";
import type { Producto } from "@/lib/catalogo";
import { Revelar } from "@/components/motion/Revelar";
import { ProductoCard } from "@/components/tienda/ProductoCard";

/**
 * Vitrina de la portada (SPEC v5 §3), sobre la vitrina de un catálogo:
 * título en mayúsculas a la izquierda, «Ver todo» a la derecha y los
 * productos en tarjetas de vidrio a todo el ancho de la página.
 *
 * En móvil es una fila que se desliza con el pulgar (dos tarjetas y el borde
 * de la tercera); desde `md` es una rejilla de cuatro columnas.
 */
export function Vitrina({
  id,
  titulo,
  enlace,
  productos,
  mostrarTienda = false,
}: {
  id: string;
  titulo: string;
  enlace: { href: string; texto?: string };
  productos: Producto[];
  mostrarTienda?: boolean;
}) {
  if (productos.length === 0) return null;
  return (
    <Revelar as="section" aria-labelledby={id} className="mt-14 md:mt-20">
      <div className="flex items-end justify-between gap-4 px-[var(--tk-margen)] md:px-8">
        <h2 id={id} className="tipo-bloque">
          {titulo}
        </h2>
        <Link
          href={enlace.href}
          className="vidrio-alto inline-flex min-h-10 items-center gap-1.5 rounded-pill px-4 tipo-micro transition-colors duration-[var(--tk-dur)] hover:bg-[color:var(--tk-resalte)]"
        >
          {enlace.texto ?? "Ver todo"}
        </Link>
      </div>
      <ul className="fila-desliza mt-4 flex gap-3 px-[var(--tk-margen)] scroll-px-[var(--tk-margen)] pb-4 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-8">
        {productos.map((p) => (
          <ProductoCard
            key={p.id}
            producto={p}
            disposicion="vertical"
            mostrarTienda={mostrarTienda}
            className="w-[46%] shrink-0 sm:w-[31%] md:w-auto"
          />
        ))}
      </ul>
    </Revelar>
  );
}

import type { SlugTienda } from "@/lib/tiendas";
import { paletaTienda } from "@/lib/tiendas";
import { IconoTienda } from "@/components/ui/Icono";

/**
 * Campo de foto mientras el producto o la tienda no tenga foto asignada
 * (lib/imagenes.ts). Es el marcador del artefacto de diseño: el campo suave de
 * la tienda con un rayado sutil y su ícono, sin el texto «Foto 4:3» del
 * boceto. Decorativo: el nombre ya está en la tarjeta.
 */
export function MarcadorFoto({
  slug,
  className = "",
  tamanoIcono = 32,
  fondo,
  children,
}: {
  slug: SlugTienda;
  className?: string;
  tamanoIcono?: number;
  /** Clase de fondo en lugar del campo suave de la tienda. */
  fondo?: string;
  children?: React.ReactNode;
}) {
  const p = paletaTienda(slug);
  return (
    <div
      aria-hidden="true"
      className={`marcador relative flex items-center justify-center ${fondo ?? p.suave} ${p.tinta} ${className}`}
    >
      <IconoTienda slug={slug} tamano={tamanoIcono} className="opacity-80" />
      {children}
    </div>
  );
}

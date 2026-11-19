import type { SlugTienda } from "@/lib/tiendas";
import { fotoProducto } from "@/lib/imagenes";
import { MarcadorFoto } from "./MarcadorFoto";

/**
 * Foto de un producto: el recorte sin fondo sobre el campo gris claro, como
 * la foto de estudio de un catálogo. Si el producto aún no tiene recorte, cae
 * al marcador de color de su tienda.
 *
 * Decorativa (`alt=""`): el nombre del producto ya está junto a la foto.
 * `object-contain` respeta el aire que trae el lienzo 4:5 del recorte.
 */
export function FotoProducto({
  slug,
  tienda,
  className = "",
  tamanoIcono = 32,
  prioridad = false,
}: {
  slug: string;
  tienda: SlugTienda;
  className?: string;
  tamanoIcono?: number;
  /** Carga inmediata: solo para las primeras fotos visibles. */
  prioridad?: boolean;
}) {
  const src = fotoProducto(slug);
  if (!src) return <MarcadorFoto slug={tienda} tamanoIcono={tamanoIcono} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- WebP ya optimizado y con transparencia; no hace falta el optimizador.
    <img
      src={src}
      alt=""
      width={800}
      height={1000}
      loading={prioridad ? "eager" : "lazy"}
      decoding="async"
      className={`bg-[color:var(--tk-campo-foto)] object-contain ${className}`}
    />
  );
}

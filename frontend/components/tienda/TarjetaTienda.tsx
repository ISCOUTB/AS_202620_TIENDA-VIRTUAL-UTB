import Link from "next/link";
import type { Tienda } from "@/lib/tiendas";
import { paletaTienda } from "@/lib/tiendas";
import { IconoTienda } from "@/components/ui/Icono";
import { MarcadorFoto } from "./MarcadorFoto";

/**
 * Tarjeta de tienda de «Elige tienda» (artefacto «A · Inicio escritorio»):
 * campo de foto 16:10, ficha con el ícono en el acento de la tienda montada
 * sobre el borde, categoría en su tinta, nombre en Fraunces y la frase.
 * Toda la tarjeta es un solo enlace.
 */
export function TarjetaTienda({ tienda }: { tienda: Tienda }) {
  const p = paletaTienda(tienda.slug);
  return (
    <Link
      href={`/tiendas/${tienda.slug}`}
      data-escalon=""
      className={`levanta group flex h-full flex-col overflow-hidden rounded-tarjeta ${p.suave} text-tinta`}
    >
      <MarcadorFoto slug={tienda.slug} className="aspect-[16/10] w-full" fondo="bg-tarjeta/55" tamanoIcono={28} />
      <span
        aria-hidden="true"
        className={`relative -mt-7 ml-5 flex h-14 w-14 items-center justify-center rounded-[18px] border-[3px] ${p.bordeSuave} ${p.relleno} ${p.sobreRelleno} transition-transform duration-[var(--tk-dur-media)] ease-[var(--tk-ease)] group-hover:-rotate-6`}
      >
        <IconoTienda slug={tienda.slug} tamano={28} />
      </span>
      <span className="flex flex-col px-5 pb-5 pt-3">
        <span className={`rotulo text-xs font-bold ${p.tinta}`}>{tienda.categoria}</span>
        <span className="mt-1 font-display text-2xl font-semibold">{tienda.nombre}</span>
        <span className="mt-1.5 text-sm leading-snug text-tenue">{tienda.tagline}</span>
      </span>
    </Link>
  );
}

import Link from "next/link";
import type { Tienda } from "@/lib/tiendas";
import { estadoHorario } from "@/lib/formato";
import { portadaTienda } from "@/lib/imagenes";
import { LogoTienda } from "./LogoTienda";

/**
 * Tarjeta de tienda de «Las tiendas» (SPEC v5 §3), al modo de las apps de
 * domicilios: foto de portada con el logo asomando por su borde inferior,
 * y debajo el nombre, la categoría y si está abierta ahora. Tarjeta de
 * vidrio; toda ella es un solo enlace.
 *
 * Componente de servidor: el estado del horario se calcula en la petición.
 */
export function TarjetaTienda({ tienda }: { tienda: Tienda }) {
  const portada = portadaTienda(tienda.slug);
  const estado = estadoHorario(tienda.horario);
  return (
    <Link
      href={`/tiendas/${tienda.slug}`}
      data-escalon=""
      className="levanta vidrio group flex h-full flex-col p-2 text-tinta"
    >
      <span className="relative block aspect-[16/11] overflow-hidden rounded-md bg-oscuro">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portada.src}
          alt=""
          width={960}
          height={1280}
          loading="lazy"
          className={`foto-contenido zoom h-full w-full object-cover ${portada.encuadre}`}
        />
      </span>
      <span className="relative px-2 pb-2 pt-9">
        <span className="absolute -top-7 left-2 rounded-full bg-tarjeta p-1 shadow-[var(--tk-vidrio-sombra-alta)]">
          <LogoTienda slug={tienda.slug} tamano={52} />
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="text-base font-bold leading-tight">{tienda.nombre}</span>
          <span
            aria-hidden="true"
            className="text-tenue transition-transform duration-[var(--tk-dur-media)] ease-[var(--tk-ease)] group-hover:translate-x-1"
          >
            →
          </span>
        </span>
        <span className="mt-0.5 block text-[0.8125rem] text-tenue">{tienda.categoria}</span>
        <span className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${estado.abierta ? "bg-ok-punto" : "border border-tenue"}`}
          />
          <span className={estado.abierta ? "text-ok" : "text-tenue"}>{estado.abierta ? "Abierto ahora" : "Cerrado ahora"}</span>
        </span>
      </span>
    </Link>
  );
}

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { LOGO } from "@/lib/imagenes";
import { BotonTema } from "./BotonTema";

/**
 * Pantalla completa para 404 y errores: la sábana azul de todo el sitio, el
 * código grande en Fraunces, una frase honesta y las salidas.
 */
export function PantallaEstado({
  codigo,
  titulo,
  texto,
  acciones,
}: {
  codigo: string;
  titulo: string;
  texto: ReactNode;
  acciones: ReactNode;
}) {
  return (
    <div className="sabana flex min-h-svh flex-col">
      <div className="contenedor flex h-[var(--tk-alto-nav)] items-center gap-3">
        <Link href="/" className="flex min-h-11 items-center" aria-label="Tienda Virtual UTB, inicio">
          <Image
            src={LOGO.src}
            alt=""
            width={LOGO.ancho}
            height={LOGO.alto}
            className="h-[30px] w-auto [filter:brightness(0)_invert(1)] sm:h-[34px]"
          />
        </Link>
        <span className="flex-1" />
        <BotonTema />
      </div>
      <main id="contenido" className="contenedor flex flex-1 flex-col justify-center pb-24 pt-8">
        <p className="font-display text-[clamp(4.5rem,3rem+8vw,9rem)] font-semibold leading-none opacity-90">
          {codigo}
        </p>
        <h1 className="titulo mt-4 max-w-[20ch]">{titulo}</h1>
        <div className="lead mt-4 max-w-[44ch] opacity-95">{texto}</div>
        <div className="mt-8 flex flex-wrap gap-3">{acciones}</div>
      </main>
    </div>
  );
}

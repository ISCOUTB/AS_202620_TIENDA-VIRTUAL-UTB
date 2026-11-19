"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Foto } from "@/lib/imagenes";

export type Diapositiva = {
  foto: Foto;
  rotulo: string;
  /** Líneas del titular; la primera diapositiva lo pinta como `<h1>`. */
  titular: string[];
  texto?: string;
  accion: { href: string; texto: string };
  /** Encuadre de la foto (`object-position`). */
  encuadre?: string;
};

/** Cada cuánto avanza solo el carrusel. */
const INTERVALO_MS = 6500;

/**
 * Carrusel de la portada (SPEC v5 §3): una pieza flotante de esquinas amplias
 * con fotos que se funden una en otra, titular en mayúsculas abajo a la
 * izquierda y los controles en una pastilla de cristal.
 *
 * - Avanza solo cada 6,5 s; se detiene mientras el cursor o el foco están
 *   dentro, y no arranca nunca con movimiento reducido.
 * - Solo la diapositiva activa es visible para lectores de pantalla y para
 *   el teclado (`inert` en las demás), así el `<h1>` de la primera no se
 *   duplica ni se enfoca un enlace invisible.
 * - El fundido es solo `opacity` (CSS), sin librerías.
 */
export function CarruselPortada({ diapositivas }: { diapositivas: Diapositiva[] }) {
  const [activa, setActiva] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = diapositivas.length;

  const siguiente = useCallback(() => setActiva((i) => (i + 1) % total), [total]);

  useEffect(() => {
    if (pausado || total < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(siguiente, INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [pausado, siguiente, total]);

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados de la cafetería"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      className="relative isolate mx-2.5 mt-2.5 h-[78svh] min-h-[500px] overflow-hidden rounded-xl bg-oscuro text-blanco [--tk-foco:var(--tk-sobre-sabana)] sm:mx-4 md:h-[min(84svh,800px)]"
    >
      {diapositivas.map((d, i) => {
        const visible = i === activa;
        const Titular = i === 0 ? "h1" : "p";
        return (
          <div
            key={d.foto.src}
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={!visible}
            inert={!visible}
            className={`absolute inset-0 transition-opacity duration-1000 ease-[var(--tk-ease)] ${visible ? "z-10 opacity-100" : "z-0 opacity-0"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.foto.src}
              alt={d.foto.alt}
              width={960}
              height={1280}
              fetchPriority={i === 0 ? "high" : "low"}
              loading={i === 0 ? "eager" : "lazy"}
              // La foto activa se acerca despacio (Ken Burns); al volver a
              // ser activa, la clase reaparece y la animación reinicia.
              className={`foto-contenido absolute inset-0 -z-20 h-full w-full object-cover ${visible ? "ken-burns" : ""} ${d.encuadre ?? ""}`}
            />
            <div aria-hidden="true" className="absolute inset-0 -z-10 [background:var(--tk-velo-hero)]" />
            <div className="contenedor flex h-full flex-col justify-end pb-24 md:pb-36">
              <p className="rotulo opacity-90">{d.rotulo}</p>
              <Titular id={i === 0 ? "titular" : undefined} className="display mt-3 max-w-[14ch]">
                {d.titular.map((linea, j) => (
                  <span key={j} className="block">
                    {linea}
                  </span>
                ))}
              </Titular>
              {d.texto ? <p className="mt-4 hidden max-w-[34em] text-[0.9375rem] opacity-95 sm:block">{d.texto}</p> : null}
              <Link
                href={d.accion.href}
                className="cristal group mt-7 inline-flex min-h-12 items-center gap-3 self-start px-6 tipo-accion transition-[background-color] duration-[var(--tk-dur-media)] hover:bg-[color:var(--tk-cristal-alto)]"
              >
                {d.accion.texto}
                <span aria-hidden="true" className="transition-transform duration-[var(--tk-dur-media)] ease-[var(--tk-ease)] group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        );
      })}

      {total > 1 ? (
        // Controles en una pastilla de cristal, como el botón de audio del
        // carrusel de referencia; el contador da la posición de un vistazo.
        <div className="cristal absolute right-3 top-3 z-20 flex items-center gap-1 pl-4 pr-1 md:bottom-24 md:right-[max(var(--tk-margen),calc((100%-var(--tk-ancho))/2+var(--tk-margen)))] md:top-auto">
          <span aria-hidden="true" className="cifra mr-1 font-display text-[0.6875rem] font-semibold tracking-[0.1em]">
            {String(activa + 1).padStart(2, "0")}
            <span className="opacity-60"> / {String(total).padStart(2, "0")}</span>
          </span>
          {diapositivas.map((d, i) => (
            <button
              key={d.foto.src}
              type="button"
              onClick={() => setActiva(i)}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              aria-current={i === activa ? "true" : undefined}
              // Área táctil de 44 px con el punto de 8 px dibujado al centro.
              className="group flex h-11 w-7 items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full bg-blanco shadow-[var(--tk-sombra-punto)] transition-opacity duration-[var(--tk-dur-media)] ${i === activa ? "opacity-100" : "opacity-60 group-hover:opacity-90"}`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { buscarProductos, type Catalogo } from "@/lib/catalogo";
import { formatoPrecio } from "@/lib/formato";
import { nombreTienda } from "@/lib/tiendas";
import { Icono } from "@/components/ui/Icono";
import { FotoProducto } from "./FotoProducto";

/**
 * Buscador de la sábana (artefacto «A · Inicio»). Busca en el mismo catálogo
 * que pintan las cartas (lib/catalogo.ts → `buscarProductos`): no hay
 * endpoint de búsqueda y no se inventa uno.
 *
 * Los resultados son enlaces normales a la carta de cada tienda, anclados al
 * producto. Un texto vivo anuncia cuántos hay. Escape limpia; hacer clic
 * fuera cierra la lista.
 *
 * `productos` llega de la página, no de `CatalogoProvider`: el layout público
 * puede venir de una precarga de hasta 5 min (p. ej. «Ver tienda» desde el
 * panel) y mostraría productos ya desactivados.
 */
export function BuscadorProductos({
  productos,
  compacto = false,
}: {
  productos: Catalogo["productos"];
  compacto?: boolean;
}) {
  const id = useId();
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const resultados = useMemo(
    () => buscarProductos(productos, consulta, 6),
    [productos, consulta],
  );
  const activa = consulta.trim().length >= 2;

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", alPulsar);
    return () => document.removeEventListener("pointerdown", alPulsar);
  }, [abierto]);

  return (
    <div ref={caja} className="relative min-w-0 flex-1 basis-[280px]" role="search">
      <label
        htmlFor={`${id}-q`}
        className={[
          // Campo de búsqueda del catálogo: filo fino sobre blanco, sin sombra.
          "flex items-center gap-2.5 rounded-pill border border-[color:var(--tk-vidrio-borde)] bg-[color:var(--tk-vidrio-alto)] text-tenue shadow-[var(--tk-vidrio-sombra)] transition-colors duration-[var(--tk-dur)] hover:border-borde",
          "focus-within:border-tinta focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[color:var(--tk-foco)]",
          compacto ? "h-11 px-5" : "h-12 px-5",
        ].join(" ")}
      >
        <Icono nombre="buscar" tamano={20} grosor={2.2} className="shrink-0 text-enlace" />
        <span className="sr-only">Buscar en las tiendas</span>
        <input
          id={`${id}-q`}
          type="search"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setConsulta("");
              setAbierto(false);
            }
          }}
          placeholder="Arroz, granola, helado…"
          autoComplete="off"
          aria-describedby={`${id}-estado`}
          // Solo apunta a la lista mientras existe: un id inexistente en
          // `aria-controls` es ARIA inválido (axe: aria-valid-attr-value).
          aria-controls={abierto && activa ? `${id}-lista` : undefined}
          className="min-w-0 flex-1 bg-transparent text-base text-tinta outline-none placeholder:text-tenue"
        />
      </label>

      <p id={`${id}-estado`} className="sr-only" aria-live="polite">
        {activa
          ? resultados.length === 0
            ? "Sin resultados."
            : `${resultados.length} ${resultados.length === 1 ? "resultado" : "resultados"}.`
          : ""}
      </p>

      {abierto && activa ? (
        <div
          id={`${id}-lista`}
          className="vidrio-alto absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden text-tinta"
        >
          {resultados.length === 0 ? (
            <p className="px-5 py-4 text-sm text-tenue">
              No encontramos «{consulta.trim()}» en las cinco tiendas.
            </p>
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto py-1.5">
              {resultados.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/tiendas/${p.tienda}#${p.slug}`}
                    onClick={() => setAbierto(false)}
                    className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-suave focus-visible:bg-suave"
                  >
                    <FotoProducto slug={p.slug} tienda={p.tienda} tamanoIcono={18} className="h-12 w-10 shrink-0 rounded-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-semibold">
                        {p.nombre}
                        {p.presentacion ? ` · ${p.presentacion.toLowerCase()}` : ""}
                      </span>
                      <span className="block text-[0.8125rem] text-tenue">
                        {nombreTienda(p.tienda)}
                        {p.existencias <= 0 ? " · Agotado" : ""}
                      </span>
                    </span>
                    <span className="cifra shrink-0 text-sm font-bold">{formatoPrecio(p.precioCentavos)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

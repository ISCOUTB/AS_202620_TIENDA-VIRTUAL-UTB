"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { normalizar, type Producto } from "@/lib/catalogo";
import { seccionesDe } from "@/lib/secciones";
import { Icono } from "@/components/ui/Icono";
import { ProductoFila } from "./ProductoFila";

/**
 * La carta de una tienda (SPEC v5 §3.2), al modo de las apps de domicilios:
 *
 * 1. Buscador dentro de la tienda (filtra por nombre, presentación,
 *    descripción y sabores; sin tildes).
 * 2. Pestañas de sección fijas bajo la barra. Siguen al scroll (la sección
 *    que ocupa el centro de la pantalla queda resaltada y su pestaña se
 *    desliza a la vista) y al tocarlas llevan a la sección.
 * 3. Secciones con sus filas de producto (`ProductoFila`).
 *
 * Las pestañas son enlaces a anclas (`<nav>` + `aria-current`), no un
 * `tablist`: todas las secciones están siempre en la página y se recorren
 * con scroll.
 */
export function CartaTienda({ productos, nombreTienda }: { productos: Producto[]; nombreTienda: string }) {
  const idBuscar = useId();
  const [consulta, setConsulta] = useState("");
  const [activa, setActiva] = useState<string | null>(null);
  const barra = useRef<HTMLDivElement>(null);

  const filtrados = useMemo(() => {
    const q = normalizar(consulta);
    if (q.length < 2) return productos;
    return productos.filter((p) =>
      normalizar([p.nombre, p.presentacion, p.descripcion, ...(p.sabores ?? [])].filter(Boolean).join(" ")).includes(q),
    );
  }, [consulta, productos]);

  const secciones = useMemo(() => seccionesDe(filtrados), [filtrados]);
  const actual = activa && secciones.some((s) => s.id === activa) ? activa : (secciones[0]?.id ?? null);

  // Sigue al scroll: la sección cuya franja cruza el centro del viewport es
  // la activa. Un solo IntersectionObserver para todas.
  useEffect(() => {
    const nodos = secciones
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => n !== null);
    if (nodos.length === 0) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.find((e) => e.isIntersecting);
        if (visible) setActiva(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    nodos.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [secciones]);

  // Desliza la fila de pestañas para que la activa quede a la vista. Solo
  // horizontal: `scrollIntoView` movería también la página.
  useEffect(() => {
    const fila = barra.current;
    const pestana = fila?.querySelector<HTMLElement>(`[data-seccion="${actual}"]`);
    if (!fila || !pestana) return;
    const izquierda = pestana.offsetLeft - fila.clientWidth / 2 + pestana.clientWidth / 2;
    fila.scrollTo({ left: Math.max(0, izquierda), behavior: "smooth" });
  }, [actual]);

  return (
    <div>
      {/* ── Buscador de la tienda ── */}
      <div role="search">
        <label
          htmlFor={idBuscar}
          className="flex h-12 items-center gap-2.5 rounded-pill border border-[color:var(--tk-vidrio-borde)] bg-[color:var(--tk-vidrio-alto)] px-5 text-tenue shadow-[var(--tk-vidrio-sombra)] focus-within:border-tinta"
        >
          <Icono nombre="buscar" tamano={18} grosor={2.2} className="shrink-0 text-enlace" />
          <span className="sr-only">Buscar en {nombreTienda}</span>
          <input
            id={idBuscar}
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setConsulta("");
            }}
            placeholder={`Buscar en ${nombreTienda}`}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base text-tinta outline-none placeholder:text-tenue"
          />
        </label>
        <p className="sr-only" aria-live="polite">
          {consulta.trim().length >= 2
            ? `${filtrados.length} ${filtrados.length === 1 ? "producto" : "productos"}.`
            : ""}
        </p>
      </div>

      {secciones.length === 0 ? (
        <p className="mt-10 text-center text-[0.9375rem] text-tenue">
          No hay «{consulta.trim()}» en {nombreTienda}.{" "}
          <button type="button" onClick={() => setConsulta("")} className="font-semibold text-enlace underline underline-offset-4">
            Ver toda la carta
          </button>
        </p>
      ) : (
        <>
          {/* ── Pestañas de sección (fijas) ── */}
          {secciones.length > 1 ? (
            <nav aria-label="Secciones de la carta" className="pestanas-carta -mx-[var(--tk-margen)] mt-4 px-[var(--tk-margen)] sm:mx-0 sm:px-0">
              <div ref={barra} className="vidrio-alto fila-desliza flex gap-1 rounded-pill p-1">
                {secciones.map((s) => {
                  const sel = s.id === actual;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      data-seccion={s.id}
                      aria-current={sel ? "true" : undefined}
                      onClick={() => setActiva(s.id)}
                      className={[
                        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-[var(--tk-dur-media)]",
                        sel ? "bg-primario text-sobre-primario shadow-primaria" : "text-tenue hover:text-tinta",
                      ].join(" ")}
                    >
                      {s.titulo}
                      <span className={`cifra text-xs ${sel ? "opacity-80" : "opacity-60"}`}>{s.productos.length}</span>
                    </a>
                  );
                })}
              </div>
            </nav>
          ) : null}

          {/* ── Secciones ── */}
          {secciones.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-titulo`} className="mt-8 scroll-mt-40 sm:mt-10">
              <h2 id={`${s.id}-titulo`} className="tipo-bloque flex items-baseline gap-2">
                {s.titulo}
                <span className="cifra text-xs font-semibold tracking-normal text-tenue">{s.productos.length}</span>
              </h2>
              <ul className="mt-2 divide-y divide-linea sm:mt-4 sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0">
                {s.productos.map((p) => (
                  <ProductoFila key={p.id} producto={p} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

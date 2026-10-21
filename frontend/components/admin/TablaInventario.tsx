"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCTOS, type Producto } from "@/lib/catalogo";
import { TIENDAS, clasesAcento } from "@/lib/tiendas";
import { formatoPrecio } from "@/lib/formato";
import { Badge } from "@/components/ui/Badge";

/**
 * Inventario como lista de tarjetas + filtro segmentado (SPEC v3 §2.4).
 *
 * Los endpoints de mutación (`PATCH /inventory/{id}`) todavía no existen, así
 * que los ajustes se guardan como BORRADOR LOCAL y la interfaz lo dice en
 * cada pantalla. No se finge que el cambio llegó al servidor: cuando la API
 * esté publicada, este componente cambia `escribirBorrador` por la llamada
 * real y el resto de la vista se queda igual.
 */

const CLAVE = "tvutb.inventario-borrador";

type Borrador = Record<number, number>;

function leerBorrador(): Borrador {
  if (typeof window === "undefined") return {};
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Borrador) : {};
  } catch {
    return {};
  }
}

export function TablaInventario() {
  const [borrador, setBorrador] = useState<Borrador>({});
  const [busqueda, setBusqueda] = useState("");
  const [tienda, setTienda] = useState<string>("todas");

  useEffect(() => {
    setBorrador(leerBorrador());
  }, []);

  function escribirBorrador(siguiente: Borrador) {
    setBorrador(siguiente);
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(siguiente));
    } catch {
      // almacenamiento bloqueado: el borrador dura la pestaña
    }
  }

  function ajustar(id: number, delta: number, actual: number) {
    const base = borrador[id] ?? actual;
    const nuevo = Math.max(0, Math.min(9999, base + delta));
    escribirBorrador({ ...borrador, [id]: nuevo });
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return PRODUCTOS.filter((p) => {
      if (tienda !== "todas" && p.tienda !== tienda) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q)
      );
    });
  }, [busqueda, tienda]);

  const stock = (p: Producto) => borrador[p.id] ?? p.existencias;
  const cambios = Object.keys(borrador).length;

  const filtros = [
    { clave: "todas", etiqueta: "Todas" },
    ...TIENDAS.map((t) => ({ clave: t.slug as string, etiqueta: t.nombre })),
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filtrar por tienda"
          className="flex flex-wrap gap-1 rounded-[var(--tk-radio-pill)] bg-tarjeta-alta p-1"
        >
          {filtros.map((f) => (
            <button
              key={f.clave}
              type="button"
              onClick={() => setTienda(f.clave)}
              aria-pressed={tienda === f.clave}
              className={[
                "rounded-[var(--tk-radio-pill)] px-3.5 py-1.5 font-display text-[0.75rem] font-semibold uppercase tracking-[0.08em] transition-colors",
                tienda === f.clave
                  ? "gradiente-marca text-superficie"
                  : "text-tenue hover:text-superficie",
              ].join(" ")}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 rounded-[var(--tk-radio-pill)] bg-tarjeta-alta px-4 py-2">
          <span className="rotulo text-tenue">Buscar</span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-40 bg-transparent font-cuerpo text-[0.875rem] text-superficie outline-none placeholder:text-tenue"
            placeholder="producto…"
          />
        </label>
      </div>

      {cambios > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--tk-radio-sm)] border-l-4 border-ambar bg-ambar/10 px-4 py-3">
          <p className="font-cuerpo text-[0.875rem] text-superficie">
            Hay <strong className="cifra">{cambios}</strong>{" "}
            {cambios === 1 ? "cambio" : "cambios"} en borrador local. No se
            enviaron a la API porque el endpoint aún no está publicado.
          </p>
          <button
            type="button"
            onClick={() => escribirBorrador({})}
            className="font-display text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ambar underline underline-offset-4"
          >
            Descartar
          </button>
        </div>
      ) : null}

      <ul className="mt-6 flex flex-col gap-3" aria-label="Inventario por producto">
        {filtrados.map((p) => {
          const t = TIENDAS.find((x) => x.slug === p.tienda);
          const acento = t ? clasesAcento(t.acento) : null;
          const n = stock(p);
          const tocado = borrador[p.id] !== undefined;
          return (
            <li
              key={p.id}
              className={[
                "tarjeta grid gap-4 border-l-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center",
                acento ? acento.borde : "",
              ].join(" ")}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[0.9375rem] font-bold text-superficie">
                    {p.nombre}
                  </span>
                  {p.presentacion ? (
                    <span className="rotulo text-tenue">{p.presentacion}</span>
                  ) : null}
                  {tocado ? <Badge tono="nuevo">Borrador</Badge> : null}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 font-cuerpo text-[0.8125rem] text-tenue">
                  <span className="inline-flex items-center gap-2">
                    {acento ? (
                      <span aria-hidden="true" className={`h-3 w-[4px] ${acento.punto}`} />
                    ) : null}
                    {t?.nombre ?? p.tienda}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="cifra">#{p.id}</span>
                </p>
                <p className="mt-1 max-w-[60ch] font-cuerpo text-[0.8125rem] text-tenue">
                  {p.descripcion}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
                <div className="text-right">
                  <p className="rotulo text-tenue">Precio</p>
                  <p className="cifra font-display text-[0.9375rem] font-bold text-superficie">
                    {formatoPrecio(p.precioCentavos)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="rotulo text-tenue">Existencias</p>
                  <p
                    className={[
                      "cifra font-display text-[1.125rem] font-extrabold",
                      n === 0 ? "text-error" : "text-superficie",
                    ].join(" ")}
                  >
                    {n}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => ajustar(p.id, -1, p.existencias)}
                    aria-label={`Restar una unidad de ${p.nombre}`}
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--tk-radio-pill)] border border-borde font-display font-bold text-superficie"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustar(p.id, 1, p.existencias)}
                    aria-label={`Sumar una unidad de ${p.nombre}`}
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--tk-radio-pill)] border border-borde font-display font-bold text-superficie"
                  >
                    +
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {filtrados.length === 0 ? (
        <p className="cuerpo mt-6 text-tenue">
          No hay productos que coincidan con «{busqueda}».
        </p>
      ) : (
        <p className="mt-4 font-cuerpo text-[0.8125rem] text-tenue">
          <span className="cifra">{filtrados.length}</span>{" "}
          {filtrados.length === 1 ? "producto" : "productos"} en pantalla ·{" "}
          <span className="rotulo text-tenue">cambios sin persistir</span>
        </p>
      )}
    </div>
  );
}

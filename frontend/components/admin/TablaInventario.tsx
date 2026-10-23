"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCTOS, type Producto } from "@/lib/catalogo";
import { TIENDAS, paletaTienda } from "@/lib/tiendas";
import { formatoPrecio } from "@/lib/formato";
import { Badge } from "@/components/ui/Badge";
import { Icono } from "@/components/ui/Icono";
import { EsqueletoTabla } from "@/components/ui/Esqueleto";

/**
 * Inventario en tabla (SPEC v4 §3, `/admin`): filtro segmentado por tienda,
 * búsqueda y filas con ajuste ±1. Desde `md` es una rejilla de cuatro
 * columnas con cabecera; en móvil cada fila apila sus datos.
 *
 * Los endpoints de mutación (`PATCH /inventory/{id}`) todavía no existen, así
 * que los ajustes se guardan como BORRADOR LOCAL y la interfaz lo dice. No se
 * finge que el cambio llegó al servidor: cuando la API esté publicada, este
 * componente cambia `escribirBorrador` por la llamada real.
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
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tienda, setTienda] = useState<string>("todas");

  useEffect(() => {
    setBorrador(leerBorrador());
    setCargando(false);
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
      return p.nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q);
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Filtrar por tienda"
          className="fila-desliza flex gap-1 rounded-md bg-suave-2 p-1"
        >
          {filtros.map((f) => (
            <button
              key={f.clave}
              type="button"
              onClick={() => setTienda(f.clave)}
              aria-pressed={tienda === f.clave}
              className={[
                "h-11 shrink-0 whitespace-nowrap rounded-sm px-4 text-sm font-bold transition-colors duration-[var(--tk-dur)]",
                tienda === f.clave ? "bg-tarjeta text-tinta shadow-pestana" : "text-tenue hover:text-tinta",
              ].join(" ")}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        <label className="flex h-[52px] items-center gap-2.5 rounded-pill border border-borde bg-tarjeta px-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[color:var(--tk-foco)] lg:w-72">
          <Icono nombre="buscar" tamano={18} className="shrink-0 text-tenue" />
          <span className="sr-only">Buscar producto</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-tinta outline-none"
            placeholder="Buscar producto…"
          />
        </label>
      </div>

      {cambios > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm bg-aviso-suave px-4 py-2 text-aviso">
          <p className="text-sm">
            Hay <strong className="cifra">{cambios}</strong> {cambios === 1 ? "cambio" : "cambios"} en
            borrador local. No se enviaron a la API porque el endpoint aún no
            está publicado.
          </p>
          <button
            type="button"
            onClick={() => escribirBorrador({})}
            className="min-h-11 text-sm font-bold underline underline-offset-4"
          >
            Descartar
          </button>
        </div>
      ) : null}

      <div className="mt-5">
        {cargando ? (
          <div aria-busy="true">
            <span className="sr-only">Cargando el inventario…</span>
            <EsqueletoTabla filas={6} />
          </div>
        ) : (
          <div className="tarjeta overflow-hidden">
            <div
              aria-hidden="true"
              className="hidden grid-cols-[1fr_8rem_7rem_8rem] gap-4 border-b border-linea px-5 py-3.5 md:grid"
            >
              <span className="rotulo text-tenue">Producto</span>
              <span className="rotulo text-tenue">Precio</span>
              <span className="rotulo text-tenue">Existencias</span>
              <span className="rotulo text-right text-tenue">Ajuste</span>
            </div>
            <ul aria-label="Inventario por producto">
              {filtrados.map((p) => {
                const t = TIENDAS.find((x) => x.slug === p.tienda);
                const paleta = paletaTienda(p.tienda);
                const n = stock(p);
                const tocado = borrador[p.id] !== undefined;
                return (
                  <li
                    key={p.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-linea px-5 py-4 last:border-b-0 md:grid-cols-[1fr_8rem_7rem_8rem]"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {p.nombre}
                        {p.presentacion ? (
                          <span className="text-sm font-normal text-tenue">· {p.presentacion}</span>
                        ) : null}
                        {tocado ? <Badge tono="nuevo">Borrador</Badge> : null}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-tenue">
                        <span aria-hidden="true" className={`h-2 w-2 rounded-pill ${paleta.relleno}`} />
                        {t?.nombre ?? p.tienda}
                        <span aria-hidden="true">·</span>
                        <span className="cifra font-mono">id {p.id}</span>
                        <span className="md:hidden">
                          · {formatoPrecio(p.precioCentavos)} ·{" "}
                          <span className={n === 0 ? "font-bold text-error" : "font-bold text-tinta"}>
                            {n === 0 ? "Agotado" : `${n} u.`}
                          </span>
                        </span>
                      </p>
                    </div>

                    <p className="cifra hidden font-semibold md:block">
                      <span className="sr-only">Precio: </span>
                      {formatoPrecio(p.precioCentavos)}
                    </p>

                    <p
                      className={[
                        "cifra hidden text-lg font-bold md:block",
                        n === 0 ? "text-error" : "text-tinta",
                      ].join(" ")}
                    >
                      <span className="sr-only">Existencias: </span>
                      {n}
                      {n === 0 ? <span className="ml-1.5 text-xs font-bold">Agotado</span> : null}
                    </p>

                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => ajustar(p.id, -1, p.existencias)}
                        disabled={n === 0}
                        aria-label={`Restar una unidad de ${p.nombre}`}
                        className="flex h-11 w-11 items-center justify-center rounded-pill border border-borde text-tinta transition-colors hover:bg-suave disabled:opacity-35"
                      >
                        <Icono nombre="menos" tamano={18} grosor={2.4} />
                      </button>
                      <button
                        type="button"
                        onClick={() => ajustar(p.id, 1, p.existencias)}
                        aria-label={`Sumar una unidad de ${p.nombre}`}
                        className="flex h-11 w-11 items-center justify-center rounded-pill border border-borde text-tinta transition-colors hover:bg-suave"
                      >
                        <Icono nombre="mas" tamano={18} grosor={2.4} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {!cargando && filtrados.length === 0 ? (
        <p className="mt-6 text-tenue">No hay productos que coincidan con «{busqueda}».</p>
      ) : !cargando ? (
        <p className="mt-4 text-[0.8125rem] text-tenue">
          <span className="cifra">{filtrados.length}</span>{" "}
          {filtrados.length === 1 ? "producto" : "productos"} en pantalla · cambios sin persistir
        </p>
      ) : null}
    </div>
  );
}

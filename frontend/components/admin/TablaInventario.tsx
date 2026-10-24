"use client";

import { useMemo, useState } from "react";
import type { ProductOut, TiendaOut, UserOut } from "@/lib/api/generated/contract";
import { ApiError } from "@/lib/api/client";
import { ajustarExistencias, fijarExistencias, type FilaAdmin } from "@/lib/admin";
import { administraTienda, gestionaInventario } from "@/lib/roles";
import { paletaTienda } from "@/lib/tiendas";
import { formatoPrecio } from "@/lib/formato";
import { Badge } from "@/components/ui/Badge";
import { Icono } from "@/components/ui/Icono";

/**
 * Inventario en tabla (SPEC v4 §3, `/admin`): filtro segmentado por tienda,
 * búsqueda y filas con ajuste ±1. Desde `md` es una rejilla de cuatro
 * columnas con cabecera; en móvil cada fila apila sus datos.
 *
 * Cada cambio va a la API en el momento: ±1 con `POST /inventory/{id}/adjust`
 * (un delta atómico, así dos personas ajustando a la vez no se pisan) y el
 * número escrito tras un conteo con `PUT /inventory/{id}`. La fila muestra lo
 * que la API devolvió, nunca un valor supuesto.
 */

const MOTIVO_AJUSTE = "Ajuste manual desde el panel";
const MOTIVO_CONTEO = "Conteo de existencias";

export function TablaInventario({
  filas,
  tiendas,
  usuario,
  alActualizar,
  alEditar,
}: Readonly<{
  filas: FilaAdmin[];
  tiendas: TiendaOut[];
  usuario: UserOut;
  alActualizar: (productoId: number, existencias: number) => void;
  alEditar: (producto: ProductOut) => void;
}>) {
  const [busqueda, setBusqueda] = useState("");
  const [tienda, setTienda] = useState<string>("todas");
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const idDeTienda = useMemo(
    () => new Map(tiendas.map((t) => [t.identificador, t.id])),
    [tiendas],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter(({ producto: p }) => {
      if (tienda !== "todas" && p.tienda !== tienda) return false;
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q);
    });
  }, [filas, busqueda, tienda]);

  const filtros = [
    { clave: "todas", etiqueta: "Todas" },
    ...tiendas.map((t) => ({ clave: t.identificador, etiqueta: t.nombre })),
  ];

  async function guardar(
    productoId: number,
    accion: () => Promise<{ cantidad: number }>,
  ): Promise<boolean> {
    setError(null);
    setOcupado(productoId);
    try {
      const item = await accion();
      alActualizar(productoId, item.cantidad);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar el cambio.");
      return false;
    } finally {
      setOcupado(null);
    }
  }

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

      {error ? (
        <p role="alert" className="mt-4 rounded-sm bg-error-suave px-4 py-2.5 text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-5">
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
            {filtrados.map(({ producto: p, existencias: n }) => {
              const slug = p.tienda ?? "";
              const tiendaId = idDeTienda.get(slug);
              const t = tiendas.find((x) => x.identificador === slug);
              const paleta = paletaTienda(slug);
              const puedeStock = tiendaId !== undefined && gestionaInventario(usuario, tiendaId);
              const puedeEditar = tiendaId !== undefined && administraTienda(usuario, tiendaId);
              const enCurso = ocupado === p.id;
              return (
                <li
                  key={p.id}
                  aria-busy={enCurso}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-linea px-5 py-4 last:border-b-0 md:grid-cols-[1fr_8rem_7rem_8rem]"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.nombre}
                      {p.activo === false ? <Badge tono="cerrado">Inactivo</Badge> : null}
                      {p.precio_confirmado === false ? <Badge tono="muestra">Referencia</Badge> : null}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-tenue">
                      <span aria-hidden="true" className={`h-2 w-2 rounded-pill ${paleta.relleno}`} />
                      {t?.nombre ?? slug}
                      <span aria-hidden="true">·</span>
                      <span className="cifra font-mono">id {p.id}</span>
                      <span className="md:hidden">
                        · {formatoPrecio(p.precio_centavos)}
                      </span>
                      {puedeEditar ? (
                        <button
                          type="button"
                          onClick={() => alEditar(p)}
                          className="min-h-11 font-semibold text-enlace underline underline-offset-4"
                        >
                          Editar<span className="sr-only"> {p.nombre}</span>
                        </button>
                      ) : null}
                    </p>
                  </div>

                  <p className="cifra hidden font-semibold md:block">
                    <span className="sr-only">Precio: </span>
                    {formatoPrecio(p.precio_centavos)}
                  </p>

                  {puedeStock ? (
                    <>
                      <Conteo
                        key={`${p.id}-${n}`}
                        nombre={p.nombre}
                        existencias={n}
                        deshabilitado={enCurso}
                        alGuardar={(cantidad) =>
                          guardar(p.id, () => fijarExistencias(p.id, cantidad, MOTIVO_CONTEO))
                        }
                      />

                      <div className="col-span-2 flex justify-end gap-1.5 md:col-span-1">
                        <button
                          type="button"
                          onClick={() => guardar(p.id, () => ajustarExistencias(p.id, -1, MOTIVO_AJUSTE))}
                          disabled={n === 0 || enCurso}
                          aria-label={`Restar una unidad de ${p.nombre}`}
                          className="flex h-11 w-11 items-center justify-center rounded-pill border border-borde text-tinta transition-colors hover:bg-suave disabled:opacity-35"
                        >
                          <Icono nombre="menos" tamano={18} grosor={2.4} />
                        </button>
                        <button
                          type="button"
                          onClick={() => guardar(p.id, () => ajustarExistencias(p.id, 1, MOTIVO_AJUSTE))}
                          disabled={enCurso}
                          aria-label={`Sumar una unidad de ${p.nombre}`}
                          className="flex h-11 w-11 items-center justify-center rounded-pill border border-borde text-tinta transition-colors hover:bg-suave disabled:opacity-35"
                        >
                          <Icono nombre="mas" tamano={18} grosor={2.4} />
                        </button>
                      </div>
                    </>
                  ) : (
                    // Sin permiso (otra tienda o supervisión): el número, sin controles.
                    <SoloLectura nombre={p.nombre} existencias={n} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="mt-6 text-tenue">
          {busqueda ? `No hay productos que coincidan con «${busqueda}».` : "No hay productos en esta tienda."}
        </p>
      ) : (
        <p className="mt-4 text-[0.8125rem] text-tenue">
          <span className="cifra">{filtrados.length}</span>{" "}
          {filtrados.length === 1 ? "producto" : "productos"} en pantalla ·{" "}
          {filtrados.some(({ producto }) => {
            const id = idDeTienda.get(producto.tienda ?? "");
            return id !== undefined && gestionaInventario(usuario, id);
          })
            ? "los cambios se guardan al momento"
            : "solo lectura"}
        </p>
      )}
    </div>
  );
}

/** Existencias de una fila que el usuario no gestiona: solo el número. */
function SoloLectura({ nombre, existencias }: Readonly<{ nombre: string; existencias: number }>) {
  return (
    <p className="flex items-center gap-1.5 md:col-span-2">
      <span className="sr-only">Existencias de {nombre}: </span>
      <span
        className={["cifra text-lg font-bold", existencias === 0 ? "text-error" : "text-tinta"].join(" ")}
      >
        {existencias}
      </span>
      {existencias === 0 ? <span className="text-xs font-bold text-error">Agotado</span> : null}
      <span className="text-xs text-tenue">· solo lectura</span>
    </p>
  );
}

/**
 * Existencias editables: escribir el número contado y pulsar Enter (o salir
 * del campo) lo fija con `PUT`. Se vuelve a montar con cada valor de la API
 * (`key`), así que nunca muestra un número que el servidor no confirmó.
 */
function Conteo({
  nombre,
  existencias,
  deshabilitado,
  alGuardar,
}: Readonly<{
  nombre: string;
  existencias: number;
  deshabilitado: boolean;
  alGuardar: (cantidad: number) => Promise<boolean>;
}>) {
  const [valor, setValor] = useState(String(existencias));

  function confirmar() {
    const cantidad = Number(valor);
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      setValor(String(existencias));
      return;
    }
    if (cantidad === existencias) return;
    // Si la API lo rechaza, el campo vuelve al último valor confirmado.
    void alGuardar(cantidad).then((ok) => {
      if (!ok) setValor(String(existencias));
    });
  }

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">Existencias de {nombre}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={9999}
        value={valor}
        disabled={deshabilitado}
        onChange={(e) => setValor(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={[
          "cifra h-11 w-20 rounded-sm border border-borde bg-tarjeta px-2 text-lg font-bold disabled:opacity-60",
          existencias === 0 ? "text-error" : "text-tinta",
        ].join(" ")}
      />
      {existencias === 0 ? <span className="text-xs font-bold text-error">Agotado</span> : null}
    </label>
  );
}

"use client";

import type { Producto } from "@/lib/catalogo";
import { formatoPrecio } from "@/lib/formato";
import { nombreTienda, paletaTienda } from "@/lib/tiendas";
import { useProductoEnPedido } from "./useProductoEnPedido";
import { Icono } from "@/components/ui/Icono";
import { FotoProducto } from "./FotoProducto";
import { Cantidad } from "./Cantidad";

/**
 * Tarjeta de producto (artefacto «A · Tienda escritorio» / «A · Tienda móvil»).
 *
 * - `adaptable` (carta de la tienda): en móvil es la FILA del artefacto —
 *   miniatura de 88 px, texto y botón «+» redondo—; desde `sm` es la TARJETA
 *   con foto 4:3, existencias arriba y «Agregar».
 * - `vertical` (portada, «Lo más pedido»): siempre tarjeta, con el chip de la
 *   tienda sobre la foto.
 *
 * Al agregar, el botón cede su sitio al control de cantidad con un pequeño
 * rebote (GSAP, solo `transform`) y un anuncio para lectores de pantalla.
 * Lo agotado se dice («Agotado»), nunca se esconde.
 */
export function ProductoCard({
  producto,
  disposicion = "adaptable",
  mostrarTienda = false,
  className = "",
}: {
  producto: Producto;
  disposicion?: "adaptable" | "vertical";
  mostrarTienda?: boolean;
  className?: string;
}) {
  const { cantidad, agotado, enPausa, bloqueado, ultimas, nombre, accion, anuncio, sumar, restar } =
    useProductoEnPedido(producto);
  const paleta = paletaTienda(producto.tienda);

  const vertical = disposicion === "vertical";

  const existencias = agotado ? (
    <span className="text-error">Agotado</span>
  ) : ultimas ? (
    <span className="text-aviso">
      Últimas {producto.existencias} {producto.existencias === 1 ? "unidad" : "unidades"}
    </span>
  ) : (
    <span>Quedan {producto.existencias}</span>
  );

  return (
    // `relative`: el anuncio `sr-only` del final es absoluto. Sin un ancestro
    // posicionado escapa del recorte de `.fila-desliza` (portada, «Lo más
    // pedido») y ensancha la página en móvil: el navegador aleja el zoom y
    // la barra «Ver pedido» y la navegación inferior se ven «de escritorio».
    <li
      id={producto.slug}
      data-escalon=""
      className={[
        "levanta group/producto relative flex scroll-mt-28",
        className,
        // Tarjeta de vidrio con la foto en un campo translúcido de esquinas
        // suaves y el texto debajo, alineado a la izquierda. En móvil la
        // carta de la tienda sigue siendo una lista de filas (se recorre con
        // el pulgar); desde `sm` cada producto es su propia tarjeta.
        vertical
          ? "vidrio h-full flex-col p-2"
          : "items-center gap-3.5 border-b border-linea py-3.5 vidrio-sm sm:h-full sm:flex-col sm:items-stretch sm:gap-0 sm:p-2",
      ].join(" ")}
    >
      {/* Marco de la foto: el recorte sin fondo sobre el gris de estudio.
          Recorta el acercamiento lento del hover (`.zoom`). */}
      <div
        className={
          vertical
            ? "relative aspect-[4/5] w-full overflow-hidden rounded-md bg-[color:var(--tk-campo-foto)]"
            : "relative h-[110px] w-[88px] shrink-0 overflow-hidden rounded-md bg-[color:var(--tk-campo-foto)] sm:aspect-[4/5] sm:h-auto sm:w-full"
        }
      >
        <FotoProducto
          slug={producto.slug}
          tienda={producto.tienda}
          tamanoIcono={vertical ? 40 : 30}
          className="zoom h-full w-full"
        />
        <span aria-hidden="true" className="contents">
          {mostrarTienda ? (
            <span
              className={`absolute left-2.5 top-2.5 inline-flex h-6 items-center rounded-pill px-2.5 tipo-micro sm:left-3 sm:top-3 ${paleta.relleno} ${paleta.sobreRelleno}`}
            >
              {nombreTienda(producto.tienda)}
            </span>
          ) : (
            <span
              className={[
                "vidrio-alto absolute left-3 top-3 hidden h-6 items-center rounded-pill px-2.5 tipo-micro sm:inline-flex",
                agotado ? "text-error" : ultimas ? "text-aviso" : "text-tenue",
              ].join(" ")}
            >
              {existencias}
            </span>
          )}
        </span>
      </div>

      <div
        className={
          vertical
            ? "flex flex-1 flex-col gap-0.5 px-1.5 pb-1 pt-3"
            : "flex min-w-0 flex-1 flex-col gap-0.5 sm:px-1.5 sm:pb-1 sm:pt-3"
        }
      >
        <h3 className="tipo-nombre">
          {nombre}
        </h3>
        <p className={`text-xs leading-snug text-tenue ${vertical ? "line-clamp-1" : "line-clamp-2 sm:line-clamp-1"}`}>
          {vertical && producto.esMuestra ? "Precio de referencia" : producto.descripcion}
        </p>
        {!vertical && producto.sabores?.length ? (
          <p className="text-[0.8125rem] leading-snug text-tenue">
            Sabores: {producto.sabores.join(" · ")}. Se elige al recoger.
          </p>
        ) : null}

        <div
          className={
            vertical
              ? "mt-auto flex items-center justify-between gap-2 pt-1.5"
              : "mt-1.5 flex items-center justify-between gap-3 sm:mt-auto sm:pt-1.5"
          }
        >
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
            <span className="cifra font-display text-[0.8125rem] font-semibold tracking-[0.02em]">
              {formatoPrecio(producto.precioCentavos)}
            </span>
            {!vertical ? (
              // En móvil se ve aquí; desde `sm` se ve sobre la foto (que es
              // decorativa) y aquí queda solo para lectores de pantalla.
              <span className="text-xs font-semibold text-tenue sm:sr-only">{existencias}</span>
            ) : null}
            {!vertical && producto.esMuestra ? (
              <span className="text-xs font-semibold text-aviso">Referencia</span>
            ) : null}
          </div>

          <div ref={accion} className="shrink-0">
            {cantidad > 0 ? (
              <Cantidad
                cantidad={cantidad}
                nombre={nombre}
                maximo={producto.existencias}
                alRestar={restar}
                alSumar={sumar}
              />
            ) : (
              <button
                type="button"
                onClick={sumar}
                disabled={bloqueado}
                aria-label={
                  agotado
                    ? `${nombre} está agotado`
                    : enPausa
                      ? `Apartar ${nombre} está en pausa: sin conexión con la tienda`
                      : `Agregar ${nombre} al pedido`
                }
                className={[
                  "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill tipo-accion transition-colors duration-[var(--tk-dur)]",
                  bloqueado
                    ? "whitespace-nowrap bg-suave px-3.5 text-tenue sm:px-4"
                    : "border border-primario text-enlace hover:bg-primario hover:text-sobre-primario sm:px-4",
                  vertical ? "-m-1.5 sm:m-0" : "",
                ].join(" ")}
              >
                {agotado ? (
                  "Sin unidades"
                ) : enPausa ? (
                  "En pausa"
                ) : (
                  <>
                    <Icono nombre="mas" tamano={18} grosor={2.4} className="sm:hidden" />
                    <span className="hidden sm:inline">Agregar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {anuncio}
      </span>
    </li>
  );
}

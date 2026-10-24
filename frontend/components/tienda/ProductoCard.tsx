"use client";

import { useRef, useState } from "react";
import type { Producto } from "@/lib/catalogo";
import { formatoPrecio } from "@/lib/formato";
import { agregar, cambiarCantidad, useCarrito } from "@/lib/carrito";
import { useCatalogo } from "./CatalogoProvider";
import { nombreTienda, paletaTienda } from "@/lib/tiendas";
import { gsap, useGSAP, CONDICIONES, MOVIMIENTO } from "@/lib/movimiento";
import { Icono } from "@/components/ui/Icono";
import { MarcadorFoto } from "./MarcadorFoto";
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
  const { carrito } = useCarrito();
  const cantidad = carrito.lineas.find((l) => l.productoId === producto.id)?.cantidad ?? 0;
  const agotado = producto.existencias <= 0;
  // Catálogo de respaldo: sin existencias reales no se aparta (AvisoRespaldo).
  const enPausa = useCatalogo().origen === "respaldo";
  const bloqueado = agotado || enPausa;
  const ultimas = !agotado && producto.existencias <= 3;
  const paleta = paletaTienda(producto.tienda);
  const nombre = producto.presentacion
    ? `${producto.nombre} · ${producto.presentacion.toLowerCase()}`
    : producto.nombre;

  const accion = useRef<HTMLDivElement>(null);
  const [anuncio, setAnuncio] = useState("");
  const [pulsos, setPulsos] = useState(0);

  // Rebote de confirmación en la zona de acción cada vez que se agrega.
  useGSAP(
    () => {
      if (pulsos === 0 || !accion.current) return;
      const mm = gsap.matchMedia();
      mm.add(CONDICIONES.movimiento, () => {
        gsap.fromTo(
          accion.current,
          { scale: 0.9 },
          {
            scale: 1,
            duration: MOVIMIENTO.pulso.duracion,
            ease: MOVIMIENTO.pulso.ease,
            clearProps: "transform",
          },
        );
      });
    },
    { dependencies: [pulsos], scope: accion },
  );

  function sumar() {
    if (bloqueado) return;
    agregar(producto, 1);
    setPulsos((n) => n + 1);
    setAnuncio(`${nombre}: ${cantidad + 1} en tu pedido`);
  }

  function restar() {
    cambiarCantidad(producto.id, cantidad - 1, producto.existencias);
    setAnuncio(cantidad - 1 > 0 ? `${nombre}: ${cantidad - 1} en tu pedido` : `${nombre} salió del pedido`);
  }

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
        "group/producto relative flex scroll-mt-24",
        className,
        vertical
          ? "levanta h-full flex-col overflow-hidden rounded-tarjeta border border-linea bg-tarjeta"
          : "levanta items-center gap-3.5 border-b border-linea py-4 sm:h-full sm:flex-col sm:items-stretch sm:gap-0 sm:overflow-hidden sm:rounded-tarjeta sm:border sm:bg-tarjeta sm:py-0",
      ].join(" ")}
    >
      <MarcadorFoto
        slug={producto.tienda}
        tamanoIcono={vertical ? 32 : 26}
        className={
          vertical
            ? "aspect-[4/3] w-full"
            : "h-[88px] w-[88px] shrink-0 rounded-md sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none"
        }
      >
        {mostrarTienda ? (
          <span
            className={`absolute left-2.5 top-2.5 inline-flex h-6 items-center rounded-pill px-2.5 text-xs font-bold sm:left-3 sm:top-3 ${paleta.relleno} ${paleta.sobreRelleno}`}
          >
            {nombreTienda(producto.tienda)}
          </span>
        ) : (
          <span
            className={[
              "absolute left-3 top-3 hidden h-[26px] items-center rounded-pill bg-tarjeta px-2.5 text-xs font-bold sm:inline-flex",
              agotado ? "text-error" : ultimas ? "text-aviso" : "text-tenue",
            ].join(" ")}
          >
            {existencias}
          </span>
        )}
      </MarcadorFoto>

      <div
        className={
          vertical
            ? "flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5 sm:gap-1.5 sm:px-5 sm:pb-5 sm:pt-4"
            : "flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1.5 sm:px-5 sm:pb-5 sm:pt-4"
        }
      >
        <h3
          className={
            vertical
              ? "text-[0.9375rem] font-semibold leading-snug sm:text-lg"
              : "text-base font-semibold leading-snug sm:text-lg"
          }
        >
          {nombre}
        </h3>
        <p className="text-[0.8125rem] leading-snug text-tenue sm:text-sm">
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
              ? "mt-auto flex items-center justify-between gap-2 pt-1.5 sm:pt-3.5"
              : "mt-1.5 flex items-center justify-between gap-3 sm:mt-auto sm:pt-2.5"
          }
        >
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
            <span className="cifra text-base font-bold sm:text-xl">
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
                  "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill font-bold transition-colors duration-[var(--tk-dur)]",
                  bloqueado
                    ? "whitespace-nowrap bg-suave px-3.5 text-[0.8125rem] text-tenue sm:px-4 sm:text-sm"
                    : "bg-primario text-sobre-primario hover:bg-primario-hover sm:px-[1.125rem] sm:text-sm",
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

"use client";

import { esParaCompartir, normalizar, type Producto } from "@/lib/catalogo";
import { formatoPrecio } from "@/lib/formato";
import { Icono } from "@/components/ui/Icono";
import { FotoProducto } from "./FotoProducto";
import { Cantidad } from "./Cantidad";
import { useProductoEnPedido } from "./useProductoEnPedido";

/**
 * Fila de producto de la carta (SPEC v5 §3.2), al modo de las apps de
 * domicilios: texto a la izquierda —nombre, descripción, precio y
 * existencias— y la foto cuadrada a la derecha con el «+» flotando sobre su
 * esquina, al alcance del pulgar. Al agregar, el «+» se vuelve el control de
 * cantidad en el mismo sitio.
 *
 * Móvil: fila de una lista (los separadores los pone la lista). Desde `sm`:
 * tarjeta de vidrio (la carta pasa a dos columnas). Lo agotado se dice y la foto se apaga, nunca se
 * esconde.
 */
export function ProductoFila({ producto }: { producto: Producto }) {
  const {
    cantidad,
    agotado,
    enPausa,
    bloqueado,
    ultimas,
    nombre,
    accion,
    anuncio,
    sumar,
    restar,
    textoExistencias,
    etiquetaAgregar,
  } = useProductoEnPedido(producto);

  return (
    // `relative`: contiene el anuncio `sr-only` del final (ver ProductoCard).
    <li
      id={producto.slug}
      className="vidrio-sm relative flex scroll-mt-40 gap-4 py-4 sm:p-3.5"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[0.9375rem] font-semibold leading-snug text-tinta">
          {producto.nombre}
          {/* La presentación solo se añade si el nombre no la dice ya
              («De todito grande» no necesita «· grande»). */}
          {producto.presentacion && !normalizar(producto.nombre).includes(normalizar(producto.presentacion)) ? (
            <span className="font-normal text-tenue"> · {producto.presentacion.toLowerCase()}</span>
          ) : null}
        </h3>
        <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-tenue">{producto.descripcion}</p>
        {producto.sabores?.length ? (
          <p className="mt-1 line-clamp-1 text-xs text-tenue">Sabores: {producto.sabores.join(" · ")}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5">
          <span className="cifra text-[0.9375rem] font-bold text-tinta">{formatoPrecio(producto.precioCentavos)}</span>
          {producto.esMuestra ? (
            <span className="rounded-pill bg-aviso-suave px-2 py-0.5 text-[0.6875rem] font-semibold text-aviso">
              Referencia
            </span>
          ) : null}
          {esParaCompartir(producto) ? (
            <span className="rounded-pill bg-primario-suave px-2 py-0.5 text-[0.6875rem] font-semibold text-enlace">
              Para compartir
            </span>
          ) : null}
        </div>
        <p className={`mt-1 text-xs font-medium ${agotado ? "text-error" : ultimas ? "text-aviso" : "text-tenue"}`}>
          {textoExistencias}
        </p>
      </div>

      <div className="relative shrink-0 self-start">
        <FotoProducto
          slug={producto.slug}
          tienda={producto.tienda}
          tamanoIcono={30}
          className={`h-28 w-28 rounded-md sm:h-32 sm:w-32 ${agotado ? "opacity-45 grayscale" : ""}`}
        />
        {/* Acción flotante sobre la esquina de la foto. El contenedor no
            recorta: el control de cantidad crece hacia la izquierda. */}
        <div ref={accion} className="absolute -bottom-2 -right-1.5">
          {cantidad > 0 ? (
            <Cantidad
              cantidad={cantidad}
              nombre={nombre}
              maximo={producto.existencias}
              alRestar={restar}
              alSumar={sumar}
              variante="flotante"
            />
          ) : bloqueado ? (
            <span
              role="img"
              aria-label={etiquetaAgregar}
              className="inline-flex h-8 items-center rounded-pill bg-tarjeta px-3 text-[0.6875rem] font-semibold text-tenue shadow-[var(--tk-vidrio-sombra)]"
            >
              {agotado ? "Agotado" : enPausa ? "En pausa" : null}
            </span>
          ) : (
            <button
              type="button"
              onClick={sumar}
              aria-label={etiquetaAgregar}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-tarjeta text-enlace shadow-[var(--tk-vidrio-sombra-alta)] transition-[background-color,color,transform] duration-[var(--tk-dur)] hover:bg-primario hover:text-sobre-primario active:scale-95"
            >
              <Icono nombre="mas" tamano={20} grosor={2.4} />
            </button>
          )}
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {anuncio}
      </span>
    </li>
  );
}

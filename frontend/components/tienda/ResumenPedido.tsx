"use client";

import { useCarrito, totalCentavos, abrirPedido } from "@/lib/carrito";
import { productoPorId } from "@/lib/catalogo";
import { useCatalogo } from "./CatalogoProvider";
import { formatoPrecio } from "@/lib/formato";
import { Boton } from "@/components/ui/Boton";
import { Esqueleto } from "@/components/ui/Esqueleto";

/**
 * «Tu pedido» al lado de la carta (artefacto «A · Tienda escritorio»).
 * El pedido es global: muestra todas las líneas aunque vengan de otras
 * tiendas. Mientras lee el almacenamiento local muestra su esqueleto, con
 * el mismo alto de cabecera y botón, para no saltar.
 */
export function ResumenPedido() {
  const { carrito, cargando } = useCarrito();
  const { productos } = useCatalogo();
  const total = totalCentavos(carrito, productos);
  const vacio = carrito.lineas.length === 0;

  return (
    <aside
      aria-labelledby="titulo-resumen"
      className="rounded-lg bg-tarjeta p-6 shadow-tarjeta lg:sticky lg:top-6"
    >
      <h2 id="titulo-resumen" className="font-display text-[1.625rem] font-semibold">
        Tu pedido
      </h2>

      {cargando ? (
        <div aria-busy="true" className="mt-3 flex flex-col gap-2">
          <span className="sr-only">Cargando tu pedido…</span>
          <Esqueleto className="h-5 w-full" />
          <Esqueleto className="h-5 w-4/5" />
        </div>
      ) : vacio ? (
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-tenue">
          Todavía no agregas nada. Puedes mezclar tiendas en un mismo pedido.
        </p>
      ) : (
        <ul className="mt-3">
          {carrito.lineas.map((l) => {
            const p = productoPorId(productos, l.productoId);
            if (!p) return null;
            return (
              <li
                key={l.productoId}
                className="flex justify-between gap-3 border-b border-linea py-2.5 text-[0.9375rem]"
              >
                <span>
                  <strong className="cifra font-bold">{l.cantidad}×</strong> {p.nombre}
                  {p.presentacion ? ` · ${p.presentacion.toLowerCase()}` : ""}
                </span>
                <span className="cifra whitespace-nowrap font-semibold">
                  {formatoPrecio(p.precioCentavos * l.cantidad)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="my-4 flex items-baseline justify-between">
        <span className="text-[0.9375rem] text-tenue">Total</span>
        <span className="cifra text-2xl font-bold">{formatoPrecio(total)}</span>
      </div>

      <Boton
        variante="primario"
        tamano="lg"
        bloque
        cuadrado
        onClick={abrirPedido}
        disabled={cargando || vacio}
      >
        Elegir hora de recogida
      </Boton>
      <p className="mt-3 text-[0.8125rem] leading-snug text-tenue">
        Pagas en el mostrador al recoger.
      </p>
    </aside>
  );
}

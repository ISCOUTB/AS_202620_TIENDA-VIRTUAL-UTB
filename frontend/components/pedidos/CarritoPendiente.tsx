"use client";

import { useCarrito, totalCentavos, unidades, porTienda, abrirPedido } from "@/lib/carrito";
import { formatoHora, formatoPrecio } from "@/lib/formato";
import { productoPorId } from "@/lib/catalogo";
import { nombreTienda, paletaTienda } from "@/lib/tiendas";
import { Boton } from "@/components/ui/Boton";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useCatalogo } from "@/components/tienda/CatalogoProvider";

/**
 * «Por apartar» de `/pedidos`: el carrito agrupado por tienda, como se verá
 * en cada mostrador. Elegir la hora y confirmar sigue en el panel lateral
 * (`abrirPedido`), para que el checkout viva en un solo componente.
 */
export function CarritoPendiente() {
  const { carrito, cargando } = useCarrito();
  const { productos } = useCatalogo();

  const n = unidades(carrito);
  const total = totalCentavos(carrito, productos);
  const grupos = porTienda(carrito, productos);

  return (
    <section
      data-escalon=""
      aria-labelledby="por-apartar"
      className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="por-apartar" className="font-display text-2xl font-semibold">
          Por apartar
        </h2>
        <span className="cifra text-sm font-semibold text-tenue">
          {n} {n === 1 ? "unidad" : "unidades"}
        </span>
      </div>

      {cargando ? (
        <div aria-busy="true" className="mt-4 flex flex-col gap-2">
          <span className="sr-only">Cargando tu carrito…</span>
          <Esqueleto className="h-5 w-3/4" />
          <Esqueleto className="h-5 w-1/2" />
        </div>
      ) : n === 0 ? (
        <div className="mt-4">
          <p className="leading-relaxed text-tenue">
            Todavía no agregas nada. Puedes mezclar productos de varias tiendas
            en un mismo pedido.
          </p>
          <div className="mt-4">
            <Boton href="/#tiendas" variante="suave">
              Ver las tiendas
            </Boton>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {grupos.map((g) => {
            const p = paletaTienda(g.tienda);
            return (
              <div key={g.tienda} className="rounded-md border border-linea p-4">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-pill ${p.relleno}`} />
                  {nombreTienda(g.tienda)}
                </p>
                <ul className="mt-2">
                  {g.items.map((item) => (
                    <li
                      key={item.nombre}
                      className="flex items-baseline justify-between gap-4 border-b border-linea py-2 text-[0.9375rem] last:border-b-0"
                    >
                      <span>{item.nombre}</span>
                      <span className="cifra shrink-0 text-tenue">×{item.cantidad}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {carrito.horaRecogida ? (
            <p className="text-sm text-tenue">
              Recogida:{" "}
              <span className="cifra font-semibold text-tinta">{formatoHora(carrito.horaRecogida)}</span>
            </p>
          ) : null}

          <div className="flex items-baseline justify-between border-t border-linea pt-3">
            <span className="text-tenue">Total</span>
            <span className="cifra text-2xl font-bold">{formatoPrecio(total)}</span>
          </div>

          <p className="text-[0.8125rem] leading-relaxed text-tenue">
            {carrito.lineas.some((l) => productoPorId(productos, l.productoId)?.esMuestra)
              ? "Incluye precios de referencia: la tienda los confirma en el mostrador. "
              : ""}
            Aún no está apartado: al confirmar pasa a «Apartados» y pagas en el
            mostrador al recoger.
          </p>

          <Boton variante="primario" tamano="lg" bloque cuadrado onClick={abrirPedido}>
            Elegir hora y apartar
          </Boton>
        </div>
      )}
    </section>
  );
}

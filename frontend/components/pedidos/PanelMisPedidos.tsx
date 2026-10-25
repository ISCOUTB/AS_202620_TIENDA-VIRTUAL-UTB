"use client";

import { useSesion } from "@/lib/sesion";
import { Boton } from "@/components/ui/Boton";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Revelar } from "@/components/motion/Revelar";
import { CarritoPendiente } from "./CarritoPendiente";
import { MisPedidos } from "./MisPedidos";

/**
 * `/pedidos`: lo que falta apartar y lo ya apartado, en una sola pantalla,
 * para que al confirmar se vea el carrito convertirse en pedido.
 *
 * La página es pública porque el carrito existe sin sesión; solo la lista
 * de pedidos la necesita, y sin ella se invita a entrar en vez de redirigir.
 */
export function PanelMisPedidos() {
  const { sesion, cargando } = useSesion();

  return (
    <Revelar className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <CarritoPendiente />
      </div>

      <div className="flex flex-col gap-6 lg:col-span-7">
        {cargando ? (
          <div aria-busy="true" className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8">
            <span className="sr-only">Cargando tus pedidos…</span>
            <Esqueleto className="h-7 w-32" />
            <Esqueleto className="mt-5 h-16 w-full rounded-md" />
          </div>
        ) : sesion ? (
          <MisPedidos demo={sesion.modo === "demo"} />
        ) : (
          <section
            data-escalon=""
            aria-labelledby="apartados"
            className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8"
          >
            <h2 id="apartados" className="font-display text-2xl font-semibold">
              Apartados
            </h2>
            <p className="mt-3 leading-relaxed text-tenue">
              Entra con tu cuenta para ver los pedidos que has apartado, con su
              hora de recogida y su estado.
            </p>
            <div className="mt-5">
              <Boton href="/auth/ingresar?next=/pedidos" variante="primario">
                Ingresar
              </Boton>
            </div>
          </section>
        )}
      </div>
    </Revelar>
  );
}

/** Esqueleto con la misma rejilla que `PanelMisPedidos`. */
export function EsqueletoPedidos() {
  return (
    <div aria-hidden="true" className="grid gap-6 lg:grid-cols-12">
      <div className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8 lg:col-span-5">
        <Esqueleto className="h-7 w-36" />
        <Esqueleto className="mt-4 h-5 w-3/4" />
        <Esqueleto className="mt-2 h-5 w-1/2" />
      </div>
      <div className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8 lg:col-span-7">
        <Esqueleto className="h-7 w-32" />
        <Esqueleto className="mt-5 h-[13.5rem] w-full rounded-tarjeta" />
      </div>
    </div>
  );
}

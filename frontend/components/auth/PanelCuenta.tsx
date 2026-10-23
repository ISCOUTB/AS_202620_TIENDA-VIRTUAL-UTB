"use client";

import Link from "next/link";
import { useSesion, cerrarSesion } from "@/lib/sesion";
import { useCarrito, totalCentavos, unidades, porTienda, abrirPedido } from "@/lib/carrito";
import { formatoHora, formatoPrecio } from "@/lib/formato";
import { productoPorId } from "@/lib/catalogo";
import { nombreTienda, paletaTienda } from "@/lib/tiendas";
import { Badge } from "@/components/ui/Badge";
import { Boton } from "@/components/ui/Boton";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Revelar } from "@/components/motion/Revelar";
import { Carnet } from "./Carnet";

/**
 * La cuenta (SPEC v4 §3, `/cuenta`): el carnet digital de la sección «La
 * cuenta» del artefacto, con los datos reales de la sesión, y dos tarjetas:
 * pedidos y lo que hay en el carrito agrupado por tienda.
 */
export function PanelCuenta() {
  const { sesion } = useSesion();
  const { carrito, cargando } = useCarrito();

  if (!sesion) return null;
  const { usuario, modo } = sesion;
  const n = unidades(carrito);
  const total = totalCentavos(carrito);
  const grupos = porTienda(carrito);
  const rol = usuario.rol === "admin" ? "Administración" : "Estudiante";

  return (
    <Revelar className="grid gap-6 lg:grid-cols-12">
      <section
        data-escalon=""
        aria-labelledby="saludo"
        className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8 lg:col-span-5"
      >
        <h2 id="saludo" className="titulo-seccion">
          Hola, {usuario.nombre.split(" ")[0]}.
        </h2>
        <p className="mt-1.5 truncate text-sm text-tenue">{usuario.email}</p>

        {modo === "demo" ? (
          <p className="mt-5 rounded-sm bg-aviso-suave px-4 py-3 text-sm leading-snug text-aviso">
            <strong className="font-bold">Modo demostración.</strong> El módulo
            de identidad todavía no está en producción: esta sesión vive solo en
            tu navegador y no crea pedidos reales.
          </p>
        ) : null}

        <div className="mt-8 px-2 sm:px-0">
          <Carnet
            nombre={usuario.nombre}
            codigo={String(usuario.id).padStart(9, "0")}
            rol={rol}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Badge tono={modo === "demo" ? "muestra" : "abierto"}>
            {modo === "demo" ? "Demostración" : "Cuenta real"}
          </Badge>
          <Badge tono="abierto">Activo</Badge>
          <Badge tono="neutro">Rol: {usuario.rol}</Badge>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {usuario.rol === "admin" ? (
            <Boton href="/admin" variante="suave" bloque>
              Ir a administración
            </Boton>
          ) : null}
          <Boton variante="contorno" bloque onClick={cerrarSesion}>
            Cerrar sesión
          </Boton>
        </div>
      </section>

      <div className="flex flex-col gap-6 lg:col-span-7">
        <section
          data-escalon=""
          aria-labelledby="pedidos"
          className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="pedidos" className="font-display text-2xl font-semibold">
              Pedidos
            </h2>
            <span className="cifra text-sm font-semibold text-tenue">0</span>
          </div>
          <div className="mt-5 rounded-tarjeta bg-suave px-6 py-9 text-center">
            <p className="font-semibold">Todavía no tienes pedidos.</p>
            <p className="mx-auto mt-1.5 max-w-[42ch] text-sm leading-relaxed text-tenue">
              Cuando apartes algo, aquí verás el estado, la hora de recogida y
              el total. No se envía nada por correo: todo queda en tu pase.
            </p>
            <div className="mt-5 flex justify-center">
              <Boton href="/#tiendas" variante="primario">
                Ver las tiendas
              </Boton>
            </div>
          </div>
        </section>

        <section
          data-escalon=""
          aria-labelledby="carrito"
          className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="carrito" className="font-display text-2xl font-semibold">
              Tu carrito
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
            <p className="mt-3 leading-relaxed text-tenue">
              Está vacío. Puedes mezclar productos de varias tiendas en un
              mismo pedido.
            </p>
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
                {carrito.lineas.some((l) => productoPorId(l.productoId)?.esMuestra)
                  ? "Incluye precios de referencia: la tienda los confirma en el mostrador. "
                  : ""}
                El pedido se confirma al recoger; el pago es en el mostrador.
              </p>

              <Boton variante="primario" tamano="lg" bloque cuadrado onClick={abrirPedido}>
                Elegir hora y apartar
              </Boton>
            </div>
          )}
        </section>

        <p className="text-sm text-tenue">
          ¿Necesitas cambiar algo?{" "}
          <Link href="/#tiendas" className="font-semibold text-enlace underline underline-offset-4">
            Vuelve a las tiendas
          </Link>
          .
        </p>
      </div>
    </Revelar>
  );
}

/** Esqueleto con la misma rejilla y alturas que `PanelCuenta`. */
export function EsqueletoCuenta() {
  return (
    <div aria-hidden="true" className="grid gap-6 lg:grid-cols-12">
      <div className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8 lg:col-span-5">
        <Esqueleto className="h-8 w-1/2" />
        <Esqueleto className="mt-2.5 h-4 w-2/3" />
        <Esqueleto className="mt-8 aspect-[1.586/1] w-full max-w-[400px] rounded-[22px]" />
        <div className="mt-8 flex gap-2">
          <Esqueleto className="h-6 w-28 rounded-pill" />
          <Esqueleto className="h-6 w-16 rounded-pill" />
        </div>
        <Esqueleto className="mt-6 h-11 w-full rounded-pill" />
      </div>
      <div className="flex flex-col gap-6 lg:col-span-7">
        <div className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8">
          <Esqueleto className="h-7 w-32" />
          <Esqueleto className="mt-5 h-[13.5rem] w-full rounded-tarjeta" />
        </div>
        <div className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8">
          <Esqueleto className="h-7 w-36" />
          <Esqueleto className="mt-4 h-5 w-3/4" />
        </div>
      </div>
    </div>
  );
}

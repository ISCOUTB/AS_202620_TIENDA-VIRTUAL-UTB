"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderOut } from "@/lib/api/generated/contract";
import { ApiError } from "@/lib/api/client";
import { cancelarPedido, listarPedidos } from "@/lib/pedidos";
import { formatoFechaCorta, formatoHora, formatoPrecio } from "@/lib/formato";
import { nombreTienda, paletaTienda } from "@/lib/tiendas";
import { Boton } from "@/components/ui/Boton";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoPedido } from "@/components/pedidos/EstadoPedido";

type Estado =
  | { tipo: "cargando" }
  | { tipo: "listo"; pedidos: OrderOut[] }
  | { tipo: "demo" }
  | { tipo: "error"; mensaje: string };

/**
 * «Pedidos» de `/cuenta`: `GET /orders` con la sesión real. El comprador
 * puede cancelar mientras el pedido espera el pago (la API repone el stock);
 * después, solo la tienda. En modo demostración no hay pedidos que mostrar y
 * se dice.
 */
export function MisPedidos({ demo }: Readonly<{ demo: boolean }>) {
  const [estado, setEstado] = useState<Estado>(demo ? { tipo: "demo" } : { tipo: "cargando" });
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await listarPedidos();
    if (r.estado === "real") setEstado({ tipo: "listo", pedidos: r.pedidos });
    else if (r.estado === "demo") setEstado({ tipo: "demo" });
    else setEstado({ tipo: "error", mensaje: r.mensaje });
  }, []);

  useEffect(() => {
    if (!demo) void cargar();
  }, [demo, cargar]);

  async function cancelar(pedido: OrderOut) {
    setAviso(null);
    setCancelando(pedido.id);
    try {
      await cancelarPedido(pedido.id, "Cancelado por el comprador");
      setAviso(`Pedido #${pedido.id} cancelado. Las unidades volvieron a la tienda.`);
      await cargar();
    } catch (error) {
      setAviso(error instanceof ApiError ? error.message : "No se pudo cancelar el pedido.");
      // P. ej. ya estaba cancelado o la tienda lo confirmó: se muestra el estado real.
      await cargar();
    } finally {
      setCancelando(null);
    }
  }

  const pedidos = estado.tipo === "listo" ? estado.pedidos : [];

  return (
    <section
      data-escalon=""
      aria-labelledby="pedidos"
      className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="pedidos" className="font-display text-2xl font-semibold">
          Pedidos
        </h2>
        {estado.tipo === "listo" ? (
          <span className="cifra text-sm font-semibold text-tenue">{pedidos.length}</span>
        ) : null}
      </div>

      {aviso ? (
        <p role="status" className="mt-4 rounded-sm bg-suave px-4 py-3 text-sm text-tinta">
          {aviso}
        </p>
      ) : null}

      {estado.tipo === "cargando" ? (
        <div aria-busy="true" className="mt-5 flex flex-col gap-2">
          <span className="sr-only">Cargando tus pedidos…</span>
          <Esqueleto className="h-16 w-full rounded-md" />
          <Esqueleto className="h-16 w-full rounded-md" />
        </div>
      ) : estado.tipo === "error" ? (
        <p role="alert" className="mt-5 rounded-sm bg-error-suave px-4 py-3 text-sm text-error">
          {estado.mensaje}
        </p>
      ) : estado.tipo === "demo" ? (
        <p className="mt-5 rounded-sm bg-aviso-suave px-4 py-3 text-sm leading-snug text-aviso">
          En modo demostración no se crean pedidos en el servidor, así que aquí
          no aparece ninguno.
        </p>
      ) : pedidos.length === 0 ? (
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
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {pedidos.map((pedido) => {
            const slug = pedido.tienda ?? "";
            return (
              <li key={pedido.id} className="rounded-md border border-linea p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-pill ${paletaTienda(slug).relleno}`} />
                    {nombreTienda(slug)} · #{pedido.id}
                  </p>
                  <EstadoPedido estado={pedido.estado} />
                </div>
                <ul className="mt-2 text-[0.9375rem]">
                  {pedido.items.map((item) => (
                    <li key={item.product_id} className="flex items-baseline justify-between gap-4 py-1">
                      <span>{item.product_nombre}</span>
                      <span className="cifra shrink-0 text-tenue">×{item.cantidad}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 border-t border-linea pt-2 text-sm text-tenue">
                  <span>
                    {formatoFechaCorta(pedido.creado_en)}
                    {pedido.hora_recogida ? ` · recoges ${formatoHora(pedido.hora_recogida)}` : ""}
                  </span>
                  <span className="cifra text-base font-bold text-tinta">
                    {formatoPrecio(pedido.total_centavos)}
                  </span>
                </div>
                {pedido.estado === "pendiente_pago" ? (
                  <div className="mt-3 flex justify-end">
                    <Boton
                      variante="contorno"
                      onClick={() => void cancelar(pedido)}
                      disabled={cancelando !== null}
                    >
                      {cancelando === pedido.id ? "Cancelando…" : "Cancelar pedido"}
                    </Boton>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

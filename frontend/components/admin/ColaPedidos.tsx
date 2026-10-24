"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderOut, TiendaOut } from "@/lib/api/generated/contract";
import { ApiError } from "@/lib/api/client";
import { avanzarPedido, cancelarPedido, listarPedidos, SIGUIENTE_ESTADO } from "@/lib/pedidos";
import { formatoFechaCorta, formatoHora, formatoPrecio } from "@/lib/formato";
import { Boton } from "@/components/ui/Boton";
import { EsqueletoTabla } from "@/components/ui/Esqueleto";
import { EstadoPedido } from "@/components/pedidos/EstadoPedido";

const ACCION: Record<string, string> = {
  pagado: "Confirmar pago",
  en_preparacion: "Empezar a preparar",
  listo: "Marcar listo",
  entregado: "Entregar",
};

/**
 * Cola de pedidos del mostrador (`GET /orders?tienda_id=`): el pago se
 * confirma aquí (saga, paso «PagoConfirmado») y el pedido avanza hasta
 * entregarse. Cancelar repone las unidades. Los pedidos sin pagar vencen
 * solos a las 24 h (`app.tareas.vencer_pedidos`).
 */
export function ColaPedidos({ tiendas }: Readonly<{ tiendas: TiendaOut[] }>) {
  const [tiendaId, setTiendaId] = useState<number | null>(tiendas[0]?.id ?? null);
  const [pedidos, setPedidos] = useState<OrderOut[] | null>(null);
  const [verCerrados, setVerCerrados] = useState(false);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (id: number) => {
    const r = await listarPedidos({ tiendaId: id });
    if (r.estado === "real") {
      setPedidos(r.pedidos);
    } else {
      setPedidos([]);
      setError(r.estado === "error" ? r.mensaje : "No pudimos conectar con la tienda.");
    }
  }, []);

  useEffect(() => {
    if (tiendaId === null) return;
    setPedidos(null);
    setError(null);
    void cargar(tiendaId);
  }, [tiendaId, cargar]);

  async function actuar(pedido: OrderOut, accion: () => Promise<OrderOut>) {
    setError(null);
    setOcupado(pedido.id);
    try {
      const actualizado = await accion();
      setPedidos((lista) => lista?.map((p) => (p.id === actualizado.id ? actualizado : p)) ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo actualizar el pedido.");
      // Lo más común es que otra persona ya lo movió: se muestra el estado real.
      if (tiendaId !== null) await cargar(tiendaId);
    } finally {
      setOcupado(null);
    }
  }

  if (tiendas.length === 0) return null;

  const visibles = (pedidos ?? []).filter(
    (p) => verCerrados || (p.estado !== "entregado" && p.estado !== "cancelado"),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          Tienda
          <select
            value={tiendaId ?? ""}
            onChange={(e) => setTiendaId(Number(e.target.value))}
            className="h-11 rounded-sm border border-borde bg-tarjeta px-3 text-[0.9375rem]"
          >
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={verCerrados}
            onChange={(e) => setVerCerrados(e.target.checked)}
            className="h-4 w-4"
          />
          Ver entregados y cancelados
        </label>
        <span className="flex-1" />
        <Boton
          variante="contorno"
          onClick={() => tiendaId !== null && void cargar(tiendaId)}
          disabled={pedidos === null}
        >
          Actualizar
        </Boton>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-sm bg-error-suave px-4 py-2.5 text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-5">
        {pedidos === null ? (
          <div aria-busy="true">
            <span className="sr-only">Cargando pedidos…</span>
            <EsqueletoTabla filas={3} />
          </div>
        ) : visibles.length === 0 ? (
          <p className="rounded-tarjeta bg-tarjeta px-6 py-8 text-center text-tenue shadow-tarjeta">
            No hay pedidos {verCerrados ? "" : "abiertos "}en esta tienda.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {visibles.map((pedido) => {
              const siguiente = SIGUIENTE_ESTADO[pedido.estado];
              const abierto = pedido.estado !== "entregado" && pedido.estado !== "cancelado";
              const enCurso = ocupado === pedido.id;
              return (
                <li key={pedido.id} aria-busy={enCurso} className="rounded-tarjeta bg-tarjeta p-5 shadow-tarjeta">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="cifra font-mono text-lg font-bold">#{pedido.id}</p>
                    <EstadoPedido estado={pedido.estado} />
                  </div>
                  <p className="mt-1 text-[0.8125rem] text-tenue">
                    {formatoFechaCorta(pedido.creado_en)}
                    {pedido.hora_recogida ? ` · recoge ${formatoHora(pedido.hora_recogida)}` : ""}
                  </p>
                  <ul className="mt-3 text-[0.9375rem]">
                    {pedido.items.map((item) => (
                      <li key={item.product_id} className="flex justify-between gap-4 py-0.5">
                        <span>{item.product_nombre}</span>
                        <span className="cifra text-tenue">×{item.cantidad}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="cifra mt-2 border-t border-linea pt-2 text-right font-bold">
                    {formatoPrecio(pedido.total_centavos)}
                  </p>
                  {abierto ? (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Boton
                        variante="contorno"
                        disabled={ocupado !== null}
                        onClick={() =>
                          void actuar(pedido, () => cancelarPedido(pedido.id, "Cancelado por la tienda"))
                        }
                      >
                        Cancelar
                      </Boton>
                      {siguiente ? (
                        <Boton
                          variante="primario"
                          disabled={ocupado !== null}
                          onClick={() => void actuar(pedido, () => avanzarPedido(pedido.id, siguiente))}
                        >
                          {enCurso ? "Guardando…" : ACCION[siguiente]}
                        </Boton>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

/**
 * Pedidos contra el contrato real (API 0.4.0, docs/idempotencia-saga-s11.md).
 *
 * - `POST /orders` exige `bearerAuth` y la cabecera `Idempotency-Key` (UUID).
 *   Responde una lista: un pedido por tienda, porque cada tienda prepara y
 *   cobra el suyo. `201` si se crearon, `200` si la llave ya se había usado.
 * - `hora_recogida` viaja al mostrador. Las `notas` por ítem siguen fuera del
 *   contrato (reabrirían el ADR 0011): el sabor se elige al recoger.
 *
 * Si la API no responde (red o 502/503/504) la UI lo dice con claridad en
 * lugar de fingir un pedido. Un 401 nunca se convierte en demostración.
 */

import { apiGet, apiPost, ApiError } from "@/lib/api/client";
import { rutaDe } from "@/lib/api/endpoints";
import type { OrderOut, OrderStatus } from "@/lib/api/generated/contract";
import type { Carrito } from "@/lib/carrito";
import { llaveIdempotencia } from "@/lib/azar";

export type ResultadoPedido = { estado: "real"; pedidos: OrderOut[] } | Fallo;

/**
 * Se emite al crear pedidos: el panel lateral aparta y `/pedidos` (que puede
 * estar debajo) recarga su lista sin que nadie le pase el resultado.
 */
export const EVENTO_PEDIDOS = "tvutb:pedidos";

/**
 * Llave del intento en curso. Un reintento con el mismo carrito (por un fallo
 * de red, o un doble clic) reutiliza la llave y la API devuelve los pedidos
 * ya creados sin descontar dos veces. Si el carrito cambia, es otro intento.
 */
let intento: { huella: string; llave: string } | null = null;

function llaveDelIntento(huella: string): string {
  if (intento?.huella !== huella) intento = { huella, llave: llaveIdempotencia() };
  return intento.llave;
}

/** Olvida la llave: el intento terminó (con pedido o con un error de negocio). */
function cerrarIntento(): void {
  intento = null;
}

type Fallo = { estado: "demo" } | { estado: "error"; mensaje: string };

function mensajeDe(error: unknown, alExpirar: string): Fallo {
  if (error instanceof ApiError) {
    // Mismo criterio que lib/sesion.ts: endpoint ausente o API caída
    // degradan a demostración visible. Un 401 nunca.
    if (error.esNoImplementado || error.esCaida) return { estado: "demo" };
    if (error.estado === 401) return { estado: "error", mensaje: alExpirar };
    return { estado: "error", mensaje: error.message };
  }
  return { estado: "error", mensaje: "No se pudo completar. Revisa tu conexión." };
}

export async function crearPedido(
  carrito: Carrito,
  horaRecogida: string | null,
): Promise<ResultadoPedido> {
  const items = carrito.lineas.map((l) => ({
    product_id: l.productoId,
    cantidad: l.cantidad,
  }));

  if (items.length === 0) {
    return { estado: "error", mensaje: "Tu carrito está vacío." };
  }

  const cuerpo = horaRecogida ? { items, hora_recogida: horaRecogida } : { items };
  const llave = llaveDelIntento(JSON.stringify(cuerpo));

  try {
    const pedidos = await apiPost<OrderOut[]>(rutaDe("createOrder"), cuerpo, llave);
    cerrarIntento();
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_PEDIDOS));
    return { estado: "real", pedidos };
  } catch (error) {
    // Un error de negocio (sin existencias, producto retirado) cierra el
    // intento; un fallo de red lo deja abierto para reintentar con la llave.
    if (error instanceof ApiError && !error.esCaida) cerrarIntento();
    return mensajeDe(error, "Tu sesión expiró. Vuelve a entrar para confirmar el pedido.");
  }
}

export type ListaPedidos = { estado: "real"; pedidos: OrderOut[] } | Fallo;

/**
 * Pedidos visibles para la sesión: los propios o, con `tiendaId`, la cola de
 * esa tienda (solo quien la gestiona; la API responde 403 a los demás).
 */
export async function listarPedidos(
  filtros: { tiendaId?: number; estado?: OrderStatus } = {},
): Promise<ListaPedidos> {
  const consulta = new URLSearchParams();
  if (filtros.tiendaId !== undefined) consulta.set("tienda_id", String(filtros.tiendaId));
  if (filtros.estado) consulta.set("estado", filtros.estado);
  const sufijo = consulta.size > 0 ? `?${consulta}` : "";
  try {
    const pedidos = await apiGet<OrderOut[]>(`${rutaDe("listOrders")}${sufijo}`);
    return { estado: "real", pedidos };
  } catch (error) {
    return mensajeDe(error, "Tu sesión expiró. Vuelve a entrar.");
  }
}

/** El comprador cancela mientras el pedido espera el pago; repone el stock. */
export async function cancelarPedido(id: number, motivo?: string): Promise<OrderOut> {
  return apiPost<OrderOut>(rutaDe("cancelOrder", { orderId: id }), motivo ? { motivo } : {});
}

/** Siguiente paso del pedido en el mostrador (solo quien gestiona la tienda). */
export async function avanzarPedido(
  id: number,
  estado: "pagado" | "en_preparacion" | "listo" | "entregado",
): Promise<OrderOut> {
  return apiPost<OrderOut>(rutaDe("updateOrderStatus", { orderId: id }), { estado });
}

/** Lo que la tienda puede hacer después de cada estado (backend: TRANSICIONES). */
export const SIGUIENTE_ESTADO: Partial<
  Record<OrderStatus, "pagado" | "en_preparacion" | "listo" | "entregado">
> = {
  pendiente_pago: "pagado",
  pagado: "en_preparacion",
  en_preparacion: "listo",
  listo: "entregado",
};

export const ETIQUETA_ESTADO: Record<OrderStatus, string> = {
  pendiente_pago: "Por pagar",
  pagado: "Pagado",
  en_preparacion: "En preparación",
  listo: "Listo para recoger",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

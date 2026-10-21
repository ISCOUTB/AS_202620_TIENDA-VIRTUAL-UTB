"use client";

/**
 * Creación de pedidos contra el contrato real.
 *
 * `POST /orders` exige `bearerAuth` y acepta `{ items: [{product_id, cantidad}] }`.
 * El contrato NO tiene hora de recogida ni notas por ítem: la hora se guarda
 * en el carrito local y se confirma en el mostrador. Esa carencia está
 * propuesta al backend en docs/api/tiendas-catalogo.md.
 *
 * Si el endpoint aún no existe (404/405/501) la UI lo dice con claridad en
 * lugar de fingir un pedido.
 */

import { apiPost, ApiError } from "@/lib/api/client";
import { rutaDe } from "@/lib/api/endpoints";
import type { OrderOut } from "@/lib/api/generated/contract";
import type { Carrito } from "@/lib/carrito";
import { llaveIdempotencia } from "@/lib/azar";

export type ResultadoPedido =
  | { estado: "real"; pedido: OrderOut }
  | { estado: "demo" }
  | { estado: "error"; mensaje: string };

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

  // Idempotency-Key: un intento de pedido = una llave. Si el usuario
  // reintenta por un fallo de red, se reutiliza mientras el carrito no cambie.
  const llave = llaveIdempotencia();

  try {
    const pedido = await apiPost<OrderOut>(rutaDe("createOrder"), { items }, llave);
    return { estado: "real", pedido };
  } catch (error) {
    if (error instanceof ApiError) {
      // Mismo criterio que lib/sesion.ts: endpoint ausente o API caída
      // degradan a demostración visible. Un 401 nunca.
      if (error.esNoImplementado || error.estado === 0) return { estado: "demo" };
      if (error.estado === 401) {
        return {
          estado: "error",
          mensaje: "Tu sesión expiró. Vuelve a entrar para confirmar el pedido.",
        };
      }
      return { estado: "error", mensaje: error.message };
    }
    return {
      estado: "error",
      mensaje: "No se pudo confirmar el pedido. Revisa tu conexión.",
    };
  } finally {
    // La hora se conserva en el carrito; no viaja al contrato actual.
    void horaRecogida;
  }
}

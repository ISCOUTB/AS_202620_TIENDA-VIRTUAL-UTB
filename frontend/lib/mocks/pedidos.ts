import type { OrderOut } from "../api/generated/contract";
import { PRODUCTOS_MOCK } from "./catalogo";

/**
 * Pedidos de muestra para diseñar "mis pedidos", el detalle y el panel
 * administrativo (endpoint `preview`). Cubren los cinco estados del ciclo de
 * vida; los subtotales se calculan desde los precios para que las cifras
 * sumen de verdad.
 */

function producto(id: number) {
  const encontrado = PRODUCTOS_MOCK.find((p) => p.id === id);
  if (!encontrado) throw new Error(`Producto mock ${id} inexistente`);
  return encontrado;
}

type LineaMock = { product_id: number; cantidad: number };

function linea({ product_id, cantidad }: LineaMock): OrderOut["items"][number] {
  const p = producto(product_id);
  return {
    product_id,
    product_nombre: p.nombre,
    cantidad,
    precio_unitario_centavos: p.precio_centavos,
    subtotal_centavos: p.precio_centavos * cantidad,
  };
}

function pedido(
  id: number,
  usuario_id: number,
  estado: OrderOut["estado"],
  creado_en: string,
  lineas: LineaMock[],
): OrderOut {
  const items = lineas.map(linea);
  return {
    id,
    usuario_id,
    items,
    total_centavos: items.reduce((suma, i) => suma + i.subtotal_centavos, 0),
    estado,
    creado_en,
  };
}

export const PEDIDOS_MOCK: OrderOut[] = [
  pedido(1, 1, "pendiente", "2026-10-14T14:30:00Z", [
    { product_id: 1, cantidad: 2 },
    { product_id: 3, cantidad: 1 },
  ]),
  pedido(2, 1, "confirmado", "2026-10-13T15:10:00Z", [
    { product_id: 4, cantidad: 1 },
    { product_id: 2, cantidad: 2 },
  ]),
  pedido(3, 1, "entregado", "2026-10-11T13:05:00Z", [
    { product_id: 5, cantidad: 2 },
    { product_id: 6, cantidad: 1 },
  ]),
  pedido(4, 1, "cancelado", "2026-10-09T16:45:00Z", [
    { product_id: 8, cantidad: 1 },
  ]),
];

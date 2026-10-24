import type { OrderStatus } from "@/lib/api/generated/contract";
import { ETIQUETA_ESTADO } from "@/lib/pedidos";
import { Badge, type TonoBadge } from "@/components/ui/Badge";

const TONO: Record<OrderStatus, TonoBadge> = {
  pendiente_pago: "muestra",
  pagado: "nuevo",
  en_preparacion: "nuevo",
  listo: "abierto",
  entregado: "neutro",
  cancelado: "cerrado",
};

/** Estado de un pedido como pill con texto (el color nunca va solo). */
export function EstadoPedido({ estado }: Readonly<{ estado: OrderStatus }>) {
  return <Badge tono={TONO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
}

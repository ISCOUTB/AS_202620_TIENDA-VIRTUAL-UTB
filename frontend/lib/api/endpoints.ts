import { OPERACIONES, type OperationId } from "./generated/contract";

/**
 * Manifiesto único de los endpoints que el frontend conoce.
 *
 * - `live`      — implementado en la API (docs/api/openapi.json): las vistas
 *                 usan datos reales.
 * - `preview`   — en el contrato de diseño (docs/openapi/tienda-virtual.yaml)
 *                 pero aún no implementado: la vista degrada con datos mock
 *                 marcados o un aviso "próximamente".
 *
 * Desde la API 0.4.0 todas las operaciones del contrato están implementadas.
 * La cobertura de TODOS los operationId la valida TypeScript: el `Record`
 * exige una entrada por operación del contrato generado.
 *
 * Aunque una operación sea `live`, si la API no responde (red caída o 502 del
 * proxy) las vistas siguen degradando a modo demostración visible (ADR 0011).
 */
export type EstadoEndpoint = "live" | "preview";

export type EntradaEndpoint = {
  estado: EstadoEndpoint;
  /** Fuente o motivo cuando el estado es `preview`. */
  nota?: string;
};

export const ENDPOINTS: Record<OperationId, EntradaEndpoint> = {
  healthCheck: { estado: "live" },
  readinessCheck: { estado: "live" },
  getMetrics: { estado: "live" },
  // Identidad (ADR 0016)
  registerUser: { estado: "live" },
  loginUser: { estado: "live" },
  getCurrentUser: { estado: "live" },
  // Catálogo
  listProducts: { estado: "live" },
  getProductById: { estado: "live" },
  listStores: { estado: "live" },
  createProduct: { estado: "live" },
  updateProduct: { estado: "live" },
  // Inventario
  listInventory: { estado: "live" },
  getInventoryByProduct: { estado: "live" },
  updateInventory: { estado: "live" },
  adjustInventory: { estado: "live" },
  // Pedidos (docs/idempotencia-saga-s11.md)
  listOrders: { estado: "live" },
  createOrder: { estado: "live", nota: "Idempotency-Key obligatoria" },
  getOrderById: { estado: "live" },
  cancelOrder: { estado: "live" },
  updateOrderStatus: { estado: "live" },
};

/** true si el frontend puede esperar datos reales de esa operación. */
export function esLive(id: OperationId): boolean {
  return ENDPOINTS[id].estado === "live";
}

/** Construye la ruta de una operación sustituyendo los parámetros de ruta. */
export function rutaDe(
  id: OperationId,
  parametros: Record<string, string | number> = {},
): string {
  let ruta: string = OPERACIONES[id].ruta;
  for (const [clave, valor] of Object.entries(parametros)) {
    ruta = ruta.replace(`{${clave}}`, String(valor));
  }
  return ruta;
}

import { OPERACIONES, type OperationId } from "./generated/contract";

/**
 * Manifiesto único de los endpoints que el frontend conoce.
 *
 * - `live`      — implementado en la API 0.3.0 (docs/api/openapi.json): las
 *                 vistas usan datos reales.
 * - `preview`   — en el contrato de diseño (docs/openapi/tienda-virtual.yaml)
 *                 pero aún no implementado: la vista se construye completa y
 *                 degrada elegante (datos mock marcados / aviso "próximamente")
 *                 hasta que el backend lo sirva.
 *
 * La cobertura de TODOS los operationId la valida TypeScript: el `Record`
 * exige una entrada por operación del contrato generado. Las operaciones
 * propuestas que aún no están ni en el YAML se declaran como extras abajo.
 */
export type EstadoEndpoint = "live" | "preview";

export type EntradaEndpoint = {
  estado: EstadoEndpoint;
  /** Fuente o motivo cuando el estado es `preview`. */
  nota?: string;
};

/** Operaciones propuestas fuera del YAML de diseño (diseño documentado). */
type OperacionExtra = "crearProducto" | "actualizarProducto";

export const ENDPOINTS: Record<OperationId | OperacionExtra, EntradaEndpoint> = {
  // — Implementados (API 0.3.0) —
  healthCheck: { estado: "live" },
  readinessCheck: { estado: "live" },
  getMetrics: { estado: "live" },
  listProducts: { estado: "live" },
  listInventory: { estado: "live" },

  // — Contrato de diseño, aún no implementados —
  getProductById: {
    estado: "preview",
    nota: "Detalle de producto en docs/openapi/tienda-virtual.yaml",
  },
  getInventoryByProduct: { estado: "preview" },
  updateInventory: { estado: "preview" },
  adjustInventory: { estado: "preview" },
  registerUser: { estado: "preview" },
  loginUser: { estado: "preview" },
  getCurrentUser: { estado: "preview" },
  listOrders: { estado: "preview" },
  createOrder: { estado: "preview", nota: "Idempotency-Key: ver docs/idempotencia-saga-s11.md" },
  getOrderById: { estado: "preview" },
  cancelOrder: { estado: "preview" },

  // — Propuestas de diseño, fuera del YAML (docs/api/administracion-catalogo.md) —
  crearProducto: {
    estado: "preview",
    nota: "POST /catalog/products propuesto en docs/api/administracion-catalogo.md",
  },
  actualizarProducto: {
    estado: "preview",
    nota: "PATCH /catalog/products/{id} propuesto en docs/api/administracion-catalogo.md",
  },
};

/** true si el frontend puede esperar datos reales de esa operación. */
export function esLive(id: OperationId | OperacionExtra): boolean {
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

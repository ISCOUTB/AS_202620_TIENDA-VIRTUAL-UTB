/**
 * ARCHIVO GENERADO — no editar a mano.
 * Fuente: docs/openapi/tienda-virtual.yaml (API v0.3.0, OpenAPI 3.1.0)
 * Regenerar: npm run gen:api (verificado por npm run verify)
 */

/** Métodos y rutas de cada operación del contrato de diseño. */
export const OPERACIONES = {
  adjustInventory: { metodo: "POST", ruta: "/inventory/{productId}/adjust" },
  cancelOrder: { metodo: "POST", ruta: "/orders/{orderId}/cancel" },
  createOrder: { metodo: "POST", ruta: "/orders" },
  getCurrentUser: { metodo: "GET", ruta: "/identity/me" },
  getInventoryByProduct: { metodo: "GET", ruta: "/inventory/{productId}" },
  getMetrics: { metodo: "GET", ruta: "/metrics" },
  getOrderById: { metodo: "GET", ruta: "/orders/{orderId}" },
  getProductById: { metodo: "GET", ruta: "/catalog/products/{productId}" },
  healthCheck: { metodo: "GET", ruta: "/health" },
  listInventory: { metodo: "GET", ruta: "/inventory" },
  listOrders: { metodo: "GET", ruta: "/orders" },
  listProducts: { metodo: "GET", ruta: "/catalog/products" },
  loginUser: { metodo: "POST", ruta: "/identity/login" },
  readinessCheck: { metodo: "GET", ruta: "/health/ready" },
  registerUser: { metodo: "POST", ruta: "/identity/register" },
  updateInventory: { metodo: "PUT", ruta: "/inventory/{productId}" },
} as const;

export type OperationId = keyof typeof OPERACIONES;

export interface ErrorResponse {
  detail: string;
}

export interface HealthResponse {
  status: "ok";
}

export interface InventoryAdjustRequest {
  delta: number;
  motivo: string;
}

export interface InventoryItemOut {
  product_id: number;
  product_nombre: string;
  cantidad: number;
  actualizado_en: string;
}

export interface InventoryUpdateRequest {
  cantidad: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OrderCreateRequest {
  items: Array<OrderItemRequest>;
}

export interface OrderItemOut {
  product_id: number;
  product_nombre: string;
  cantidad: number;
  precio_unitario_centavos: number;
  subtotal_centavos: number;
}

export interface OrderItemRequest {
  product_id: number;
  cantidad: number;
}

export interface OrderOut {
  id: number;
  usuario_id: number;
  items: Array<OrderItemOut>;
  total_centavos: number;
  estado: OrderStatus;
  creado_en: string;
}

/** Estados del ciclo de vida de un pedido: - **pendiente** — Creado, esperando confirmación - **confirmado** — Stock reservado, preparando envío - **enviado** — En camino al cliente - **entregado** — Recibido por el cliente - **cancelado** — Anulado (stock repuesto)  */
export type OrderStatus = "pendiente" | "confirmado" | "enviado" | "entregado" | "cancelado";

/** Contrato del módulo Catálogo; no contiene datos de Inventario */
export interface ProductOut {
  id: number;
  nombre: string;
  descripcion: string;
  precio_centavos: number;
}

export interface ReadinessResponse {
  status: "ok" | "error";
  detalle?: string | null;
}

export interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
}

export interface StockAvailabilityOut {
  product_id: number;
  existencias: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface UserOut {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  creado_en: string;
}

/** - **admin** — Acceso total al sistema - **cliente** — Solo puede realizar pedidos  */
export type UserRole = "admin" | "cliente";

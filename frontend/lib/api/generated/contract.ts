/**
 * ARCHIVO GENERADO — no editar a mano.
 * Fuente: docs/openapi/tienda-virtual.yaml (API v0.4.0, OpenAPI 3.1.0)
 * Regenerar: pnpm run gen:api (verificado por pnpm run verify)
 */

/** Métodos y rutas de cada operación del contrato de diseño. */
export const OPERACIONES = {
  adjustInventory: { metodo: "POST", ruta: "/inventory/{productId}/adjust" },
  cancelOrder: { metodo: "POST", ruta: "/orders/{orderId}/cancel" },
  createOrder: { metodo: "POST", ruta: "/orders" },
  createProduct: { metodo: "POST", ruta: "/catalog/products" },
  getCurrentUser: { metodo: "GET", ruta: "/identity/me" },
  getInventoryByProduct: { metodo: "GET", ruta: "/inventory/{productId}" },
  getMetrics: { metodo: "GET", ruta: "/metrics" },
  getOrderById: { metodo: "GET", ruta: "/orders/{orderId}" },
  getProductById: { metodo: "GET", ruta: "/catalog/products/{productId}" },
  healthCheck: { metodo: "GET", ruta: "/health" },
  listInventory: { metodo: "GET", ruta: "/inventory" },
  listOrders: { metodo: "GET", ruta: "/orders" },
  listProducts: { metodo: "GET", ruta: "/catalog/products" },
  listStores: { metodo: "GET", ruta: "/catalog/tiendas" },
  loginUser: { metodo: "POST", ruta: "/identity/login" },
  readinessCheck: { metodo: "GET", ruta: "/health/ready" },
  registerUser: { metodo: "POST", ruta: "/identity/register" },
  updateInventory: { metodo: "PUT", ruta: "/inventory/{productId}" },
  updateOrderStatus: { metodo: "POST", ruta: "/orders/{orderId}/estado" },
  updateProduct: { metodo: "PATCH", ruta: "/catalog/products/{productId}" },
} as const;

export type OperationId = keyof typeof OPERACIONES;

/** - **comprador** — Hace pedidos (todo usuario registrado) - **admin_general** — Administra todo el sistema y asigna roles - **admin_tienda** — Administra el catálogo, el inventario y los pedidos de su tienda - **responsable_inventario** — Ajusta existencias y atiende pedidos de su tienda  */
export type CodigoRol = "comprador" | "admin_general" | "admin_tienda" | "responsable_inventario";

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
  motivo?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OrderCancelRequest {
  motivo?: string | null;
}

export interface OrderCreateRequest {
  items: Array<OrderItemRequest>;
  hora_recogida?: string | null;
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
  tienda_id: number;
  tienda?: string | null;
  items: Array<OrderItemOut>;
  total_centavos: number;
  estado: OrderStatus;
  hora_recogida?: string | null;
  creado_en: string;
  actualizado_en: string;
}

/** Estados del ciclo de vida de un pedido (ADR 0013): - **pendiente_pago** — Creado, stock descontado, esperando el pago en el mostrador (vence a las 24 h) - **pagado** — La tienda confirmó el pago - **en_preparacion** — La tienda lo está preparando - **listo** — Listo para recoger - **entregado** — Recogido por el comprador - **cancelado** — Anulado (stock repuesto)  */
export type OrderStatus = "pendiente_pago" | "pagado" | "en_preparacion" | "listo" | "entregado" | "cancelado";

export interface OrderStatusRequest {
  estado: "pagado" | "en_preparacion" | "listo" | "entregado";
  comentario?: string | null;
}

export interface ProductCreateRequest {
  tienda: string;
  nombre: string;
  descripcion?: string;
  precio_centavos: number;
  categoria?: string | null;
  presentacion?: string | null;
  precio_confirmado?: boolean;
  activo?: boolean;
}

/** Contrato del módulo Catálogo; no contiene datos de Inventario */
export interface ProductOut {
  id: number;
  nombre: string;
  descripcion: string;
  precio_centavos: number;
  tienda?: string | null;
  imagen_url?: string | null;
  categoria?: string | null;
  presentacion?: string | null;
  precio_confirmado?: boolean;
  activo?: boolean;
}

export interface ProductUpdateRequest {
  nombre?: string;
  descripcion?: string;
  precio_centavos?: number;
  categoria?: string | null;
  presentacion?: string | null;
  precio_confirmado?: boolean;
  activo?: boolean;
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

export interface RolAsignado {
  codigo: CodigoRol;
  tienda_id?: number | null;
}

export interface StockAvailabilityOut {
  product_id: number;
  existencias: number;
}

export interface TiendaOut {
  id: number;
  identificador: string;
  nombre: string;
  descripcion: string;
  logo_url?: string | null;
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
  roles: Array<RolAsignado>;
  creado_en: string;
}

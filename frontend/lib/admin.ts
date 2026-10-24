"use client";

/**
 * Datos del panel `/admin` (API 0.4.0).
 *
 * La vista de gestión no usa el catálogo público: pide también los productos
 * inactivos (`incluir_inactivos`, solo para quien gestiona la tienda) y las
 * tiendas con su id, que es lo que llevan los roles. Catálogo e inventario
 * se componen aquí, igual que en lib/catalogo-api.ts (ADR 0008).
 *
 * La autoridad es la API: si un rol no alcanza responde 403 y la vista
 * muestra el mensaje; la interfaz solo esconde lo que no se puede usar.
 */

import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";
import { rutaDe } from "@/lib/api/endpoints";
import type {
  InventoryItemOut,
  ProductCreateRequest,
  ProductOut,
  ProductUpdateRequest,
  StockAvailabilityOut,
  TiendaOut,
} from "@/lib/api/generated/contract";

export type FilaAdmin = { producto: ProductOut; existencias: number };

export type DatosPanel = { filas: FilaAdmin[]; tiendas: TiendaOut[] };

export async function cargarPanel(): Promise<DatosPanel> {
  const [productos, inventario, tiendas] = await Promise.all([
    apiGet<ProductOut[]>(`${rutaDe("listProducts")}?incluir_inactivos=true`),
    apiGet<StockAvailabilityOut[]>(rutaDe("listInventory")),
    apiGet<TiendaOut[]>(rutaDe("listStores")),
  ]);
  const existencias = new Map(inventario.map((i) => [i.product_id, i.existencias]));
  return {
    filas: productos.map((producto) => ({
      producto,
      existencias: existencias.get(producto.id) ?? 0,
    })),
    tiendas,
  };
}

/** Suma o resta unidades (movimiento `ajuste`); la API no deja stock negativo. */
export function ajustarExistencias(productoId: number, delta: number, motivo: string) {
  return apiPost<InventoryItemOut>(rutaDe("adjustInventory", { productId: productoId }), {
    delta,
    motivo,
  });
}

/** Fija las existencias tras un conteo (movimiento `ajuste` o `inicial`). */
export function fijarExistencias(productoId: number, cantidad: number, motivo: string) {
  return apiPut<InventoryItemOut>(rutaDe("updateInventory", { productId: productoId }), {
    cantidad,
    motivo,
  });
}

export function crearProducto(datos: ProductCreateRequest) {
  return apiPost<ProductOut>(rutaDe("createProduct"), datos);
}

export function editarProducto(productoId: number, cambios: ProductUpdateRequest) {
  return apiPatch<ProductOut>(rutaDe("updateProduct", { productId: productoId }), cambios);
}

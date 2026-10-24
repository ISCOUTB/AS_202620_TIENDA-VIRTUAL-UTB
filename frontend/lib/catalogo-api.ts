/**
 * Adaptador del contrato al modelo de la interfaz (ADR 0008).
 *
 * Catálogo e Inventario son módulos separados: `GET /catalog/products` no
 * trae existencias y `GET /inventory` no trae nombres. Next.js los compone
 * aquí, en una función pura que se prueba sin red.
 *
 * Lo que el contrato no tiene sale de lib/catalogo.ts → `PRODUCTOS`, buscado
 * por tienda + nombre + presentación (nunca por id, que lo asigna la base):
 * los `sabores` y el `slug` del ancla.
 */

import type { ProductOut, StockAvailabilityOut } from "@/lib/api/generated/contract";
import { PRODUCTOS, normalizar, type Producto } from "@/lib/catalogo";
import { TIENDAS, type SlugTienda } from "@/lib/tiendas";

const SLUGS = new Set<string>(TIENDAS.map((t) => t.slug));

function esSlugTienda(valor: string | null | undefined): valor is SlugTienda {
  return typeof valor === "string" && SLUGS.has(valor);
}

/**
 * El nombre es único por tienda en la base, así que las variantes llevan la
 * presentación entre paréntesis («Arroz La Placita (media)»). La interfaz ya
 * la muestra aparte: se quita del nombre solo si coincide con `presentacion`.
 */
export function nombreSinPresentacion(nombre: string, presentacion?: string | null): string {
  if (!presentacion) return nombre;
  const sufijo = /\s*\(([^)]+)\)\s*$/.exec(nombre);
  if (!sufijo || normalizar(sufijo[1]) !== normalizar(presentacion)) return nombre;
  return nombre.slice(0, sufijo.index);
}

/** «Arroz La Placita» + «Media» → `arroz-la-placita-media`. */
export function slugDe(...partes: Array<string | undefined>): string {
  return normalizar(partes.filter(Boolean).join(" "))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function datosLocales(tienda: SlugTienda, nombre: string, presentacion?: string) {
  const clave = normalizar(nombre);
  return PRODUCTOS.find(
    (p) =>
      p.tienda === tienda &&
      normalizar(p.nombre) === clave &&
      (p.presentacion ?? "") === (presentacion ?? ""),
  );
}

/**
 * Compone catálogo + inventario. Descarta los productos sin tienda conocida
 * (no hay dónde pintarlos) y los inactivos; un producto sin fila de
 * inventario se muestra agotado, nunca con existencias inventadas.
 */
export function adaptarCatalogo(
  productos: ProductOut[],
  inventario: StockAvailabilityOut[],
): Producto[] {
  const existencias = new Map(inventario.map((i) => [i.product_id, i.existencias]));
  const resultado: Producto[] = [];
  for (const p of productos) {
    if (!esSlugTienda(p.tienda) || p.activo === false) continue;
    const presentacion = p.presentacion ?? undefined;
    const nombre = nombreSinPresentacion(p.nombre, presentacion);
    const local = datosLocales(p.tienda, nombre, presentacion);
    resultado.push({
      id: p.id,
      slug: local?.slug ?? slugDe(nombre, presentacion),
      nombre,
      descripcion: p.descripcion,
      precioCentavos: p.precio_centavos,
      tienda: p.tienda,
      existencias: existencias.get(p.id) ?? 0,
      esMuestra: p.precio_confirmado === false,
      ...(local?.sabores ? { sabores: local.sabores } : {}),
      ...(presentacion ? { presentacion } : {}),
    });
  }
  return resultado;
}

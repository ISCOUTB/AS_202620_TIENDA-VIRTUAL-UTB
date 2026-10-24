import { cache } from "react";
import { connection } from "next/server";
import { baseDeLaApi } from "@/lib/api/proxy";
import { rutaDe } from "@/lib/api/endpoints";
import type { ProductOut, StockAvailabilityOut } from "@/lib/api/generated/contract";
import { adaptarCatalogo } from "@/lib/catalogo-api";
import { PRODUCTOS, type Catalogo } from "@/lib/catalogo";

/**
 * Catálogo de la petición, leído en el servidor (ADR 0008 y 0012).
 *
 * - Catálogo e inventario se piden en paralelo y se componen en Next.js.
 * - `no-store` y `connection()`: el escenario 3 pide que un cambio de stock
 *   se vea al recargar, así que estas páginas no se prerenderizan ni se
 *   cachean. `cache` de React solo evita repetir la lectura dentro de una
 *   misma petición (layout + página).
 * - Si la API no responde, se devuelve `PRODUCTOS` con `origen: "respaldo"`:
 *   la interfaz lo dice y no deja apartar (ADR 0002: no se finge un dato real).
 */

const ESPERA_MS = 3000;

async function leer<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(`${baseDeLaApi()}${ruta}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(ESPERA_MS),
  });
  if (!respuesta.ok) throw new Error(`${ruta} respondió ${respuesta.status}`);
  return (await respuesta.json()) as T;
}

export const obtenerCatalogo = cache(async (): Promise<Catalogo> => {
  // Fuera del try: es la señal de render dinámico y no debe atraparse.
  await connection();
  try {
    const [productos, inventario] = await Promise.all([
      leer<ProductOut[]>(rutaDe("listProducts")),
      leer<StockAvailabilityOut[]>(rutaDe("listInventory")),
    ]);
    return { productos: adaptarCatalogo(productos, inventario), origen: "api" };
  } catch (error) {
    console.warn("[catalogo] API no disponible, se muestra el respaldo:", error);
    return { productos: PRODUCTOS, origen: "respaldo" };
  }
});

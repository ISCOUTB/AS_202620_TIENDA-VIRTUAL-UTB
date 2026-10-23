import type { StockAvailabilityOut } from "../api/generated/contract";

/**
 * Existencias de muestra (endpoint `preview`). Los cuatro primeros valores
 * reproducen el seed anterior a Alembic (hoy en `backend/app/seed.py`);
 * el producto 6 simula agotado para diseñar el estado "agotado".
 */
export const INVENTARIO_MOCK: StockAvailabilityOut[] = [
  { product_id: 1, existencias: 40 },
  { product_id: 2, existencias: 25 },
  { product_id: 3, existencias: 18 },
  { product_id: 4, existencias: 12 },
  { product_id: 5, existencias: 30 },
  { product_id: 6, existencias: 0 },
  { product_id: 7, existencias: 22 },
  { product_id: 8, existencias: 15 },
];

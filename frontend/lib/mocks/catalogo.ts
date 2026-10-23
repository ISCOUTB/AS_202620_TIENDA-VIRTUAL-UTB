import type { ProductOut } from "../api/generated/contract";

/**
 * Datos de muestra del catálogo (endpoint `preview` hasta que exista el
 * backend). Los cuatro primeros reproducen el seed real de
 * seed anterior a Alembic (hoy en `backend/app/seed.py`); los demás añaden densidad para
 * diseñar la vista. Se marcan en la UI hasta conectar el endpoint real.
 */
export const PRODUCTOS_MOCK: ProductOut[] = [
  { id: 1, nombre: "Café americano", descripcion: "Vaso de 8 oz", precio_centavos: 350000 },
  { id: 2, nombre: "Empanada de queso", descripcion: "Unidad recién hecha", precio_centavos: 280000 },
  { id: 3, nombre: "Jugo de naranja", descripcion: "Botella de 300 ml", precio_centavos: 450000 },
  { id: 4, nombre: "Sándwich mixto", descripcion: "Jamón y queso", precio_centavos: 900000 },
  { id: 5, nombre: "Café con leche", descripcion: "Vaso de 12 oz", precio_centavos: 420000 },
  { id: 6, nombre: "Brownie de nuez", descripcion: "Porción individual", precio_centavos: 550000 },
  { id: 7, nombre: "Galleta de avena", descripcion: "Unidad horneada", precio_centavos: 220000 },
  { id: 8, nombre: "Té de hierbabuena", descripcion: "Taza de 8 oz", precio_centavos: 300000 },
];

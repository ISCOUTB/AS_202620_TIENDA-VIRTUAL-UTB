import type { Producto } from "./catalogo";

/**
 * Secciones de la carta de cada tienda (presentación, al estilo de las apps
 * de domicilios): agrupan los productos para las pestañas de la carta. No
 * cambian precios, existencias ni reglas del pedido; solo el orden en que se
 * muestran.
 *
 * La clave es el `slug` del producto. Un producto sin sección cae en
 * «Más productos» para no esconderse nunca; `tests/secciones.test.ts` exige
 * que todo el catálogo actual tenga la suya.
 */
const SECCION_DE: Record<string, string> = {
  // Antojos
  "de-todito-grande": "Paquetes",
  "de-todito-pequeno": "Paquetes",
  "golpe-con-todo": "Paquetes",
  cheetos: "Paquetes",
  doritos: "Paquetes",
  "platanos-maduros": "Paquetes",
  platanos: "Paquetes",
  "kraks-mani": "Paquetes",
  "galletas-festival": "Galletas y dulces",
  "galletas-bridge": "Galletas y dulces",
  cocosette: "Galletas y dulces",
  "gol-chocolate-mani": "Galletas y dulces",
  submarinos: "Galletas y dulces",
  "bombombum-bolsa": "Galletas y dulces",
  "bombombum-personal": "Galletas y dulces",
  "choco-break-bolsa": "Galletas y dulces",
  "choco-break-personal": "Galletas y dulces",
  "chicles-trident": "Galletas y dulces",
  "gaseosa-postobon": "Bebidas",
  "gaseosa-cocacola": "Bebidas",
  "gaseosa-pepsi": "Bebidas",
  "jugos-hit": "Bebidas",
  // Punto Fit
  pera: "Fruta",
  manzana: "Fruta",
  banano: "Fruta",
  pina: "Fruta",
  "fresas-con-crema": "Fruta",
  granola: "Granola y yogur",
  "granola-yogur-griego": "Granola y yogur",
  "helado-yogur-griego": "Granola y yogur",
  "pastas-verduras": "Platos",
  "wrap-pollo": "Platos",
  hatsu: "Bebidas",
  te: "Bebidas",
  // Alegría
  "helado-vainilla": "Helados",
  "helado-chocolate": "Helados",
  "helado-fresa": "Helados",
  "helado-combinado": "Helados",
  sandwich: "Para comer",
  mecatos: "Para comer",
  "chocolatina-jett": "Para comer",
  "jugos-alegria": "Bebidas",
  "te-alegria": "Bebidas",
  // Productos de Alegría que solo existen en la base de datos (no en el
  // catálogo de respaldo local).
  "cafe-americano": "Bebidas",
  "jugo-de-naranja": "Bebidas",
  "empanada-de-queso": "Para comer",
  "sandwich-mixto": "Para comer",
  // Almuerzo 01 · línea oriental
  "arroz-oriental": "Arroces",
  "arroz-la-placita-media": "Arroces",
  "arroz-la-placita-entero": "Arroces",
  "arroz-la-valenciana": "Arroces",
  "chow-mein": "Fideos",
  "pollo-frito-entero": "Pollo",
  "pollo-frito-medio": "Pollo",
  "pollo-agridulce": "Pollo",
};

export const SECCION_OTROS = "Más productos";

export type Seccion = { id: string; titulo: string; productos: Producto[] };

/** Sección de un producto (o «Más productos» si no tiene). */
export function seccionDe(slug: string): string {
  return SECCION_DE[slug] ?? SECCION_OTROS;
}

/** `id` estable y apto para anclas a partir del título de la sección. */
export function idSeccion(titulo: string): string {
  return (
    "seccion-" +
    titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

/**
 * Agrupa los productos de una tienda en secciones, en el orden en que cada
 * sección aparece por primera vez en la carta (que ya viene ordenada), con
 * «Más productos» siempre al final.
 */
export function seccionesDe(productos: Producto[]): Seccion[] {
  const orden: string[] = [];
  const grupos = new Map<string, Producto[]>();
  for (const p of productos) {
    const titulo = seccionDe(p.slug);
    if (!grupos.has(titulo)) {
      grupos.set(titulo, []);
      if (titulo !== SECCION_OTROS) orden.push(titulo);
    }
    grupos.get(titulo)!.push(p);
  }
  if (grupos.has(SECCION_OTROS)) orden.push(SECCION_OTROS);
  return orden.map((titulo) => ({ id: idSeccion(titulo), titulo, productos: grupos.get(titulo)! }));
}

import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Lee un color de `app/tokens.css`.
 *
 * Existe para los dos lugares donde un color no puede ser una variable CSS:
 * el `themeColor` del viewport (se serializa a una meta etiqueta) y la imagen
 * Open Graph (se rasteriza fuera del documento). Así tokens.css sigue siendo
 * la única fuente de valores.
 *
 * Solo para módulos de servidor.
 */
const cache = new Map<string, string>();

export function colorDeToken(nombre: string, respaldo = "black"): string {
  const guardado = cache.get(nombre);
  if (guardado) return guardado;

  try {
    const css = readFileSync(
      path.join(process.cwd(), "app/tokens.css"),
      "utf8",
    );
    const encontrado = css.match(new RegExp(`--tk-${nombre}:\\s*([^;]+);`));
    const valor = encontrado ? encontrado[1].trim() : respaldo;
    cache.set(nombre, valor);
    return valor;
  } catch {
    return respaldo;
  }
}

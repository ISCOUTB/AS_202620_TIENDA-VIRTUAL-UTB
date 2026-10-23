#!/usr/bin/env node
/**
 * Verifica que ningún color literal viva fuera de `app/tokens.css`.
 *
 * Es la regla "los hex solo en tokens.css" del plan de diseño idempotente:
 * si alguien escribe `#005aa9` en un componente, este script falla y con él
 * `pnpm run verify`.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CARPETAS = ["app", "components", "lib"];
const EXTENSIONES = new Set([".css", ".ts", ".tsx", ".js", ".mjs"]);
const EXENTO = /(^|[\\/])tokens\.css$/;
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl|oklch)a?\(/;

/** Recorre un directorio y devuelve los archivos de código fuente. */
function archivosDe(dir) {
  const encontrados = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== "node_modules") encontrados.push(...archivosDe(ruta));
    } else if (EXTENSIONES.has(path.extname(entrada.name))) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

const violaciones = [];
for (const carpetas of CARPETAS) {
  const dir = path.join(FRONTEND, carpetas);
  let archivos;
  try {
    archivos = archivosDe(dir);
  } catch {
    continue; // carpeta aún no creada
  }
  for (const archivo of archivos) {
    if (EXENTO.test(archivo)) continue;
    const lineas = readFileSync(archivo, "utf8").split("\n");
    lineas.forEach((linea, i) => {
      if (COLOR_LITERAL.test(linea)) {
        violaciones.push(
          `${path.relative(FRONTEND, archivo)}:${i + 1}: ${linea.trim()}`,
        );
      }
    });
  }
}

if (violaciones.length > 0) {
  console.error("✗ Color literal fuera de app/tokens.css:");
  for (const v of violaciones) console.error(`  ${v}`);
  console.error(
    "  Mueve el valor a tokens.css como variable --tk-* y usa var(--tk-…) o la utilidad de Tailwind.",
  );
  process.exit(1);
}
console.log("✓ check:tokens — los colores viven solo en app/tokens.css");

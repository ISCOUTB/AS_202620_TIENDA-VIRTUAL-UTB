#!/usr/bin/env node
/**
 * Genera `lib/api/generated/contract.ts` a partir del contrato de diseño
 * `docs/openapi/tienda-virtual.yaml`.
 *
 * Idempotente: misma entrada ⇒ misma salida byte a byte. Si el contrato
 * cambia, `npm run gen:api` actualiza el archivo y el diff obliga a revisar
 * el frontend (el contrato ejecutable, `docs/api/openapi.json`, lo valida el
 * backend en su propio job de CI y este script no lo toca).
 *
 * Uso: npm run gen:api
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const FRONTEND = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RAIZ = path.dirname(FRONTEND);
const FUENTE = path.join(RAIZ, "docs", "openapi", "tienda-virtual.yaml");
const DESTINO = path.join(FRONTEND, "lib", "api", "generated", "contract.ts");

const spec = parse(readFileSync(FUENTE, "utf8"));

/** Nombre de tipo de un `$ref` (`#/components/schemas/ProductOut` → `ProductOut`). */
function nombreRef(ref) {
  return ref.split("/").at(-1);
}

/** Traduce un esquema OpenAPI a una expresión de tipo TypeScript. */
function tipoDe(nodo) {
  if (!nodo || typeof nodo !== "object") return "unknown";
  if (nodo.$ref) return nombreRef(nodo.$ref);

  // OpenAPI 3.0-style `nullable: true` (presente en el contrato de diseño)
  if (nodo.nullable === true) {
    const copia = { ...nodo };
    delete copia.nullable;
    const base = tipoDe(copia);
    return base.includes("| null") ? base : `${base} | null`;
  }

  // OpenAPI 3.1: `type` puede ser lista (p. ej. ["string", "null"])
  if (Array.isArray(nodo.type)) {
    const sinNulo = nodo.type.filter((t) => t !== "null");
    const base =
      sinNulo.length === 1
        ? tipoDe({ ...nodo, type: sinNulo[0] })
        : sinNulo.map((t) => tipoDe({ ...nodo, type: t })).join(" | ");
    return nodo.type.includes("null") ? `${base} | null` : base;
  }

  switch (nodo.type) {
    case "string":
      return nodo.enum
        ? nodo.enum.map((valor) => JSON.stringify(valor)).join(" | ")
        : "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return `Array<${tipoDe(nodo.items)}>`;
    case "object": {
      if (nodo.properties) {
        const requeridos = new Set(nodo.required ?? []);
        const lineas = Object.entries(nodo.properties).map(
          ([clave, valor]) =>
            `  ${clave}${requeridos.has(clave) ? "" : "?"}: ${tipoDe(valor)};`,
        );
        return `{\n${lineas.join("\n")}\n}`;
      }
      return "Record<string, unknown>";
    }
    default:
      return "unknown";
  }
}

/** Comentario JSDoc de una descripción de esquema (una línea). */
function jsdoc(descripcion) {
  if (!descripcion) return "";
  const linea = descripcion.replace(/\s+/g, " ").replace(/\*\//g, "*\\/");
  return `/** ${linea} */\n`;
}

// — Operaciones (operationId → método y ruta), ordenadas para salida estable —
const operaciones = [];
for (const [ruta, metodos] of Object.entries(spec.paths)) {
  for (const [metodo, operacion] of Object.entries(metodos)) {
    if (!operacion.operationId) continue;
    operaciones.push({
      id: operacion.operationId,
      metodo: metodo.toUpperCase(),
      ruta,
    });
  }
}
operaciones.sort((a, b) => a.id.localeCompare(b.id));

// — Esquemas, ordenados alfabéticamente para salida estable —
const esquemas = Object.entries(spec.components.schemas).sort(([a], [b]) =>
  a.localeCompare(b),
);

const cuerpo = [];

cuerpo.push("/**");
cuerpo.push(" * ARCHIVO GENERADO — no editar a mano.");
cuerpo.push(` * Fuente: docs/openapi/tienda-virtual.yaml (API v${spec.info.version}, OpenAPI ${spec.openapi})`);
cuerpo.push(" * Regenerar: npm run gen:api (verificado por npm run verify)");
cuerpo.push(" */");
cuerpo.push("");

cuerpo.push("/** Métodos y rutas de cada operación del contrato de diseño. */");
cuerpo.push("export const OPERACIONES = {");
for (const op of operaciones) {
  cuerpo.push(`  ${op.id}: { metodo: ${JSON.stringify(op.metodo)}, ruta: ${JSON.stringify(op.ruta)} },`);
}
cuerpo.push("} as const;");
cuerpo.push("");
cuerpo.push("export type OperationId = keyof typeof OPERACIONES;");
cuerpo.push("");

for (const [nombre, esquema] of esquemas) {
  cuerpo.push(jsdoc(esquema.description).trimEnd());
  const esEnum = esquema.type === "string" && esquema.enum;
  if (esEnum) {
    cuerpo.push(`export type ${nombre} = ${tipoDe(esquema)};`);
  } else if (esquema.type === "object") {
    cuerpo.push(`export interface ${nombre} ${tipoDe(esquema)}`);
  } else {
    cuerpo.push(`export type ${nombre} = ${tipoDe(esquema)};`);
  }
  cuerpo.push("");
}

const salida = `${cuerpo.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
mkdirSync(path.dirname(DESTINO), { recursive: true });
writeFileSync(DESTINO, salida, "utf8");
console.log(
  `✓ ${path.relative(RAIZ, DESTINO)} ← ${path.relative(RAIZ, FUENTE)} (${operaciones.length} operaciones, ${esquemas.length} esquemas)`,
);

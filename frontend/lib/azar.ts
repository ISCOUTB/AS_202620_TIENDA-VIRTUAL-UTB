/**
 * Aleatoriedad de la aplicación.
 *
 * `Math.random()` no es un generador criptográfico y SonarQube lo marca como
 * hotspot incluso cuando el valor no protege nada (el id de un usuario de
 * demostración o la llave de idempotencia de un pedido). Aquí se centraliza
 * `crypto.getRandomValues` para que exista una sola implementación que revisar
 * y una sola razón documentada.
 *
 * Si el entorno no expone `crypto` (algunos runtimes de prueba muy antiguos),
 * la función no falla: devuelve bytes en cero y la unicidad la aporta quien
 * llama con una marca de tiempo.
 */

function disponible(): boolean {
  return (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  );
}

/** `n` bytes aleatorios; ceros si el entorno no tiene `crypto`. */
export function bytesAleatorios(n: number): Uint8Array {
  const b = new Uint8Array(Math.max(0, Math.trunc(n)));
  if (disponible()) globalThis.crypto.getRandomValues(b);
  return b;
}

/** Entero en [0, maxExclusivo). Devuelve 0 si el límite no es positivo. */
export function enteroAleatorio(maxExclusivo: number): number {
  if (!Number.isFinite(maxExclusivo) || maxExclusivo <= 0) return 0;
  const b = bytesAleatorios(4);
  const v = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
  return v % Math.trunc(maxExclusivo);
}

/** Identificador hexadecimal de 16 caracteres (8 bytes). */
export function identificador(): string {
  return Array.from(bytesAleatorios(8), (x) => x.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Llave de idempotencia para `POST /orders`: un intento = una llave.
 * Usa `crypto.randomUUID` cuando existe; si no, cae al identificador local.
 */
export function llaveIdempotencia(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${identificador()}`;
}

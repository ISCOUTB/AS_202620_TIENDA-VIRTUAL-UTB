import { describe, expect, it } from "vitest";
import {
  bytesAleatorios,
  enteroAleatorio,
  identificador,
  llaveIdempotencia,
} from "@/lib/azar";

describe("bytesAleatorios", () => {
  it("devuelve exactamente los bytes pedidos", () => {
    expect(bytesAleatorios(8)).toHaveLength(8);
    expect(bytesAleatorios(0)).toHaveLength(0);
  });

  it("no explota con entradas absurdas", () => {
    expect(bytesAleatorios(-3)).toHaveLength(0);
    expect(bytesAleatorios(2.7)).toHaveLength(2);
  });
});

describe("enteroAleatorio", () => {
  it("se queda dentro del rango", () => {
    for (let i = 0; i < 500; i++) {
      const n = enteroAleatorio(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
  });

  it("devuelve 0 cuando no hay rango", () => {
    expect(enteroAleatorio(0)).toBe(0);
    expect(enteroAleatorio(-5)).toBe(0);
    expect(enteroAleatorio(Number.NaN)).toBe(0);
  });

  it("con máximo 1 siempre es 0", () => {
    expect(enteroAleatorio(1)).toBe(0);
  });
});

describe("identificador", () => {
  it("es hexadecimal de 16 caracteres", () => {
    expect(identificador()).toMatch(/^[0-9a-f]{16}$/);
  });

  it("no se repite entre llamadas", () => {
    const muestra = new Set(Array.from({ length: 200 }, () => identificador()));
    expect(muestra.size).toBe(200);
  });
});

describe("llaveIdempotencia", () => {
  it("produce una llave no vacía y distinta cada vez", () => {
    const a = llaveIdempotencia();
    const b = llaveIdempotencia();
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});

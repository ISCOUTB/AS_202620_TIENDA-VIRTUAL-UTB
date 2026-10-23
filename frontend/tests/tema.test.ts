import { describe, expect, it } from "vitest";
import { CLAVE_TEMA, SCRIPT_TEMA_INICIAL, resolverTema } from "@/lib/tema-inicial";
import { fotogramasCirculo, radioMaximo } from "@/lib/circulo";

describe("resolverTema", () => {
  it("respeta la elección guardada", () => {
    expect(resolverTema("dark", false)).toBe("dark");
    expect(resolverTema("light", true)).toBe("light");
  });

  it("sin elección, sigue al sistema", () => {
    expect(resolverTema(null, true)).toBe("dark");
    expect(resolverTema(null, false)).toBe("light");
  });

  it("ignora valores guardados que no son un tema", () => {
    expect(resolverTema("sepia", true)).toBe("dark");
    expect(resolverTema("", false)).toBe("light");
  });
});

describe("SCRIPT_TEMA_INICIAL", () => {
  it("lee la misma clave que la app y fija data-theme antes de pintar", () => {
    expect(SCRIPT_TEMA_INICIAL).toContain(JSON.stringify(CLAVE_TEMA));
    expect(SCRIPT_TEMA_INICIAL).toContain('setAttribute("data-theme"');
    expect(SCRIPT_TEMA_INICIAL).toContain("prefers-color-scheme: dark");
  });

  it("protege el acceso a localStorage", () => {
    expect(SCRIPT_TEMA_INICIAL).toMatch(/try\{t=localStorage/);
  });

  it("solo marca movimiento cuando no se pide reducirlo", () => {
    expect(SCRIPT_TEMA_INICIAL).toContain("prefers-reduced-motion: reduce");
    expect(SCRIPT_TEMA_INICIAL).toContain('"data-motion","si"');
  });
});

describe("radioMaximo", () => {
  it("es la distancia a la esquina más lejana", () => {
    // Desde la esquina superior izquierda, la diagonal completa.
    expect(radioMaximo(0, 0, 300, 400)).toBe(500);
    // Desde el centro, media diagonal.
    expect(radioMaximo(150, 200, 300, 400)).toBe(250);
    // Desde un botón arriba a la derecha, la esquina inferior izquierda.
    expect(radioMaximo(280, 20, 300, 400)).toBeCloseTo(Math.hypot(280, 380));
  });
});

describe("fotogramasCirculo", () => {
  const lineal = (t: number) => t;

  it("va de un círculo de radio 0 al radio máximo", () => {
    const f = fotogramasCirculo(10, 20, 100, lineal, 4);
    expect(f).toHaveLength(5);
    expect(f[0]).toEqual({ offset: 0, clipPath: "circle(0.00px at 10.00px 20.00px)" });
    expect(f[4]).toEqual({ offset: 1, clipPath: "circle(100.00px at 10.00px 20.00px)" });
  });

  it("sigue la curva recibida", () => {
    const cuadratica = (t: number) => t * t;
    const f = fotogramasCirculo(0, 0, 100, cuadratica, 2);
    expect(f[1].clipPath).toBe("circle(25.00px at 0.00px 0.00px)");
  });

  it("nunca baja de dos tramos ni da radios negativos", () => {
    const f = fotogramasCirculo(0, 0, 50, () => -1, 0);
    expect(f).toHaveLength(3);
    for (const k of f) expect(k.clipPath.startsWith("circle(0.00px")).toBe(true);
  });
});

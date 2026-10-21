import { describe, expect, it } from "vitest";
import {
  SLUGS_TIENDA,
  TIENDAS,
  acentoDeTienda,
  clasesAcento,
  clasesTratamiento,
  nombreTienda,
  tiendaPorSlug,
} from "@/lib/tiendas";

describe("TIENDAS", () => {
  it("son cinco y con slug único", () => {
    expect(TIENDAS).toHaveLength(5);
    expect(new Set(SLUGS_TIENDA).size).toBe(5);
    expect(SLUGS_TIENDA).toEqual([
      "antojos",
      "punto-fit",
      "alegria",
      "almuerzo-01",
      "almuerzo-02",
    ]);
  });

  it("cada tienda trae lo que la tarjeta necesita", () => {
    for (const t of TIENDAS) {
      expect(t.nombre.length).toBeGreaterThan(0);
      expect(t.categoria.length).toBeGreaterThan(0);
      expect(t.tagline.length).toBeGreaterThan(0);
      expect(t.destacados.length).toBeGreaterThan(0);
      expect(t.horario.abre).toMatch(/^\d{2}:\d{2}$/);
      expect(t.horario.cierra).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it("solo la línea oriental es indexable", () => {
    const indexables = TIENDAS.filter((t) => t.indexable).map((t) => t.slug);
    expect(indexables).toEqual(["almuerzo-01"]);
  });
});

describe("tiendaPorSlug", () => {
  it("encuentra por slug", () => {
    expect(tiendaPorSlug("antojos")?.nombre).toBe("Antojos");
  });

  it("devuelve undefined si no existe", () => {
    expect(tiendaPorSlug("inexistente")).toBeUndefined();
  });
});

describe("nombreTienda y acentoDeTienda", () => {
  it("resuelven por slug", () => {
    expect(nombreTienda("punto-fit")).toBe("Punto Fit");
    expect(acentoDeTienda("punto-fit")).toBe("cyan");
    expect(acentoDeTienda("alegria")).toBe("azul");
  });

  it("tienen un respaldo honesto para un slug desconocido", () => {
    expect(nombreTienda("otra")).toBe("otra");
    expect(acentoDeTienda("otra")).toBe("azul");
  });
});

describe("clasesAcento", () => {
  it("devuelve las cuatro clases de cada acento", () => {
    for (const acento of ["ambar", "cyan", "azul"] as const) {
      const c = clasesAcento(acento);
      expect(c.fondo).toBeTruthy();
      expect(c.texto).toBeTruthy();
      expect(c.borde).toBeTruthy();
      expect(c.punto).toBeTruthy();
    }
    expect(clasesAcento("ambar").punto).toBe("bg-ambar");
    expect(clasesAcento("cyan").borde).toBe("border-cyan");
    expect(clasesAcento("azul").punto).toBe("bg-azure");
  });
});

describe("clasesTratamiento", () => {
  it("da una cadena distinta por tratamiento", () => {
    const tratamientos = ["condensada", "limpia", "editorial", "numerada"] as const;
    const clases = tratamientos.map((t) => clasesTratamiento(t, "grande"));
    expect(new Set(clases).size).toBe(4);
    for (const c of clases) expect(c).toContain("font-[");
  });

  it("cambia de escala según el tamaño", () => {
    expect(clasesTratamiento("limpia", "banda")).toContain("text-[1.35rem]");
    expect(clasesTratamiento("limpia", "grande")).toContain("text-[2.5rem]");
    expect(clasesTratamiento("limpia", "hero")).toContain("clamp");
  });
});

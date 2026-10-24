import { describe, expect, it } from "vitest";
import { PRODUCTOS, productoPorId, productosDe, tiendaCompleta } from "@/lib/catalogo";
import { SLUGS_TIENDA } from "@/lib/tiendas";

describe("PRODUCTOS", () => {
  it("tiene ids y slugs únicos", () => {
    expect(new Set(PRODUCTOS.map((p) => p.id)).size).toBe(PRODUCTOS.length);
    expect(new Set(PRODUCTOS.map((p) => p.slug)).size).toBe(PRODUCTOS.length);
  });

  it("solo apunta a tiendas existentes", () => {
    for (const p of PRODUCTOS) {
      expect(SLUGS_TIENDA).toContain(p.tienda);
    }
  });

  it("nunca tiene existencias ni precios negativos", () => {
    for (const p of PRODUCTOS) {
      expect(p.existencias).toBeGreaterThanOrEqual(0);
      expect(p.precioCentavos).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("productosDe", () => {
  it("filtra por tienda", () => {
    const oriental = productosDe(PRODUCTOS, "almuerzo-01");
    expect(oriental).toHaveLength(8);
    expect(oriental.every((p) => p.tienda === "almuerzo-01")).toBe(true);
  });

  it("devuelve vacío para Almuerzo 02, que no tiene carta", () => {
    expect(productosDe(PRODUCTOS, "almuerzo-02")).toEqual([]);
  });
});

describe("productoPorId", () => {
  it("encuentra y describe el pollo frito entero", () => {
    const p = productoPorId(PRODUCTOS, 144);
    expect(p?.nombre).toBe("Pollo frito con arepitas");
    expect(p?.presentacion).toBe("Entero");
    expect(p?.esMuestra).toBe(false);
  });

  it("devuelve undefined si no existe", () => {
    expect(productoPorId(PRODUCTOS, 999999)).toBeUndefined();
  });
});

describe("tiendaCompleta (regla de indexación)", () => {
  it("la línea oriental cumple el mínimo", () => {
    expect(tiendaCompleta(PRODUCTOS, "almuerzo-01")).toBe(true);
  });

  it("las tiendas con precios de referencia no cumplen", () => {
    expect(tiendaCompleta(PRODUCTOS, "antojos")).toBe(false);
    expect(tiendaCompleta(PRODUCTOS, "punto-fit")).toBe(false);
    expect(tiendaCompleta(PRODUCTOS, "alegria")).toBe(false);
  });

  it("una tienda sin carta no cumple", () => {
    expect(tiendaCompleta(PRODUCTOS, "almuerzo-02")).toBe(false);
  });
});

describe("precios de referencia", () => {
  it("todo lo no confirmado vive fuera de la línea oriental", () => {
    for (const p of PRODUCTOS) {
      if (!p.esMuestra) expect(p.tienda).toBe("almuerzo-01");
    }
  });
});

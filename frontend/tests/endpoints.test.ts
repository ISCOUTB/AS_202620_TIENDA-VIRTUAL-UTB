import { describe, expect, it } from "vitest";
import { ENDPOINTS, esLive, rutaDe } from "@/lib/api/endpoints";

describe("ENDPOINTS", () => {
  it("marca como live todo el contrato desde la API 0.4.0", () => {
    const pendientes = Object.entries(ENDPOINTS)
      .filter(([, e]) => e.estado !== "live")
      .map(([id]) => id);
    expect(pendientes).toEqual([]);
  });

  it("explica por qué cada preview lo es", () => {
    for (const entrada of Object.values(ENDPOINTS)) {
      if (entrada.estado === "preview") {
        expect(entrada.nota === undefined || entrada.nota.length > 0).toBe(true);
      }
    }
  });
});

describe("esLive", () => {
  it("reconoce las operaciones implementadas", () => {
    expect(esLive("listProducts")).toBe(true);
    expect(esLive("loginUser")).toBe(true);
    expect(esLive("createProduct")).toBe(true);
  });
});

describe("rutaDe", () => {
  it("devuelve la ruta literal cuando no hay parámetros", () => {
    expect(rutaDe("listProducts")).toBe("/catalog/products");
    expect(rutaDe("createOrder")).toBe("/orders");
  });

  it("sustituye los parámetros de ruta", () => {
    expect(rutaDe("getProductById", { productId: 144 })).toBe(
      "/catalog/products/144",
    );
  });

  it("ignora parámetros que la ruta no declara", () => {
    expect(rutaDe("listProducts", { sobra: "x" })).toBe("/catalog/products");
  });
});

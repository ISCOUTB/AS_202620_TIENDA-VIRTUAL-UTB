import { describe, expect, it } from "vitest";
import {
  PRODUCTOS,
  buscarProductos,
  esParaCompartir,
  productoPorId,
  productosDe,
  productosDestacados,
} from "@/lib/catalogo";
import { SLUGS_TIENDA, paletaTienda } from "@/lib/tiendas";

describe("esParaCompartir", () => {
  it("separa los platos enteros y las bolsas", () => {
    expect(esParaCompartir(productoPorId(144)!)).toBe(true); // pollo entero
    expect(esParaCompartir(productoPorId(145)!)).toBe(false); // pollo medio
    expect(esParaCompartir(productoPorId(114)!)).toBe(true); // bombombum bolsa
    expect(esParaCompartir(productoPorId(150)!)).toBe(false); // chow mein, sin presentación
  });

  it("deja las dos pestañas con contenido en la línea oriental", () => {
    const carta = productosDe("almuerzo-01");
    expect(carta.some(esParaCompartir)).toBe(true);
    expect(carta.some((p) => !esParaCompartir(p))).toBe(true);
  });
});

describe("productosDestacados", () => {
  it("son cuatro, de tiendas distintas y existentes", () => {
    const d = productosDestacados();
    expect(d).toHaveLength(4);
    expect(new Set(d.map((p) => p.tienda)).size).toBe(4);
    for (const p of d) expect(PRODUCTOS).toContain(p);
  });
});

describe("buscarProductos", () => {
  it("no busca con menos de dos letras", () => {
    expect(buscarProductos("")).toEqual([]);
    expect(buscarProductos("a")).toEqual([]);
  });

  it("ignora tildes y mayúsculas", () => {
    expect(buscarProductos("PINA").map((p) => p.slug)).toContain("pina");
    expect(buscarProductos("sándwich").map((p) => p.slug)).toContain("sandwich");
  });

  it("encuentra por sabor y pone primero lo que empieza por el término", () => {
    expect(buscarProductos("picante").map((p) => p.slug)).toContain("de-todito-grande");
    const arroz = buscarProductos("arroz", 10);
    expect(arroz.length).toBeGreaterThan(1);
    expect(arroz[0].nombre.toLowerCase().startsWith("arroz")).toBe(true);
  });

  it("respeta el límite y no esconde lo agotado", () => {
    expect(buscarProductos("gaseosa", 2)).toHaveLength(2);
    expect(buscarProductos("doritos").map((p) => p.existencias)).toEqual([0]);
  });
});

describe("paletaTienda", () => {
  it("da clases completas para cada tienda", () => {
    for (const slug of SLUGS_TIENDA) {
      const p = paletaTienda(slug);
      expect(p.relleno).toMatch(/^bg-/);
      expect(p.sobreRelleno).toMatch(/^text-/);
      expect(p.suave).toMatch(/^bg-.+-suave$/);
      expect(p.tinta).toMatch(/^text-.+-tinta$/);
    }
  });

  it("cada tienda tiene un acento distinto", () => {
    expect(new Set(SLUGS_TIENDA.map((s) => paletaTienda(s).relleno)).size).toBe(5);
  });

  it("una tienda desconocida cae en el azul de marca", () => {
    expect(paletaTienda("otra")).toEqual(paletaTienda("almuerzo-02"));
  });
});

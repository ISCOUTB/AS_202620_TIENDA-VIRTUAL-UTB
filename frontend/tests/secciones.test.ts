import { describe, expect, it } from "vitest";
import { PRODUCTOS } from "@/lib/catalogo";
import { SECCION_OTROS, idSeccion, seccionDe, seccionesDe } from "@/lib/secciones";
import { portadaTienda } from "@/lib/imagenes";
import { TIENDAS } from "@/lib/tiendas";

describe("seccionesDe", () => {
  it("todo producto del catálogo tiene una sección propia", () => {
    const sinSeccion = PRODUCTOS.filter((p) => seccionDe(p.slug) === SECCION_OTROS).map((p) => p.slug);
    expect(sinSeccion).toEqual([]);
  });

  it("no pierde ni duplica productos al agrupar", () => {
    for (const t of TIENDAS) {
      const propios = PRODUCTOS.filter((p) => p.tienda === t.slug);
      const agrupados = seccionesDe(propios).flatMap((s) => s.productos);
      expect(agrupados.map((p) => p.id).sort()).toEqual(propios.map((p) => p.id).sort());
    }
  });

  it("un producto desconocido cae en «Más productos», al final", () => {
    const [primero] = PRODUCTOS;
    const raro = { ...primero, id: -1, slug: "producto-nuevo" };
    const secciones = seccionesDe([raro, primero]);
    expect(secciones.at(-1)?.titulo).toBe(SECCION_OTROS);
    expect(secciones[0].titulo).toBe(seccionDe(primero.slug));
  });
});

describe("idSeccion", () => {
  it("da ids aptos para anclas, sin tildes ni espacios", () => {
    expect(idSeccion("Galletas y dulces")).toBe("seccion-galletas-y-dulces");
    expect(idSeccion("Más productos")).toBe("seccion-mas-productos");
  });
});

describe("portadaTienda", () => {
  it("toda tienda tiene portada con alt y encuadre", () => {
    for (const t of TIENDAS) {
      const p = portadaTienda(t.slug);
      expect(p.src).toMatch(/^\/img\//);
      expect(p.alt.length).toBeGreaterThan(0);
      expect(p.encuadre).toMatch(/^object-/);
    }
  });
});

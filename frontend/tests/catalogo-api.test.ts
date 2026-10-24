import { describe, expect, it } from "vitest";
import type { ProductOut } from "@/lib/api/generated/contract";
import { adaptarCatalogo, nombreSinPresentacion, slugDe } from "@/lib/catalogo-api";

function producto(parcial: Partial<ProductOut> & Pick<ProductOut, "id" | "nombre">): ProductOut {
  return {
    descripcion: "",
    precio_centavos: 100000,
    tienda: "antojos",
    precio_confirmado: false,
    activo: true,
    ...parcial,
  };
}

describe("nombreSinPresentacion", () => {
  it("quita el sufijo solo si coincide con la presentación", () => {
    expect(nombreSinPresentacion("Arroz La Placita (media)", "Media")).toBe("Arroz La Placita");
    expect(nombreSinPresentacion("Kraks (maní)", null)).toBe("Kraks (maní)");
    expect(nombreSinPresentacion("Kraks (maní)", "Bolsa")).toBe("Kraks (maní)");
  });
});

describe("slugDe", () => {
  it("arma un ancla legible sin tildes", () => {
    expect(slugDe("Arroz La Placita", "Media")).toBe("arroz-la-placita-media");
    expect(slugDe("Piña")).toBe("pina");
  });
});

describe("adaptarCatalogo", () => {
  it("compone catálogo e inventario con los ids de la base", () => {
    const [p] = adaptarCatalogo(
      [producto({ id: 7, nombre: "De todito grande", presentacion: "Grande", precio_centavos: 350000 })],
      [{ product_id: 7, existencias: 3 }],
    );
    expect(p).toMatchObject({
      id: 7,
      nombre: "De todito grande",
      tienda: "antojos",
      precioCentavos: 350000,
      existencias: 3,
      esMuestra: true,
      presentacion: "Grande",
      slug: "de-todito-grande",
    });
    // Los sabores no están en el contrato: salen de la carta local.
    expect(p.sabores).toEqual(["Natural", "Queso", "Picante"]);
  });

  it("separa la presentación del nombre y respeta el precio confirmado", () => {
    const [p] = adaptarCatalogo(
      [
        producto({
          id: 50,
          nombre: "Pollo frito con arepitas (entero)",
          tienda: "almuerzo-01",
          presentacion: "Entero",
          precio_confirmado: true,
        }),
      ],
      [{ product_id: 50, existencias: 4 }],
    );
    expect(p.nombre).toBe("Pollo frito con arepitas");
    expect(p.esMuestra).toBe(false);
  });

  it("sin fila de inventario se muestra agotado, nunca con existencias inventadas", () => {
    const [p] = adaptarCatalogo([producto({ id: 1, nombre: "Producto nuevo" })], []);
    expect(p.existencias).toBe(0);
    expect(p.slug).toBe("producto-nuevo");
    expect(p.sabores).toBeUndefined();
  });

  it("descarta inactivos y tiendas desconocidas", () => {
    const productos = adaptarCatalogo(
      [
        producto({ id: 1, nombre: "Retirado", activo: false }),
        producto({ id: 2, nombre: "Huérfano", tienda: null }),
        producto({ id: 3, nombre: "Otra", tienda: "otra-tienda" }),
        producto({ id: 4, nombre: "Vigente" }),
      ],
      [],
    );
    expect(productos.map((p) => p.id)).toEqual([4]);
  });
});

import { describe, expect, it } from "vitest";
import {
  FOTO_CAFETERIA,
  FOTO_TIENDA,
  FOTOS_LUGAR,
  LOGO,
  fotoTienda,
} from "@/lib/imagenes";

describe("FOTO_CAFETERIA", () => {
  it("son trece y con numeración estable", () => {
    expect(FOTO_CAFETERIA).toHaveLength(13);
    expect(FOTO_CAFETERIA[0].src).toBe("/img/cafeteria-01.jpg");
    expect(FOTO_CAFETERIA[12].src).toBe("/img/cafeteria-13.jpg");
    expect(new Set(FOTO_CAFETERIA.map((f) => f.src)).size).toBe(13);
  });

  it("toda foto trae texto alternativo", () => {
    for (const foto of FOTO_CAFETERIA) {
      expect(foto.alt.length).toBeGreaterThan(0);
    }
  });
});

describe("fotoTienda", () => {
  it("todavía no hay fotos asignadas a tiendas", () => {
    expect(FOTO_TIENDA).toEqual({});
    expect(fotoTienda("antojos")).toBeNull();
  });
});

describe("LOGO", () => {
  it("declara su ruta, su alt y sus dimensiones intrínsecas", () => {
    expect(LOGO.src).toBe("/utb-logo.png");
    expect(LOGO.alt).toContain("Universidad Tecnológica de Bolívar");
    expect(LOGO.ancho).toBeGreaterThan(0);
    expect(LOGO.alto).toBeGreaterThan(0);
  });
});

describe("FOTOS_LUGAR", () => {
  it("es una selección de cuatro de las fotos de la cafetería", () => {
    expect(FOTOS_LUGAR).toHaveLength(4);
    expect(FOTOS_LUGAR[0]).toEqual(FOTO_CAFETERIA[0]);
  });
});

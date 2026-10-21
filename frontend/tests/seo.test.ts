import { describe, expect, it } from "vitest";
import {
  DESCRIPCION_SITIO,
  NOMBRE_SITIO,
  SITIO_URL,
  jsonLdCafeteria,
  jsonLdFaq,
  jsonLdListaProductos,
  jsonLdMigas,
  jsonLdSitio,
  precioTexto,
  urlAbsoluta,
} from "@/lib/seo";
import { tiendaPorSlug } from "@/lib/tiendas";

describe("urlAbsoluta", () => {
  it("antepone el origen una sola vez", () => {
    expect(urlAbsoluta("/tiendas")).toBe(`${SITIO_URL}/tiendas`);
    expect(urlAbsoluta("tiendas")).toBe(`${SITIO_URL}/tiendas`);
  });
});

describe("jsonLdSitio", () => {
  it("declara organización y sitio en un solo grafo", () => {
    const datos = jsonLdSitio();
    expect(datos["@context"]).toBe("https://schema.org");
    const grafo = datos["@graph"] as Array<Record<string, unknown>>;
    expect(grafo.map((n) => n["@type"])).toEqual(["Organization", "WebSite"]);
    expect(grafo[1].name).toBe(NOMBRE_SITIO);
    expect(grafo[1].inLanguage).toBe("es-CO");
  });
});

describe("jsonLdCafeteria", () => {
  it("solo incluye las tiendas indexables en el menú", () => {
    const datos = jsonLdCafeteria();
    expect(datos["@type"]).toBe("CafeOrCoffeeShop");
    const menu = datos.hasMenu as { hasMenuSection: Array<{ name: string }> };
    expect(menu.hasMenuSection.map((s) => s.name)).toEqual(["Almuerzo 01"]);
  });

  it("publica el horario de lunes a viernes", () => {
    const datos = jsonLdCafeteria();
    const horas = datos.openingHoursSpecification as Array<{
      dayOfWeek: string[];
      opens: string;
      closes: string;
    }>;
    expect(horas[0].dayOfWeek).toHaveLength(5);
    expect(horas[0].dayOfWeek[0]).toBe("https://schema.org/Monday");
    expect(horas[0].opens).toBe("07:00");
    expect(horas[0].closes).toBe("20:00");
  });

  it("marca los agotados como SoldOut", () => {
    const menu = jsonLdCafeteria().hasMenu as {
      hasMenuSection: Array<{
        hasMenuItem: Array<{
          offers: { availability: string; price: string; priceCurrency: string };
        }>;
      }>;
    };
    const items = menu.hasMenuSection[0].hasMenuItem;
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.offers.priceCurrency).toBe("COP");
      expect(item.offers.availability).toMatch(/SoldOut|InStock$/);
    }
  });
});

describe("jsonLdMigas", () => {
  it("numera los pasos desde uno", () => {
    const datos = jsonLdMigas([
      { nombre: "Inicio", ruta: "/" },
      { nombre: "Antojos", ruta: "/tiendas/antojos" },
    ]);
    const lista = datos.itemListElement as Array<{
      position: number;
      item: string;
    }>;
    expect(lista[0].position).toBe(1);
    expect(lista[1].item).toBe(`${SITIO_URL}/tiendas/antojos`);
  });
});

describe("jsonLdFaq", () => {
  it("traduce cada pregunta a Question/Answer", () => {
    const datos = jsonLdFaq([{ pregunta: "¿Pago en línea?", respuesta: "No." }]);
    const entidades = datos.mainEntity as Array<Record<string, unknown>>;
    expect(entidades[0]["@type"]).toBe("Question");
    expect((entidades[0].acceptedAnswer as { text: string }).text).toBe("No.");
  });
});

describe("jsonLdListaProductos", () => {
  it("enumera la carta de la tienda", () => {
    const tienda = tiendaPorSlug("almuerzo-01");
    if (!tienda) throw new Error("falta la tienda almuerzo-01");
    const datos = jsonLdListaProductos(tienda);
    expect(datos["@type"]).toBe("ItemList");
    expect(datos.numberOfItems).toBe(8);
    const items = datos.itemListElement as Array<{ url: string }>;
    expect(items[0].url).toContain("/tiendas/almuerzo-01#");
  });
});

describe("precioTexto", () => {
  it("delega en el formato de precios", () => {
    expect(precioTexto(350000)).toBe("$3.500");
  });
});

describe("DESCRIPCION_SITIO", () => {
  it("cabe en una meta descripción", () => {
    expect(DESCRIPCION_SITIO.length).toBeLessThanOrEqual(320);
  });
});

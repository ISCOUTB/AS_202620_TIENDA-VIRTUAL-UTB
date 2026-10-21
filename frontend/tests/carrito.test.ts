// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  agregar,
  cambiarCantidad,
  elegirHora,
  leerCarrito,
  porTienda,
  quitar,
  totalCentavos,
  unidades,
  vaciar,
} from "@/lib/carrito";

const CLAVE = "tvutb.carrito";

beforeEach(() => {
  window.localStorage.clear();
});

describe("leerCarrito", () => {
  it("parte de un carrito vacío", () => {
    const c = leerCarrito();
    expect(c.lineas).toEqual([]);
    expect(c.creadoEn).toBe(0);
    expect(c.horaRecogida).toBeNull();
  });

  it("descarta un carrito vencido (TTL de 24 h)", () => {
    window.localStorage.setItem(
      CLAVE,
      JSON.stringify({
        lineas: [{ productoId: 101, cantidad: 2 }],
        creadoEn: Date.now() - 25 * 60 * 60 * 1000,
        horaRecogida: null,
      }),
    );
    expect(leerCarrito().lineas).toEqual([]);
    expect(window.localStorage.getItem(CLAVE)).toBeNull();
  });

  it("tolera basura en el almacenamiento", () => {
    window.localStorage.setItem(CLAVE, "{no es json");
    expect(leerCarrito().lineas).toEqual([]);

    window.localStorage.setItem(CLAVE, JSON.stringify({ hola: true }));
    expect(leerCarrito().lineas).toEqual([]);
  });
});

describe("agregar", () => {
  it("añade una línea y sella la creación", () => {
    const c = agregar(101, 1);
    expect(c.lineas).toEqual([{ productoId: 101, cantidad: 1 }]);
    expect(c.creadoEn).toBeGreaterThan(0);
    expect(leerCarrito().lineas).toEqual([{ productoId: 101, cantidad: 1 }]);
  });

  it("acumula sobre la misma línea sin superar las existencias", () => {
    agregar(101, 5);
    const c = agregar(101, 5);
    // De todito grande tiene 14 unidades.
    expect(c.lineas).toEqual([{ productoId: 101, cantidad: 10 }]);
    const tope = agregar(101, 99);
    expect(tope.lineas[0].cantidad).toBe(14);
  });

  it("ignora un producto inexistente o agotado", () => {
    expect(agregar(999999, 1).lineas).toEqual([]);
    // Doritos tiene 0 unidades.
    expect(agregar(108, 1).lineas).toEqual([]);
  });
});

describe("cambiarCantidad y quitar", () => {
  it("fija la cantidad y la limita al inventario", () => {
    agregar(101, 1);
    expect(cambiarCantidad(101, 3).lineas[0].cantidad).toBe(3);
    expect(cambiarCantidad(101, 500).lineas[0].cantidad).toBe(14);
  });

  it("quitar una cantidad de cero o menos elimina la línea", () => {
    agregar(101, 2);
    expect(quitar(101).lineas).toEqual([]);
    agregar(101, 2);
    expect(cambiarCantidad(101, -4).lineas).toEqual([]);
  });
});

describe("elegirHora y vaciar", () => {
  it("guarda la franja de recogida sin perder las líneas", () => {
    agregar(101, 1);
    const c = elegirHora("10:40");
    expect(c.horaRecogida).toBe("10:40");
    expect(c.lineas).toHaveLength(1);
  });

  it("vaciar deja el carrito en cero", () => {
    agregar(101, 3);
    vaciar();
    expect(leerCarrito().lineas).toEqual([]);
    expect(leerCarrito().horaRecogida).toBeNull();
  });
});

describe("totales y agrupación", () => {
  it("suma unidades y centavos", () => {
    agregar(101, 2); // 3500 × 2
    agregar(123, 1); // 2000 × 1
    const c = leerCarrito();
    expect(unidades(c)).toBe(3);
    expect(totalCentavos(c)).toBe(350000 * 2 + 200000);
  });

  it("agrupa por tienda como lo hará el mostrador", () => {
    agregar(101, 1); // Antojos
    agregar(123, 1); // Punto Fit
    agregar(144, 1); // Almuerzo 01
    const grupos = porTienda(leerCarrito());
    const tiendas = grupos.map((g) => g.tienda).sort();
    expect(tiendas).toEqual(["almuerzo-01", "antojos", "punto-fit"]);
    const antojos = grupos.find((g) => g.tienda === "antojos");
    expect(antojos?.items).toEqual([{ nombre: "De todito grande", cantidad: 1 }]);
  });
});

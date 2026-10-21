// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { crearPedido } from "@/lib/pedidos";
import type { Carrito } from "@/lib/carrito";

function respuesta(cuerpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  } as unknown as Response;
}

const CARRITO: Carrito = {
  lineas: [
    { productoId: 101, cantidad: 2 },
    { productoId: 144, cantidad: 1 },
  ],
  creadoEn: 1_000,
  horaRecogida: "10:40",
};

const VACIO: Carrito = { lineas: [], creadoEn: 0, horaRecogida: null };

let fetchSimulado: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSimulado = vi.fn();
  vi.stubGlobal("fetch", fetchSimulado);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("crearPedido", () => {
  it("no llama a la API si el carrito está vacío", async () => {
    const resultado = await crearPedido(VACIO, null);
    expect(resultado).toEqual({
      estado: "error",
      mensaje: "Tu carrito está vacío.",
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("envía los ítems con llave de idempotencia", async () => {
    fetchSimulado.mockResolvedValue(
      respuesta({ id: 1, estado: "pendiente", total: 0, items: [] }, 201),
    );
    const resultado = await crearPedido(CARRITO, "10:40");

    expect(resultado.estado).toBe("real");
    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toContain("/orders");
    expect(opciones.method).toBe("POST");
    expect(opciones.headers["Idempotency-Key"]).toBeTruthy();
    expect(JSON.parse(opciones.body)).toEqual({
      items: [
        { product_id: 101, cantidad: 2 },
        { product_id: 144, cantidad: 1 },
      ],
    });
  });

  it("degrada a demostración si el endpoint no existe", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}, 404));
    await expect(crearPedido(CARRITO, null)).resolves.toEqual({ estado: "demo" });
  });

  it("degrada a demostración si la red falla", async () => {
    fetchSimulado.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(crearPedido(CARRITO, null)).resolves.toEqual({ estado: "demo" });
  });

  it("nunca degrada un 401", async () => {
    fetchSimulado.mockResolvedValue(respuesta({ detail: "no" }, 401));
    const resultado = await crearPedido(CARRITO, null);
    expect(resultado.estado).toBe("error");
    if (resultado.estado === "error") {
      expect(resultado.mensaje).toContain("sesión expiró");
    }
  });

  it("propaga el mensaje de otros errores", async () => {
    fetchSimulado.mockResolvedValue(
      respuesta({ detail: "Sin existencias de pollo" }, 409),
    );
    const resultado = await crearPedido(CARRITO, null);
    expect(resultado).toEqual({
      estado: "error",
      mensaje: "Sin existencias de pollo",
    });
  });
});

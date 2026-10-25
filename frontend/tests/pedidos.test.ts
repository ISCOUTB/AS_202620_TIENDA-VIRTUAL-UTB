// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EVENTO_PEDIDOS, crearPedido } from "@/lib/pedidos";
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

  it("envía los ítems y la hora con llave de idempotencia", async () => {
    const pedidos = [{ id: 1, estado: "pendiente_pago", total_centavos: 0, items: [] }];
    fetchSimulado.mockResolvedValue(respuesta(pedidos, 201));
    const resultado = await crearPedido(CARRITO, "10:40");

    expect(resultado).toEqual({ estado: "real", pedidos });
    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toContain("/orders");
    expect(opciones.method).toBe("POST");
    expect(opciones.headers["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(opciones.body)).toEqual({
      items: [
        { product_id: 101, cantidad: 2 },
        { product_id: 144, cantidad: 1 },
      ],
      hora_recogida: "10:40",
    });
  });

  it("avisa con EVENTO_PEDIDOS solo cuando se crean pedidos", async () => {
    const oyente = vi.fn();
    window.addEventListener(EVENTO_PEDIDOS, oyente);
    try {
      fetchSimulado.mockResolvedValueOnce(respuesta({ detail: "Sin existencias" }, 400));
      await crearPedido(CARRITO, "10:40");
      expect(oyente).not.toHaveBeenCalled();

      fetchSimulado.mockResolvedValueOnce(respuesta([], 201));
      await crearPedido(CARRITO, "10:40");
      expect(oyente).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(EVENTO_PEDIDOS, oyente);
    }
  });

  it("sin hora no envía hora_recogida", async () => {
    fetchSimulado.mockResolvedValue(respuesta([], 201));
    await crearPedido(CARRITO, null);
    expect(JSON.parse(fetchSimulado.mock.calls[0][1].body)).not.toHaveProperty("hora_recogida");
  });

  it("reutiliza la llave al reintentar tras un fallo de red", async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    fetchSimulado.mockResolvedValueOnce(respuesta([], 201));
    fetchSimulado.mockResolvedValueOnce(respuesta([], 201));
    await crearPedido(CARRITO, "11:00");
    await crearPedido(CARRITO, "11:00");
    await crearPedido(CARRITO, "11:00");
    const llaves = fetchSimulado.mock.calls.map(([, o]) => o.headers["Idempotency-Key"]);
    // El reintento usa la misma llave; tras el éxito, un pedido nuevo usa otra.
    expect(llaves[1]).toBe(llaves[0]);
    expect(llaves[2]).not.toBe(llaves[1]);
  });

  it("degrada a demostración si el endpoint no existe", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}, 404));
    await expect(crearPedido(CARRITO, null)).resolves.toEqual({ estado: "demo" });
  });

  it("degrada a demostración si la red falla", async () => {
    fetchSimulado.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(crearPedido(CARRITO, null)).resolves.toEqual({ estado: "demo" });
  });

  it("degrada a demostración si el proxy no alcanza la API (502)", async () => {
    fetchSimulado.mockResolvedValue(respuesta({ detail: "no disponible" }, 502));
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

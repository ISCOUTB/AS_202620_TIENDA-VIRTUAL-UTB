// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiGet,
  apiPost,
  pedir,
  setAlNoAutorizado,
} from "@/lib/api/client";

const CLAVE_TOKEN = "tvutb.token";

function respuesta(cuerpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  } as unknown as Response;
}

function respuestaSinCuerpo(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError("cuerpo vacío");
    },
  } as unknown as Response;
}

let fetchSimulado: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  fetchSimulado = vi.fn();
  vi.stubGlobal("fetch", fetchSimulado);
});

afterEach(() => {
  setAlNoAutorizado(null);
  vi.unstubAllGlobals();
});

describe("ApiError", () => {
  it("reconoce autorización y endpoint ausente", () => {
    expect(new ApiError(401, "x").esAutorizacion).toBe(true);
    expect(new ApiError(403, "x").esAutorizacion).toBe(true);
    expect(new ApiError(500, "x").esAutorizacion).toBe(false);

    for (const estado of [404, 405, 501]) {
      expect(new ApiError(estado, "x").esNoImplementado).toBe(true);
    }
    expect(new ApiError(0, "x").esNoImplementado).toBe(false);
    expect(new ApiError(401, "x").name).toBe("ApiError");
  });
});

describe("pedir", () => {
  it("devuelve el JSON de una respuesta correcta", async () => {
    fetchSimulado.mockResolvedValue(respuesta({ hola: "mundo" }));
    await expect(apiGet("/saludo")).resolves.toEqual({ hola: "mundo" });
    const [url] = fetchSimulado.mock.calls[0];
    expect(url).toContain("/saludo");
  });

  it("adjunta cuerpo, idempotencia y autorización cuando corresponde", async () => {
    window.localStorage.setItem(CLAVE_TOKEN, "abc.def");
    fetchSimulado.mockResolvedValue(respuesta({ ok: true }));

    await apiPost("/orders", { items: [] }, "llave-1");

    const [, opciones] = fetchSimulado.mock.calls[0];
    expect(opciones.method).toBe("POST");
    expect(opciones.body).toBe(JSON.stringify({ items: [] }));
    expect(opciones.headers["Content-Type"]).toBe("application/json");
    expect(opciones.headers["Idempotency-Key"]).toBe("llave-1");
    expect(opciones.headers.Authorization).toBe("Bearer abc.def");
  });

  it("no manda Content-Type ni cuerpo en un GET simple", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}));
    await pedir("/ping");
    const [, opciones] = fetchSimulado.mock.calls[0];
    expect(opciones.method).toBe("GET");
    expect(opciones.body).toBeUndefined();
    expect(opciones.headers["Content-Type"]).toBeUndefined();
    expect(opciones.headers.Authorization).toBeUndefined();
  });

  it("propaga el detail del backend en el error", async () => {
    fetchSimulado.mockResolvedValue(
      respuesta({ detail: "Producto agotado" }, 409),
    );
    await expect(pedir("/orders", { metodo: "POST", cuerpo: {} })).rejects.toThrow(
      "Producto agotado",
    );
  });

  it("usa un mensaje genérico si el error no trae JSON", async () => {
    fetchSimulado.mockResolvedValue(respuestaSinCuerpo(500));
    await expect(pedir("/falla")).rejects.toThrow(
      "La tienda respondió con un error 500.",
    );
  });

  it("convierte una caída de red en un estado 0", async () => {
    fetchSimulado.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await pedir("/cualquiera").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).estado).toBe(0);
  });

  it("avisa al manejador de sesión ante un 401", async () => {
    const manejador = vi.fn();
    setAlNoAutorizado(manejador);
    fetchSimulado.mockResolvedValue(respuesta({ detail: "no" }, 401));

    await expect(apiGet("/privado")).rejects.toThrow();
    expect(manejador).toHaveBeenCalledTimes(1);
  });

  it("no avisa en otros errores", async () => {
    const manejador = vi.fn();
    setAlNoAutorizado(manejador);
    fetchSimulado.mockResolvedValue(respuesta({}, 404));

    await expect(apiGet("/nada")).rejects.toThrow();
    expect(manejador).not.toHaveBeenCalled();
  });
});

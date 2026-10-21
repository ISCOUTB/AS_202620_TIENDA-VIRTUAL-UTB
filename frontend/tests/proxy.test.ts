import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reenviar, urlDeLaApi } from "@/lib/api/proxy";

/**
 * El proxy es la única puerta del navegador a la API: reenvía la petición al
 * backend por la red interna y devuelve su respuesta tal cual.
 */
beforeEach(() => {
  vi.stubEnv("API_URL", "http://api.interno:8000/");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("urlDeLaApi", () => {
  it("une los segmentos de la ruta con la base de la API", () => {
    expect(urlDeLaApi(["identity", "login"])).toBe(
      "http://api.interno:8000/identity/login",
    );
  });

  it("conserva la cadena de consulta", () => {
    expect(urlDeLaApi(["catalog", "products"], "?page=2")).toBe(
      "http://api.interno:8000/catalog/products?page=2",
    );
  });

  it("escapa los segmentos", () => {
    expect(urlDeLaApi(["catalog", "a b"])).toBe(
      "http://api.interno:8000/catalog/a%20b",
    );
  });

  it("lee la base en cada llamada, no al importar el módulo", () => {
    vi.stubEnv("API_URL", "http://otro:9000");
    expect(urlDeLaApi(["health"])).toBe("http://otro:9000/health");
  });
});

describe("reenviar", () => {
  it("reenvía método, ruta, consulta y cabeceras de autorización", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchSimulado);

    const peticion = new Request(
      "http://localhost:3000/api/proxy/identity/login?modo=1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer abc.def",
          "Idempotency-Key": "llave-1",
          Cookie: "tvutb.sesion=1",
        },
        body: JSON.stringify({ email: "ana@utb.edu.co" }),
      },
    );

    const respuesta = await reenviar(peticion, ["identity", "login"]);

    const [destino, opciones] = fetchSimulado.mock.calls[0];
    expect(destino).toBe("http://api.interno:8000/identity/login?modo=1");
    expect(opciones.method).toBe("POST");
    expect(opciones.body).toBe(JSON.stringify({ email: "ana@utb.edu.co" }));
    expect(opciones.headers.get("Authorization")).toBe("Bearer abc.def");
    expect(opciones.headers.get("Idempotency-Key")).toBe("llave-1");
    // La cookie de sesión es del frontend: la API no la necesita.
    expect(opciones.headers.get("Cookie")).toBeNull();
    await expect(respuesta.json()).resolves.toEqual({ ok: true });
  });

  it("no manda cuerpo en un GET", async () => {
    const fetchSimulado = vi
      .fn()
      .mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchSimulado);

    await reenviar(new Request("http://localhost:3000/api/proxy/health"), [
      "health",
    ]);

    const [, opciones] = fetchSimulado.mock.calls[0];
    expect(opciones.method).toBe("GET");
    expect(opciones.body).toBeUndefined();
  });

  it("devuelve el estado y el cuerpo de la API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Sin existencias" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const respuesta = await reenviar(
      new Request("http://localhost:3000/api/proxy/orders", { method: "POST" }),
      ["orders"],
    );

    expect(respuesta.status).toBe(409);
    await expect(respuesta.json()).resolves.toEqual({
      detail: "Sin existencias",
    });
  });

  it("devuelve 502 cuando la API no responde", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));

    const respuesta = await reenviar(
      new Request("http://localhost:3000/api/proxy/orders", { method: "POST" }),
      ["orders"],
    );

    // 502 es "la API no está disponible": el cliente lo traduce a caída, no a
    // error de negocio, y la sesión degrada a modo demostración.
    expect(respuesta.status).toBe(502);
    await expect(respuesta.json()).resolves.toHaveProperty("detail");
  });
});

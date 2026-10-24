// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLAVE_DEMO,
  borrarSesion,
  cerrarSesion,
  crearCuenta,
  iniciarSesion,
  leerSesion,
} from "@/lib/sesion";
import { esAdminGeneral } from "@/lib/roles";

const TOKEN = {
  access_token: "tok-123",
  expires_in: 3600,
  token_type: "bearer",
};

const USUARIO = {
  id: 7,
  nombre: "Ana Pérez",
  email: "ana@utb.edu.co",
  rol: "cliente" as const,
  creado_en: "2026-01-01T00:00:00Z",
};

function respuesta(cuerpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  } as unknown as Response;
}

let fetchSimulado: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  fetchSimulado = vi.fn();
  vi.stubGlobal("fetch", fetchSimulado);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Respuestas del contrato real para login / registro / usuario actual. */
function contratoReal(): void {
  fetchSimulado.mockImplementation((url: string) => {
    if (url.endsWith("/identity/login")) return Promise.resolve(respuesta(TOKEN));
    if (url.endsWith("/identity/register")) return Promise.resolve(respuesta(USUARIO, 201));
    if (url.endsWith("/identity/me")) return Promise.resolve(respuesta(USUARIO));
    return Promise.resolve(respuesta({}, 404));
  });
}

describe("iniciarSesion — contrato real", () => {
  it("guarda la sesión real con su vencimiento", async () => {
    contratoReal();
    const sesion = await iniciarSesion(" ana@utb.edu.co ", "secreta");
    expect(sesion.modo).toBe("real");
    expect(sesion.token).toBe("tok-123");
    expect(sesion.usuario.email).toBe("ana@utb.edu.co");
    expect(sesion.expiraEn).toBeGreaterThan(Date.now());
    expect(leerSesion()?.modo).toBe("real");
  });

  it("envía el token recién obtenido al pedir el usuario actual", async () => {
    // Regresión: la llamada a `/identity/me` ocurre antes de guardar la
    // sesión, así que el token debe enviarse explícitamente; si no, la API
    // responde 401 y el login falla.
    contratoReal();
    await iniciarSesion("ana@utb.edu.co", "secreta");

    const llamadaMe = fetchSimulado.mock.calls.find(([url]) =>
      String(url).includes("/identity/me"),
    );
    expect(llamadaMe).toBeDefined();
    const [, opciones] = llamadaMe as [string, { headers: Record<string, string> }];
    expect(opciones.headers.Authorization).toBe("Bearer tok-123");
  });
});

describe("iniciarSesion — modo demostración", () => {
  it("entra cuando el endpoint no existe (404)", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}, 404));
    const sesion = await iniciarSesion("Demo@UTB.edu.co", CLAVE_DEMO);
    expect(sesion.modo).toBe("demo");
    expect(sesion.usuario.id).toBe(1);
    expect(leerSesion()?.usuario.nombre).toBe("Estudiante Demo");
  });

  it("entra cuando la API no responde (estado 0)", async () => {
    fetchSimulado.mockRejectedValue(new TypeError("Failed to fetch"));
    const sesion = await iniciarSesion("admin@utb.edu.co", CLAVE_DEMO);
    expect(sesion.modo).toBe("demo");
    expect(esAdminGeneral(sesion.usuario)).toBe(true);
  });

  it("exige la contraseña de demostración", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}, 404));
    await expect(iniciarSesion("demo@utb.edu.co", "otra")).rejects.toThrow(
      CLAVE_DEMO,
    );
  });

  it("exige un correo conocido de la demostración", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}, 404));
    await expect(
      iniciarSesion("nadie@utb.edu.co", CLAVE_DEMO),
    ).rejects.toThrow("demo@utb.edu.co");
  });

  it("nunca disfraza un 401 real de demostración", async () => {
    fetchSimulado.mockResolvedValue(respuesta({ detail: "no" }, 401));
    await expect(
      iniciarSesion("demo@utb.edu.co", CLAVE_DEMO),
    ).rejects.toThrow("no coinciden con ninguna cuenta");
    expect(leerSesion()).toBeNull();
  });

  it("propaga otros errores del backend", async () => {
    // 500 = fallo de la API, no su ausencia: es un error y se muestra.
    fetchSimulado.mockResolvedValue(respuesta({ detail: "Servicio caído" }, 500));
    await expect(iniciarSesion("demo@utb.edu.co", CLAVE_DEMO)).rejects.toThrow(
      "Servicio caído",
    );
  });

  it("degrada a demostración cuando la API no está disponible (503)", async () => {
    // 503 = la tienda no responde: mismo criterio que la caída de red.
    fetchSimulado.mockResolvedValue(respuesta({ detail: "no disponible" }, 503));
    const sesion = await iniciarSesion("demo@utb.edu.co", CLAVE_DEMO);
    expect(sesion.modo).toBe("demo");
  });

  it("degrada a demostración cuando el proxy devuelve 502", async () => {
    // El proxy interno no alcanzó la API: el cliente lo traduce a caída.
    fetchSimulado.mockResolvedValue(respuesta({ detail: "API no disponible" }, 502));
    const sesion = await iniciarSesion("demo@utb.edu.co", CLAVE_DEMO);
    expect(sesion.modo).toBe("demo");
  });
});

describe("crearCuenta", () => {
  it("registra e inicia sesión contra el contrato real", async () => {
    contratoReal();
    const sesion = await crearCuenta("Ana Pérez", "ana@utb.edu.co", "secreta");
    expect(sesion.modo).toBe("real");
    expect(sesion.usuario.id).toBe(7);
  });

  it("en demostración crea una cuenta local marcada", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}, 404));
    const sesion = await crearCuenta("Nuevo Cliente", "nuevo@utb.edu.co", "x");
    expect(sesion.modo).toBe("demo");
    expect(sesion.usuario.roles).toEqual([{ codigo: "comprador", tienda_id: null }]);
    expect(sesion.usuario.email).toBe("nuevo@utb.edu.co");
    expect(sesion.usuario.id).toBeGreaterThanOrEqual(9000);
  });

  it("avisa si el correo ya existe (409)", async () => {
    fetchSimulado.mockResolvedValue(respuesta({ detail: "dup" }, 409));
    await expect(
      crearCuenta("Ana", "ana@utb.edu.co", "x"),
    ).rejects.toThrow("ya tiene una cuenta");
  });

  it("traduce un 401 de registro", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}, 401));
    await expect(crearCuenta("Ana", "ana@utb.edu.co", "x")).rejects.toThrow(
      "no son válidos para crear la cuenta",
    );
  });

  it("propaga el detalle de otros errores", async () => {
    fetchSimulado.mockResolvedValue(respuesta({ detail: "Datos incompletos" }, 422));
    await expect(crearCuenta("Ana", "ana@utb.edu.co", "x")).rejects.toThrow(
      "Datos incompletos",
    );
  });
});

describe("ciclo de la sesión local", () => {
  it("borrarSesion limpia el almacenamiento", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}, 404));
    await iniciarSesion("demo@utb.edu.co", CLAVE_DEMO);
    expect(leerSesion()).not.toBeNull();

    borrarSesion();
    expect(leerSesion()).toBeNull();
  });

  it("cerrarSesion es el alias público de borrarSesion", async () => {
    fetchSimulado.mockResolvedValue(respuesta({}, 404));
    await iniciarSesion("demo@utb.edu.co", CLAVE_DEMO);
    cerrarSesion();
    expect(leerSesion()).toBeNull();
  });

  it("descarta una sesión vencida", () => {
    window.localStorage.setItem("tvutb.token", "viejo");
    window.localStorage.setItem(
      "tvutb.usuario",
      JSON.stringify({ id: 1, nombre: "x", email: "x@x", rol: "cliente", creado_en: "" }),
    );
    window.localStorage.setItem("tvutb.modo", "demo");
    window.localStorage.setItem("tvutb.expira", String(Date.now() - 1000));

    expect(leerSesion()).toBeNull();
    expect(window.localStorage.getItem("tvutb.token")).toBeNull();
  });

  it("devuelve null si falta alguna pieza", () => {
    window.localStorage.setItem("tvutb.token", "solo-token");
    expect(leerSesion()).toBeNull();
  });

  it("devuelve null con un usuario corrupto", () => {
    window.localStorage.setItem("tvutb.token", "t");
    window.localStorage.setItem("tvutb.usuario", "{no json");
    window.localStorage.setItem("tvutb.modo", "real");
    expect(leerSesion()).toBeNull();
  });
});

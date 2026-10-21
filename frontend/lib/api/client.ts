/**
 * Cliente HTTP mínimo y tipado para la API de Tienda Virtual UTB.
 *
 * - El navegador **no puede leer `API_URL`**: las variables `NEXT_PUBLIC_*` son
 *   las únicas que viajan al bundle, y `API_URL` es un secreto de runtime.
 *   Por eso todas las peticiones pasan por el proxy interno same-origin
 *   (`app/api/proxy/[...path]/route.ts`), que sí resuelve `API_URL` en el
 *   servidor. Así la API sigue privada y no hace falta CORS.
 * - Toda respuesta de error se convierte en `ApiError` con el estado HTTP,
 *   para que la vista decida si muestra un error de negocio, un 401/403 o la
 *   degradación "próximamente" de un endpoint `preview`.
 */

/** Prefijo del proxy interno; en el navegador es una ruta same-origin. */
const BASE = "/api/proxy";

/** Clave de almacenamiento del JWT; la comparte lib/sesion.ts. */
const CLAVE_TOKEN = "tvutb.token";

/**
 * Callback que lib/sesion.ts registra para reaccionar a un 401: el cliente
 * HTTP no sabe de rutas ni de sesión, solo avisa. Sin esta separación el
 * módulo se importaría a sí mismo.
 */
let alNoAutorizado: (() => void) | null = null;

export function setAlNoAutorizado(manejador: (() => void) | null): void {
  alNoAutorizado = manejador;
}

export class ApiError extends Error {
  /** Estado HTTP; 0 = la API no respondió (red/caída). */
  readonly estado: number;

  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.name = "ApiError";
    this.estado = estado;
  }

  /** Faltan credenciales o el rol no alcanza (401/403). */
  get esAutorizacion(): boolean {
    return this.estado === 401 || this.estado === 403;
  }

  /** La API no existe aún para esa ruta (endpoint `preview`). */
  get esNoImplementado(): boolean {
    return this.estado === 404 || this.estado === 405 || this.estado === 501;
  }

  /**
   * La API no respondió: o no hubo conexión (estado 0) o el proxy interno
   * devolvió un error de puerta de enlace (502/503/504). En los dos casos la
   * tienda está inalcanzable y corresponde degradar a modo demostración, nunca
   * tratar el fallo como un error de negocio ni disfrazarlo de 401.
   */
  get esCaida(): boolean {
    return (
      this.estado === 0 ||
      this.estado === 502 ||
      this.estado === 503 ||
      this.estado === 504
    );
  }
}

type OpcionesPeticion = {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  cuerpo?: unknown;
  /** Llave de idempotencia para mutaciones (checkout, ajustes). */
  idempotencyKey?: string;
  señal?: AbortSignal;
  /**
   * Token explícito, con prioridad sobre el de la sesión guardada. Lo usa la
   * llamada que sigue al login: en ese momento el token todavía no está en
   * `localStorage`, así que sin esto la API respondería 401.
   */
  token?: string;
};

function tokenActual(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export async function pedir<T>(
  ruta: string,
  opciones: OpcionesPeticion = {},
): Promise<T> {
  const { metodo = "GET", cuerpo, idempotencyKey, señal, token: tokenPropio } = opciones;

  const encabezados: Record<string, string> = { Accept: "application/json" };
  if (cuerpo !== undefined) encabezados["Content-Type"] = "application/json";
  if (idempotencyKey) encabezados["Idempotency-Key"] = idempotencyKey;
  const token = tokenPropio ?? tokenActual();
  if (token) encabezados.Authorization = `Bearer ${token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      cache: "no-store",
      signal: señal,
    });
  } catch {
    throw new ApiError(0, "No se pudo contactar la tienda. Revisa tu conexión.");
  }

  if (!respuesta.ok) {
    // 401 = la sesión dejó de valer (expiró o se revocó). El cliente avisa a
    // quien la gestione; nunca reintenta en silencio.
    if (respuesta.status === 401) alNoAutorizado?.();

    let detalle = `La tienda respondió con un error ${respuesta.status}.`;
    try {
      const error = (await respuesta.json()) as { detail?: unknown };
      if (typeof error.detail === "string" && error.detail.length > 0) {
        detalle = error.detail;
      }
    } catch {
      // Respuesta sin cuerpo JSON: se conserva el mensaje genérico.
    }
    throw new ApiError(respuesta.status, detalle);
  }

  return (await respuesta.json()) as T;
}

/** GET tipado. `opciones.token` fuerza un token (el del login recién hecho). */
export const apiGet = <T>(
  ruta: string,
  opciones: { señal?: AbortSignal; token?: string } = {},
) => pedir<T>(ruta, { metodo: "GET", ...opciones });

/** POST tipado con soporte de `Idempotency-Key`. */
export const apiPost = <T>(
  ruta: string,
  cuerpo: unknown,
  idempotencyKey?: string,
) => pedir<T>(ruta, { metodo: "POST", cuerpo, idempotencyKey });

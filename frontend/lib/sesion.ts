"use client";

/**
 * Sesión de la tienda.
 *
 * Estrategia (ADR 0011): el token vive en `localStorage` en este incremento
 * porque el módulo `identity` del backend todavía no existe y sin backend no
 * hay cookie httpOnly posible. La migración a cookie está planificada.
 *
 * Reglas:
 * - Se llama al contrato real primero (`POST /identity/login`).
 * - Solo si el endpoint no existe (404/405/501) o la API no responde (0) se
 *   entra en MODO DEMOSTRACIÓN. Un 401 real NUNCA se convierte en demo.
 * - El modo demo se marca en la sesión y la UI lo muestra siempre.
 */

import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError, setAlNoAutorizado } from "@/lib/api/client";
import { rutaDe } from "@/lib/api/endpoints";
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserOut,
} from "@/lib/api/generated/contract";
import { USUARIOS_MOCK } from "@/lib/mocks/identidad";
import { enteroAleatorio } from "@/lib/azar";

export const CLAVE_TOKEN = "tvutb.token";
const CLAVE_USUARIO = "tvutb.usuario";
const CLAVE_MODO = "tvutb.modo";
const CLAVE_EXPIRA = "tvutb.expira";
const EVENTO = "tvutb:sesion";
const COOKIE_PISTA = "tvutb.sesion";

/** Contraseña única del modo demostración (visible en la pantalla). */
export const CLAVE_DEMO = "demo1234";

export type ModoSesion = "real" | "demo";

export type Sesion = {
  token: string;
  usuario: UserOut;
  modo: ModoSesion;
  /** epoch ms en que deja de valer. */
  expiraEn: number;
};

function disponible(): boolean {
  return typeof window !== "undefined";
}

function emitir(): void {
  if (disponible()) window.dispatchEvent(new Event(EVENTO));
}

function pistaCookie(activa: boolean, segundos: number): void {
  if (!disponible()) return;
  document.cookie = activa
    ? `${COOKIE_PISTA}=1; path=/; max-age=${segundos}; samesite=lax`
    : `${COOKIE_PISTA}=; path=/; max-age=0; samesite=lax`;
}

export function leerSesion(): Sesion | null {
  if (!disponible()) return null;
  try {
    const token = window.localStorage.getItem(CLAVE_TOKEN);
    const usuario = window.localStorage.getItem(CLAVE_USUARIO);
    const modo = window.localStorage.getItem(CLAVE_MODO);
    const expira = Number(window.localStorage.getItem(CLAVE_EXPIRA) ?? 0);
    if (!token || !usuario || !modo) return null;
    if (expira > 0 && Date.now() > expira) {
      borrarSesion();
      return null;
    }
    return {
      token,
      usuario: JSON.parse(usuario) as UserOut,
      modo: modo === "demo" ? "demo" : "real",
      expiraEn: expira,
    };
  } catch {
    return null;
  }
}

function guardarSesion(sesion: Sesion): void {
  if (!disponible()) return;
  const segundos = Math.max(
    60,
    Math.floor((sesion.expiraEn - Date.now()) / 1000),
  );
  try {
    window.localStorage.setItem(CLAVE_TOKEN, sesion.token);
    window.localStorage.setItem(CLAVE_USUARIO, JSON.stringify(sesion.usuario));
    window.localStorage.setItem(CLAVE_MODO, sesion.modo);
    window.localStorage.setItem(CLAVE_EXPIRA, String(sesion.expiraEn));
  } catch {
    // Almacenamiento bloqueado: la sesión dura lo que dure la pestaña.
  }
  pistaCookie(true, segundos);
  emitir();
}

export function borrarSesion(): void {
  if (!disponible()) return;
  try {
    window.localStorage.removeItem(CLAVE_TOKEN);
    window.localStorage.removeItem(CLAVE_USUARIO);
    window.localStorage.removeItem(CLAVE_MODO);
    window.localStorage.removeItem(CLAVE_EXPIRA);
  } catch {
    // nada que borrar
  }
  pistaCookie(false, 0);
  emitir();
}

/** Sesión local para el modo demostración. */
function sesionDemo(usuario: UserOut): Sesion {
  return {
    token: `demo.${usuario.id}.${Date.now().toString(36)}`,
    usuario,
    modo: "demo",
    expiraEn: Date.now() + 24 * 60 * 60 * 1000,
  };
}

function buscarDemo(email: string): UserOut | undefined {
  const normalizado = email.trim().toLowerCase();
  return USUARIOS_MOCK.find((u) => u.email.toLowerCase() === normalizado);
}

/**
 * Inicia sesión. Devuelve la sesión o lanza un Error con mensaje para la UI.
 */
export async function iniciarSesion(
  email: string,
  password: string,
): Promise<Sesion> {
  const credenciales: LoginRequest = { email: email.trim(), password };

  try {
    const token = await apiPost<TokenResponse>(
      rutaDe("loginUser"),
      credenciales,
    );
    // El token se envía explícitamente: en este punto la sesión todavía no
    // está guardada, y sin `Authorization` la API respondería 401.
    const usuario = await apiGet<UserOut>(rutaDe("getCurrentUser"), {
      token: token.access_token,
    });
    const sesion: Sesion = {
      token: token.access_token,
      usuario,
      modo: "real",
      expiraEn: Date.now() + token.expires_in * 1000,
    };
    guardarSesion(sesion);
    return sesion;
  } catch (error) {
    if (error instanceof ApiError) {
      // 401 = credenciales inválidas reales: no se disfraza de demo.
      if (error.estado === 401) {
        throw new Error(
          "Ese correo y esa contraseña no coinciden con ninguna cuenta.",
        );
      }
      // Endpoint ausente o API caída: modo demostración honesto.
      if (error.esNoImplementado || error.esCaida) {
        return entrarDemo(email, password);
      }
      throw new Error(error.message);
    }
    throw new Error("No se pudo iniciar sesión. Inténtalo de nuevo.");
  }
}

function entrarDemo(email: string, password: string): Sesion {
  if (password !== CLAVE_DEMO) {
    throw new Error(
      `En modo demostración la contraseña es "${CLAVE_DEMO}".`,
    );
  }
  const usuario = buscarDemo(email);
  if (!usuario) {
    throw new Error(
      "En modo demostración usa demo@utb.edu.co o admin@utb.edu.co.",
    );
  }
  const sesion = sesionDemo(usuario);
  guardarSesion(sesion);
  return sesion;
}

/** Crea una cuenta. En modo demostración no persiste en el servidor. */
export async function crearCuenta(
  nombre: string,
  email: string,
  password: string,
): Promise<Sesion> {
  const cuerpo: RegisterRequest = {
    nombre: nombre.trim(),
    email: email.trim(),
    password,
  };

  try {
    const usuario = await apiPost<UserOut>(rutaDe("registerUser"), cuerpo);
    // Tras registrar, se inicia sesión con las mismas credenciales.
    const token = await apiPost<TokenResponse>(rutaDe("loginUser"), {
      email: cuerpo.email,
      password,
    } satisfies LoginRequest);
    const sesion: Sesion = {
      token: token.access_token,
      usuario,
      modo: "real",
      expiraEn: Date.now() + token.expires_in * 1000,
    };
    guardarSesion(sesion);
    return sesion;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.estado === 409) {
        throw new Error("Ese correo ya tiene una cuenta. Inicia sesión.");
      }
      if (error.estado === 401) {
        throw new Error(
          "El correo y la contraseña no son válidos para crear la cuenta.",
        );
      }
      if (error.esNoImplementado || error.esCaida) {
        const usuario: UserOut = {
          id: 9000 + enteroAleatorio(999),
          nombre: cuerpo.nombre,
          email: cuerpo.email,
          roles: [{ codigo: "comprador", tienda_id: null }],
          creado_en: new Date().toISOString(),
        };
        const sesion = sesionDemo(usuario);
        guardarSesion(sesion);
        return sesion;
      }
      throw new Error(error.message);
    }
    throw new Error("No se pudo crear la cuenta. Inténtalo de nuevo.");
  }
}

export function cerrarSesion(): void {
  borrarSesion();
}

/** Suscripción reactiva a la sesión (client components). */
export function useSesion(): { sesion: Sesion | null; cargando: boolean } {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const sincronizar = () => setSesion(leerSesion());
    sincronizar();
    setCargando(false);
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  return { sesion, cargando };
}

/** El cliente HTTP avisa aquí cuando la API responde 401. */
if (typeof window !== "undefined") {
  setAlNoAutorizado(() => {
    borrarSesion();
    const ruta = window.location.pathname;
    if (ruta.startsWith("/auth")) return;
    const destino = encodeURIComponent(ruta + window.location.search);
    window.location.assign(`/auth/ingresar?next=${destino}&motivo=expirada`);
  });
}

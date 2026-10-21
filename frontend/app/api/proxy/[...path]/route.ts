import { reenviar } from "@/lib/api/proxy";

/**
 * Puerta única y same-origin del navegador hacia la API.
 *
 * `/api/proxy/identity/login` → `POST ${API_URL}/identity/login`.
 *
 * La API no se publica: viaja por la red interna del Compose. `dynamic` evita
 * que Next intente cachear estas respuestas.
 */
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ path: string[] }> };

async function manejar(peticion: Request, contexto: Contexto): Promise<Response> {
  const { path } = await contexto.params;
  return reenviar(peticion, path);
}

export const GET = manejar;
export const POST = manejar;
export const PUT = manejar;
export const PATCH = manejar;
export const DELETE = manejar;

/**
 * Proxy interno hacia la API de Tienda Virtual UTB.
 *
 * Por qué existe: el bundle del navegador solo conoce las variables
 * `NEXT_PUBLIC_*` (el shim `process/browser` de Next lleva `env` vacío en el
 * cliente), así que `API_URL` —que se inyecta en tiempo de ejecución— nunca
 * llega al navegador. Sin este proxy, el login y el pedido apuntan al
 * `localhost:8000` del visitante y degradan a modo demostración.
 *
 * El proxy resuelve las dos cosas de un plumazo:
 *
 * 1. El navegador llama a rutas **same-origin** (`/api/proxy/...`), así que no
 *    hay CORS ni hace falta publicar el backend.
 * 2. El servidor sí puede leer `API_URL`, que sigue siendo un secreto de
 *    runtime: la imagen del contenedor no lleva ninguna URL de la API.
 *
 * `lib/api/client.ts` es el único que usa estas rutas; los módulos de cliente
 * (`lib/sesion.ts`, `lib/pedidos.ts`) no cambian.
 */

/** Base de la API; se lee en cada petición para que un redeploy con otra
 * variable la respete sin recompilar nada. */
export function baseDeLaApi(): string {
  return (process.env.API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
}

/**
 * Cabeceras que no se reenvían: son de la conexión entre el navegador y
 * Next.js, no de la petición a la API. La cookie de sesión del frontend no
 * le sirve de nada a la API, que autentica con `Authorization: Bearer`.
 */
const CABECERAS_A_OMITIR = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "cookie",
  "transfer-encoding",
]);

/** Cabeceras de la respuesta que no se devuelven tal cual: describen el
 * transporte de la conexión interna, no el del cuerpo que ve el cliente. */
const CABECERAS_DE_RESPUESTA_A_OMITIR = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "keep-alive",
]);

/**
 * Construye la URL de destino en la API a partir de los segmentos de la ruta
 * y la cadena de consulta.
 */
export function urlDeLaApi(segmentos: string[], busqueda = ""): string {
  const ruta = segmentos.map((s) => encodeURIComponent(s)).join("/");
  return `${baseDeLaApi()}/${ruta}${busqueda}`;
}

/**
 * Reenvía una petición del navegador a la API y devuelve su respuesta.
 *
 * Si la API no responde, se devuelve **502** con un `detail` legible: es la
 * señal de que la tienda no está disponible, y `lib/api/client.ts` la
 * traduce al mismo estado "caída" que una conexión rechazada.
 */
export async function reenviar(peticion: Request, segmentos: string[]): Promise<Response> {
  const url = new URL(peticion.url);
  const destino = urlDeLaApi(segmentos, url.search);

  const encabezados = new Headers();
  peticion.headers.forEach((valor, clave) => {
    if (!CABECERAS_A_OMITIR.has(clave.toLowerCase())) encabezados.set(clave, valor);
  });

  const metodo = peticion.method.toUpperCase();
  const llevaCuerpo = metodo !== "GET" && metodo !== "HEAD";

  let respuesta: Response;
  try {
    respuesta = await fetch(destino, {
      method: metodo,
      headers: encabezados,
      body: llevaCuerpo ? await peticion.text() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return new Response(
      JSON.stringify({ detail: "La API no está disponible en este momento." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const cuerpo = await respuesta.arrayBuffer();
  const salientes = new Headers();
  respuesta.headers.forEach((valor, clave) => {
    if (!CABECERAS_DE_RESPUESTA_A_OMITIR.has(clave.toLowerCase())) {
      salientes.set(clave, valor);
    }
  });

  return new Response(cuerpo, { status: respuesta.status, headers: salientes });
}

import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de sesión.
 *
 * El token real vive en `localStorage` (ADR 0011), que el middleware no puede
 * leer. Por eso aquí solo se usa la cookie "pista" (`tvutb.sesion=1`) que
 * lib/sesion.ts escribe junto a la sesión: si falta, no hay sesión conocida y
 * se redirige al acceso sin esperar a que el cliente hidrate.
 *
 * Esto NO es la frontera de seguridad: la autoridad es la API, que responde
 * 401 y dispara el cierre de sesión en lib/api/client.ts.
 */
export function middleware(peticion: NextRequest) {
  const pista = peticion.cookies.get("tvutb.sesion");

  if (!pista?.value) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = "/auth/ingresar";
    destino.search = "";
    destino.searchParams.set("next", peticion.nextUrl.pathname);
    if (peticion.nextUrl.pathname !== "/cuenta") {
      destino.searchParams.set("motivo", "requiere-sesion");
    }
    return NextResponse.redirect(destino);
  }

  const respuesta = NextResponse.next();
  respuesta.headers.set("X-Robots-Tag", "noindex, nofollow");
  return respuesta;
}

export const config = {
  matcher: ["/cuenta", "/cuenta/:path*", "/admin", "/admin/:path*"],
};

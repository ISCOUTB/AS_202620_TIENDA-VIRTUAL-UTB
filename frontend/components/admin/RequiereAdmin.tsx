"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSesion } from "@/lib/sesion";

/**
 * Guard de administración.
 *
 * Dos comprobaciones: hay sesión y el rol es `admin`. Si hay sesión pero el
 * rol no alcanza se muestra un 403 honesto, no un redirect silencioso: el
 * usuario necesita saber por qué no entra.
 */
export function RequiereAdmin({ children }: { children: React.ReactNode }) {
  const { sesion, cargando } = useSesion();
  const router = useRouter();
  const ruta = usePathname();

  useEffect(() => {
    if (!cargando && !sesion) {
      router.replace(`/auth/ingresar?next=${encodeURIComponent(ruta)}`);
    }
  }, [cargando, sesion, ruta, router]);

  if (cargando) {
    return (
      <div className="contenedor py-16" aria-busy="true" aria-live="polite">
        <span className="sr-only">Comprobando permisos…</span>
        <div className="h-4 w-24 rounded-[var(--tk-radio-pill)] bg-tarjeta-alta" />
        <div className="mt-4 h-12 w-1/2 rounded-[var(--tk-radio)] bg-tarjeta-alta" />
      </div>
    );
  }

  if (!sesion) {
    return (
      <div className="contenedor py-16">
        <p className="cuerpo text-tenue">Te llevamos a la pantalla de acceso…</p>
      </div>
    );
  }

  if (sesion.usuario.rol !== "admin") {
    return (
      <div className="contenedor py-16">
        <p className="rotulo text-tenue">403</p>
        <h1 className="mt-3 font-display text-[2rem] font-extrabold text-superficie">
          Esta área es de administración.
        </h1>
        <p className="cuerpo mt-3 max-w-[52ch] text-tenue">
          Tu pase ({sesion.usuario.email}) no tiene permisos para ver el panel
          de inventario. Si crees que es un error, habla con la coordinación de
          la cafetería.
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            href="/"
            className="font-display text-[0.875rem] font-semibold text-cyan-claro underline underline-offset-4"
          >
            Volver a la tienda
          </Link>
          <Link
            href="/cuenta"
            className="font-display text-[0.875rem] font-semibold text-cyan-claro underline underline-offset-4"
          >
            Ir a mi pase
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

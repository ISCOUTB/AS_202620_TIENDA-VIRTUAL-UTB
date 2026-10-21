"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSesion } from "@/lib/sesion";

/**
 * Guard de sesión del lado del cliente.
 *
 * El middleware no puede leer `localStorage` (corre en el edge), así que la
 * protección real es esta + la cookie "hint" para el redirect sin parpadeo.
 * La autoridad final sigue siendo la API: un 401 cierra la sesión desde
 * lib/api/client.ts.
 */
export function RequiereSesion({ children }: { children: React.ReactNode }) {
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
        <span className="sr-only">Cargando tu pase…</span>
        <div className="h-4 w-24 rounded-[var(--tk-radio-pill)] bg-tarjeta-alta" />
        <div className="mt-4 h-12 w-2/3 rounded-[var(--tk-radio)] bg-tarjeta-alta" />
        <div className="mt-8 h-40 w-full rounded-[var(--tk-radio)] bg-tarjeta-alta" />
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

  return <>{children}</>;
}

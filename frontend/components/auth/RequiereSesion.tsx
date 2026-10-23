"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSesion } from "@/lib/sesion";
import { ZonaCargando } from "@/components/ui/Esqueleto";
import { EsqueletoCuenta } from "./PanelCuenta";

/**
 * Guard de sesión del lado del cliente.
 *
 * El middleware no puede leer `localStorage` (corre en el edge), así que la
 * protección real es esta + la cookie "hint" para el redirect sin parpadeo.
 * La autoridad final sigue siendo la API: un 401 cierra la sesión desde
 * lib/api/client.ts. Mientras lee la sesión muestra el esqueleto de la cuenta.
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
      <ZonaCargando etiqueta="Cargando tu pase…">
        <EsqueletoCuenta />
      </ZonaCargando>
    );
  }

  if (!sesion) {
    return (
      <div className="rounded-xl bg-tarjeta p-8 shadow-tarjeta" role="status">
        <p className="text-tenue">Te llevamos a la pantalla de acceso…</p>
      </div>
    );
  }

  return <>{children}</>;
}

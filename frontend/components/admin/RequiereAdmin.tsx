"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSesion } from "@/lib/sesion";
import { esGestor } from "@/lib/roles";
import { Boton } from "@/components/ui/Boton";
import { Esqueleto, EsqueletoTabla, ZonaCargando } from "@/components/ui/Esqueleto";

/**
 * Guard de administración.
 *
 * Dos comprobaciones: hay sesión y el rol es `admin`. Si hay sesión pero el
 * rol no alcanza se muestra un 403 honesto, no un redirect silencioso: el
 * usuario necesita saber por qué no entra. Mientras lee la sesión, el
 * esqueleto del panel con sus mismas medidas.
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
      <ZonaCargando etiqueta="Comprobando permisos…" className="contenedor pb-12">
        <EsqueletoAdmin />
      </ZonaCargando>
    );
  }

  if (!sesion) {
    return (
      <div className="contenedor pb-12">
        <div className="rounded-xl bg-tarjeta p-8 shadow-tarjeta" role="status">
          <p className="text-tenue">Te llevamos a la pantalla de acceso…</p>
        </div>
      </div>
    );
  }

  if (!esGestor(sesion.usuario)) {
    return (
      <div className="contenedor pb-12">
        <div className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-10">
          <p className="cifra font-mono text-sm font-semibold text-tenue">403</p>
          <h1 className="titulo mt-2">Esta área es de administración.</h1>
          <p className="mt-3 max-w-[52ch] leading-relaxed text-tenue">
            Tu pase ({sesion.usuario.email}) no tiene permisos para ver el panel
            de inventario. Si crees que es un error, habla con la coordinación
            de la cafetería.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Boton href="/" variante="primario">
              Volver a la tienda
            </Boton>
            <Boton href="/cuenta" variante="contorno">
              Ir a mi pase
            </Boton>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/** Esqueleto del panel: cabecera, 4 KPI, tiendas y tabla. */
export function EsqueletoAdmin() {
  return (
    <div aria-hidden="true">
      <div className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8">
        <Esqueleto className="h-4 w-36" />
        <Esqueleto className="mt-3 h-11 w-2/3" />
        <Esqueleto className="mt-4 h-5 w-full max-w-[40rem]" />
        <Esqueleto className="mt-2 h-5 w-4/5 max-w-[32rem]" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-tarjeta bg-tarjeta p-5 shadow-tarjeta">
            <Esqueleto className="h-4 w-24" />
            <Esqueleto className="mt-2 h-8 w-16" />
            <Esqueleto className="mt-2 h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-12">
        <Esqueleto className="h-8 w-48" />
        <div className="mt-5">
          <EsqueletoTabla filas={6} />
        </div>
      </div>
    </div>
  );
}

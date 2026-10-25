"use client";

import { useSesion, cerrarSesion } from "@/lib/sesion";
import { esGestor, etiquetaRol } from "@/lib/roles";
import { Badge } from "@/components/ui/Badge";
import { Boton } from "@/components/ui/Boton";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Revelar } from "@/components/motion/Revelar";
import { Carnet } from "./Carnet";

/**
 * La cuenta (SPEC v4 §3, `/cuenta`): el carnet digital de la sección «La
 * cuenta» del artefacto, con los datos reales de la sesión. Los pedidos y el
 * carrito viven en `/pedidos`: aquí solo hay un acceso.
 */
export function PanelCuenta() {
  const { sesion } = useSesion();

  if (!sesion) return null;
  const { usuario, modo } = sesion;
  const rol = etiquetaRol(usuario);

  return (
    <Revelar className="mx-auto max-w-xl">
      <section
        data-escalon=""
        aria-labelledby="saludo"
        className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8"
      >
        <h2 id="saludo" className="titulo-seccion">
          Hola, {usuario.nombre.split(" ")[0]}.
        </h2>
        <p className="mt-1.5 truncate text-sm text-tenue">{usuario.email}</p>

        {modo === "demo" ? (
          <p className="mt-5 rounded-sm bg-aviso-suave px-4 py-3 text-sm leading-snug text-aviso">
            <strong className="font-bold">Modo demostración.</strong> La
            tienda no respondió al entrar: esta sesión vive solo en tu navegador
            y no crea pedidos reales.
          </p>
        ) : null}

        <div className="mt-8 px-2 sm:px-0">
          <Carnet
            nombre={usuario.nombre}
            codigo={String(usuario.id).padStart(9, "0")}
            rol={rol}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Badge tono={modo === "demo" ? "muestra" : "abierto"}>
            {modo === "demo" ? "Demostración" : "Cuenta real"}
          </Badge>
          <Badge tono="abierto">Activo</Badge>
          <Badge tono="neutro">Rol: {rol}</Badge>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Boton href="/pedidos" variante="primario" bloque>
            Ver mis pedidos
          </Boton>
          {esGestor(usuario) ? (
            <Boton href="/admin" variante="suave" bloque>
              Ir a administración
            </Boton>
          ) : null}
          <Boton variante="contorno" bloque onClick={cerrarSesion}>
            Cerrar sesión
          </Boton>
        </div>
      </section>
    </Revelar>
  );
}

/** Esqueleto con la misma rejilla y alturas que `PanelCuenta`. */
export function EsqueletoCuenta() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-xl">
      <div className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8">
        <Esqueleto className="h-8 w-1/2" />
        <Esqueleto className="mt-2.5 h-4 w-2/3" />
        <Esqueleto className="mt-8 aspect-[1.586/1] w-full max-w-[400px] rounded-[22px]" />
        <div className="mt-8 flex gap-2">
          <Esqueleto className="h-6 w-28 rounded-pill" />
          <Esqueleto className="h-6 w-16 rounded-pill" />
        </div>
        <Esqueleto className="mt-6 h-11 w-full rounded-pill" />
        <Esqueleto className="mt-2 h-11 w-full rounded-pill" />
      </div>
    </div>
  );
}

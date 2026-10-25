"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/lib/sesion";
import { MisPedidos } from "@/components/pedidos/MisPedidos";
import { Icono } from "@/components/ui/Icono";

/** Consulta las reservas sin abandonar la carta ni confundirlas con el carrito. */
export function ReservasRapidas() {
  const [abierto, setAbierto] = useState(false);
  const { sesion, cargando } = useSesion();

  return (
    <>
      <button
        type="button"
        className="boton-vidrio"
        aria-label="Ver reservas pendientes de recoger"
        title="Por recoger"
        aria-haspopup="dialog"
        onClick={() => setAbierto(true)}
      >
        <Icono nombre="reloj" />
      </button>
      {abierto ? (
        <VistaReservas alCerrar={() => setAbierto(false)}>
          {cargando ? (
            <p role="status" className="p-6">Cargando tu cuenta…</p>
          ) : sesion ? (
            <MisPedidos key={sesion.usuario.id} demo={sesion.modo === "demo"} soloActivos />
          ) : (
            <div className="p-6">
              <p className="mb-4 text-tenue">Ingresa para consultar tus reservas y su hora de recogida.</p>
              <Link className="font-semibold text-enlace underline" href="/auth/ingresar?next=/pedidos" onClick={() => setAbierto(false)}>
                Ingresar
              </Link>
            </div>
          )}
        </VistaReservas>
      ) : null}
    </>
  );
}

function VistaReservas({ children, alCerrar }: Readonly<{
  children: React.ReactNode;
  alCerrar: () => void;
}>) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    const overflowAnterior = document.body.style.overflow;
    elemento?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      elemento?.close();
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="titulo-reservas-rapidas"
      onClose={alCerrar}
      className="fixed inset-0 m-auto max-h-[85svh] w-[calc(100%_-_1.5rem)] max-w-xl overflow-y-auto rounded-xl border border-linea bg-tarjeta p-0 text-tinta shadow-alta backdrop:bg-velo"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-linea bg-tarjeta px-6 py-4">
        <h2 id="titulo-reservas-rapidas" className="font-display text-2xl font-semibold">Por recoger</h2>
        <button type="button" onClick={alCerrar} aria-label="Cerrar reservas" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill hover:bg-suave">
          <Icono nombre="cerrar" />
        </button>
      </div>
      {children}
      <div className="border-t border-linea px-6 py-4">
        <Link href="/pedidos" onClick={alCerrar} className="font-semibold text-enlace underline underline-offset-4">Ver todos mis pedidos</Link>
      </div>
    </dialog>
  );
}

"use client";

import { forwardRef } from "react";
import { Icono } from "@/components/ui/Icono";

/**
 * Control de cantidad del artefacto: «−  n  +» en una pastilla de 44 px.
 * `suave` = campo azul suave (tarjeta de producto); `linea` = solo borde
 * (filas del panel del pedido). Cada botón mide 44×44 (objetivo táctil).
 */
export const Cantidad = forwardRef<
  HTMLDivElement,
  {
    cantidad: number;
    nombre: string;
    alRestar: () => void;
    alSumar: () => void;
    /** Tope de unidades (existencias). */
    maximo: number;
    variante?: "suave" | "linea";
  }
>(function Cantidad({ cantidad, nombre, alRestar, alSumar, maximo, variante = "suave" }, ref) {
  const lleno = cantidad >= maximo;
  return (
    <div
      ref={ref}
      role="group"
      aria-label={`Cantidad de ${nombre}`}
      className={[
        "flex h-11 shrink-0 items-center rounded-pill",
        variante === "suave" ? "bg-primario-suave text-enlace" : "border border-linea text-tinta",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={alRestar}
        aria-label={cantidad === 1 ? `Quitar ${nombre} del pedido` : `Quitar una unidad de ${nombre}`}
        className="flex h-11 w-11 items-center justify-center rounded-pill"
      >
        <Icono nombre="menos" tamano={18} grosor={2.4} />
      </button>
      <span className="cifra min-w-5 text-center font-bold" aria-live="polite">
        {cantidad}
      </span>
      <button
        type="button"
        onClick={alSumar}
        disabled={lleno}
        aria-label={lleno ? `No quedan más unidades de ${nombre}` : `Agregar otra unidad de ${nombre}`}
        className="flex h-11 w-11 items-center justify-center rounded-pill disabled:opacity-35"
      >
        <Icono nombre="mas" tamano={18} grosor={2.4} />
      </button>
    </div>
  );
});

"use client";

import { useEffect, useRef } from "react";
import { alternarTema, seguirSistema, useTema } from "@/lib/tema";
import { Icono } from "@/components/ui/Icono";

/**
 * Botón de tema (SPEC v4 §2.9). Del centro de este botón nace el círculo que
 * revela el tema nuevo (lib/tema.ts).
 *
 * El ícono lo decide CSS con `data-theme` (`.solo-claro` / `.solo-oscuro`),
 * no el estado de React: así nunca se ve el ícono equivocado mientras hidrata.
 * El nombre accesible sí depende del estado y se completa al montar.
 */
export function BotonTema({
  sobreSabana = true,
  className = "",
}: {
  /** true = botón translúcido sobre la sábana azul; false = sobre superficie. */
  sobreSabana?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const tema = useTema();

  useEffect(() => seguirSistema(), []);

  const etiqueta =
    tema === "dark"
      ? "Cambiar a modo claro"
      : tema === "light"
        ? "Cambiar a modo oscuro"
        : "Cambiar el tema de color";

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => alternarTema(ref.current)}
      aria-label={etiqueta}
      className={[
        sobreSabana
          ? "boton-vidrio"
          : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-linea bg-tarjeta text-tinta transition-colors duration-[var(--tk-dur)] hover:bg-suave",
        className,
      ].join(" ")}
    >
      {/* En oscuro se ofrece el sol (pasar a claro); en claro, la luna. */}
      <Icono nombre="sol" className="solo-oscuro" />
      <Icono nombre="luna" className="solo-claro" />
    </button>
  );
}

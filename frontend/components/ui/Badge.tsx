import type { ReactNode } from "react";

export type TonoBadge = "abierto" | "cerrado" | "agotado" | "muestra" | "nuevo";

const TONOS: Record<TonoBadge, string> = {
  abierto: "bg-ok/15 text-ok",
  cerrado: "bg-superficie/10 text-tenue",
  agotado: "bg-error/15 text-error",
  muestra: "bg-amarillo/15 text-amarillo",
  nuevo: "bg-ambar/15 text-ambar",
};

/**
 * Estado de una fila o producto. Una sola marca por fila.
 * Nunca se comunica solo con color: siempre lleva texto.
 */
export function Badge({
  children,
  tono = "abierto",
  className = "",
}: {
  children: ReactNode;
  tono?: TonoBadge;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-[var(--tk-radio-pill)] px-2.5 py-1 font-display text-[0.6875rem] font-semibold uppercase tracking-[0.08em] leading-none",
        TONOS[tono],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

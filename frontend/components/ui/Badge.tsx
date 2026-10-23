import type { ReactNode } from "react";

export type TonoBadge = "abierto" | "cerrado" | "agotado" | "muestra" | "nuevo" | "neutro";

const TONOS: Record<TonoBadge, string> = {
  abierto: "bg-ok-suave text-ok",
  cerrado: "bg-suave text-tenue",
  agotado: "bg-error-suave text-error",
  muestra: "bg-aviso-suave text-aviso",
  nuevo: "bg-primario-suave text-enlace",
  neutro: "bg-suave text-tinta",
};

/**
 * Estado de una fila o producto: pill de 24 px. Nunca se comunica solo con
 * color: siempre lleva texto.
 */
export function Badge({
  children,
  tono = "neutro",
  className = "",
}: {
  children: ReactNode;
  tono?: TonoBadge;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-xs font-bold",
        TONOS[tono],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

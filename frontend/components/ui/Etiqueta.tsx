import type { ReactNode } from "react";

/** Rótulo: DM Sans 600, 13 px, caja alta, tracking 0.06 em. */
export function Etiqueta({
  children,
  className = "",
  tono = "tenue",
}: {
  children: ReactNode;
  className?: string;
  /** `claro` = sobre la sábana azul; `acento` = cian sobre la banda oscura. */
  tono?: "tenue" | "claro" | "acento";
}) {
  const color =
    tono === "claro"
      ? "text-sobre-sabana opacity-90"
      : tono === "acento"
        ? "text-banda-acento"
        : "text-tenue";

  return <span className={`rotulo ${color} ${className}`}>{children}</span>;
}

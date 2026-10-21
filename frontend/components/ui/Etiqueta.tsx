import type { ReactNode } from "react";

/** Rótulo: Archivo 600, tracking amplio, caja alta. */
export function Etiqueta({
  children,
  className = "",
  tono = "tenue",
}: {
  children: ReactNode;
  className?: string;
  tono?: "tenue" | "claro" | "acento";
}) {
  const color =
    tono === "claro"
      ? "text-cyan-claro"
      : tono === "acento"
        ? "text-ambar"
        : "text-tenue";

  return (
    <span className={`rotulo ${color} ${className}`}>{children}</span>
  );
}

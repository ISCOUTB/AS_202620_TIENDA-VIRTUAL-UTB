import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Botón único del sitio: pill con la geometría redondeada de la app
 * (design/SPEC.md v3 §2.3).
 *
 * El sólido es la acción primaria y lleva el degradado de marca; el ámbar
 * queda para el CTA de conversión; el contorno para acciones secundarias.
 */

export type VarianteBoton = "solido" | "ambar" | "claro" | "contorno" | "texto";

const VARIANTES: Record<VarianteBoton, string> = {
  solido: "gradiente-marca text-superficie hover:brightness-110",
  ambar: "bg-ambar text-tinta hover:bg-amarillo",
  claro: "bg-superficie text-tinta hover:bg-cyan-palido",
  contorno: "border border-borde bg-transparent text-superficie hover:bg-tarjeta-alta",
  texto: "bg-transparent underline underline-offset-4",
};

const TAMANOS = {
  md: "px-5 py-2.5 text-[0.9375rem]",
  lg: "px-7 py-3.5 text-[1.0625rem]",
} as const;

type Props = {
  children: ReactNode;
  variante?: VarianteBoton;
  tamano?: keyof typeof TAMANOS;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  /** Ancho completo en móvil. */
  bloque?: boolean;
  "aria-label"?: string;
};

export function Boton({
  children,
  variante = "solido",
  tamano = "md",
  href,
  type = "button",
  onClick,
  disabled,
  className = "",
  bloque = false,
  ...resto
}: Props) {
  const clases = [
    "inline-flex items-center justify-center gap-2 font-display font-semibold",
    "rounded-[var(--tk-radio-pill)]",
    "transition-[filter,background-color,color] duration-[var(--tk-dur)] ease-[var(--tk-ease)]",
    VARIANTES[variante],
    variante === "texto" ? "" : TAMANOS[tamano],
    bloque ? "w-full" : "",
    disabled ? "pointer-events-none opacity-40" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={clases} {...resto}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clases}
      {...resto}
    >
      {children}
    </button>
  );
}

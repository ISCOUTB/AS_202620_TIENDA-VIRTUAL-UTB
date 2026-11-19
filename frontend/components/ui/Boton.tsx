import Link from "next/link";
import type { ReactNode, Ref } from "react";

/**
 * Botón único del sitio (SPEC v5 §4): rectángulo de 44 px (52 px el grande)
 * con texto en mayúsculas espaciadas, como los botones de un catálogo.
 *
 * - `primario`  azul de marca, texto blanco — la acción principal.
 * - `claro`     blanco con texto azul — acción sobre la sábana («Ingresar»).
 * - `oscuro`    tinta con texto blanco — segunda acción sobre la sábana.
 * - `suave`     campo azul suave con texto de enlace — acción secundaria.
 * - `contorno`  borde de control — terciaria.
 * - `texto`     subrayado, sin caja.
 */

export type VarianteBoton = "primario" | "claro" | "oscuro" | "suave" | "contorno" | "texto";

const VARIANTES: Record<VarianteBoton, string> = {
  primario: "bg-primario text-sobre-primario hover:bg-primario-hover",
  claro: "bg-blanco text-carnet-azul hover:bg-carnet-azul-suave",
  oscuro: "bg-oscuro text-blanco hover:opacity-90",
  suave: "bg-primario-suave text-enlace hover:opacity-85",
  contorno: "border border-borde bg-transparent text-tinta hover:bg-suave",
  texto: "bg-transparent text-enlace underline underline-offset-4",
};

const TAMANOS = {
  md: "min-h-11 px-6",
  lg: "min-h-[3.25rem] px-8 text-[0.8125rem]",
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
  /** Ancho completo. */
  bloque?: boolean;
  /** Radio de bloque (18 px) en vez de pill: botones de confirmar. */
  cuadrado?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  ref?: Ref<HTMLButtonElement>;
};

export function Boton({
  children,
  variante = "primario",
  tamano = "md",
  href,
  type = "button",
  onClick,
  disabled,
  className = "",
  bloque = false,
  cuadrado = false,
  ref,
  ...resto
}: Props) {
  const clases = [
    "inline-flex items-center justify-center gap-2 leading-tight text-center",
    // El botón de texto es un enlace dentro de una frase: no se grita.
    variante === "texto"
      ? "font-bold"
      : "tipo-accion",
    cuadrado ? "rounded-md" : "rounded-pill",
    "transition-[background-color,color,opacity,transform] duration-[var(--tk-dur)] ease-[var(--tk-ease)] active:scale-[0.98]",
    VARIANTES[variante],
    variante === "texto" ? "min-h-11 px-1" : TAMANOS[tamano],
    bloque ? "w-full" : "",
    disabled ? "pointer-events-none opacity-45" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={clases} onClick={onClick} {...resto}>
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
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

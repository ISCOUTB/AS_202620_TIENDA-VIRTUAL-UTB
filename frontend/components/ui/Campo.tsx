"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Campo de formulario: rótulo arriba y control de 52 px, radio 14, fondo de
 * tarjeta. El borde usa --tk-borde (3:1 como componente no textual). El error
 * va en texto con `role="alert"`, nunca solo en color.
 */

type Props = {
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  type?: "text" | "email" | "password" | "tel";
  autoComplete?: string;
  error?: string;
  ayuda?: ReactNode;
  requerido?: boolean;
  autoFocus?: boolean;
  name?: string;
  inputMode?: "text" | "email" | "numeric";
};

export function Campo({
  etiqueta,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
  ayuda,
  requerido = false,
  autoFocus = false,
  name,
  inputMode,
}: Props) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const [visible, setVisible] = useState(false);
  const esPassword = type === "password";
  const tipoReal = esPassword && visible ? "text" : type;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        {etiqueta}
        {requerido ? (
          <span aria-hidden="true" className="text-tenue">
            {" "}
            *
          </span>
        ) : null}
      </label>

      <div className="relative flex items-center">
        <input
          id={id}
          name={name ?? id}
          type={tipoReal}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          inputMode={inputMode}
          required={requerido}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : ayuda ? idAyuda : undefined}
          className={[
            "h-[52px] w-full rounded-sm border bg-tarjeta px-4 text-base text-tinta",
            "transition-colors duration-[var(--tk-dur)]",
            "focus-visible:border-primario focus-visible:outline-2 focus-visible:outline-offset-0",
            error ? "border-error" : "border-borde",
            esPassword ? "pr-24" : "",
          ].join(" ")}
        />

        {esPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1 inline-flex h-11 min-w-11 items-center justify-center rounded-sm px-3 text-sm font-bold text-enlace"
            aria-pressed={visible}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {visible ? "Ocultar" : "Ver"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={idError} role="alert" className="text-sm leading-snug text-error">
          {error}
        </p>
      ) : ayuda ? (
        <p id={idAyuda} className="text-sm leading-snug text-tenue">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

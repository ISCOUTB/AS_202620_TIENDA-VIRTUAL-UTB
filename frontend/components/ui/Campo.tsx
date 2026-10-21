"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Campo de formulario: rótulo arriba y control pill con fondo elevado.
 * El borde usa --tk-borde (3.4:1 sobre tarjeta → pasa 3:1 como componente no
 * textual). El error va en texto, nunca solo en color.
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
  const [visible, setVisible] = useState(false);
  const esPassword = type === "password";
  const tipoReal = esPassword && visible ? "text" : type;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="rotulo text-tenue">
        {etiqueta}
        {requerido ? <span aria-hidden="true"> *</span> : null}
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
          aria-describedby={error ? idError : undefined}
          className={[
            "w-full rounded-[var(--tk-radio-sm)] bg-tarjeta-alta px-4 py-3 font-cuerpo text-[1.0625rem] text-superficie",
            "border outline-none",
            "transition-colors duration-[var(--tk-dur)]",
            error
              ? "border-error"
              : "border-linea focus:border-cyan-claro",
            esPassword ? "pr-20" : "",
          ].join(" ")}
        />

        {esPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 font-display text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-cyan-claro underline underline-offset-4"
            aria-pressed={visible}
          >
            {visible ? "Ocultar" : "Ver"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={idError} role="alert" className="font-cuerpo text-[0.875rem] leading-snug text-error">
          {error}
        </p>
      ) : ayuda ? (
        <p className="font-cuerpo text-[0.875rem] leading-snug text-tenue">{ayuda}</p>
      ) : null}
    </div>
  );
}

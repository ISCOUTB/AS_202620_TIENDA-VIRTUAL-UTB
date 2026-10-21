"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Campo } from "@/components/ui/Campo";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { iniciarSesion, CLAVE_DEMO } from "@/lib/sesion";

/** Aviso de error: color + texto + rol, nunca solo color. */
export function Aviso({
  children,
  tono = "error",
}: {
  children: React.ReactNode;
  tono?: "error" | "info";
}) {
  const clases =
    tono === "error"
      ? "border-error bg-error/10 text-error"
      : "border-cyan bg-cyan/10 text-cyan-claro";
  return (
    <p role="alert" className={`rounded-[var(--tk-radio-sm)] border-l-4 px-4 py-3 font-cuerpo text-[0.9375rem] leading-snug ${clases}`}>
      {children}
    </p>
  );
}

export function FormIngreso() {
  const router = useRouter();
  const params = useSearchParams();
  const siguiente = params.get("next") ?? "/cuenta";
  const motivo = params.get("motivo");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    motivo === "expirada" ? "Tu sesión expiró. Vuelve a entrar." : null,
  );
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Escribe un correo válido, por ejemplo nombre@utb.edu.co.");
      return;
    }
    if (password.length === 0) {
      setError("Escribe tu contraseña.");
      return;
    }

    setEnviando(true);
    try {
      await iniciarSesion(email, password);
      router.replace(siguiente);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar.");
      setEnviando(false);
    }
  }

  return (
    <div className="tarjeta p-7 sm:p-9">
      <Etiqueta>Acceso</Etiqueta>
      <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-[1.02] tracking-[-0.02em] text-superficie">
        Ingresa a tu pase
      </h1>
      <p className="mt-3 font-cuerpo text-[0.9375rem] leading-relaxed text-tenue">
        Usa tu correo institucional. Si todavía no tienes cuenta, créala en un
        minuto.
      </p>

      <form onSubmit={enviar} className="mt-7 flex flex-col gap-6" noValidate>
        <Campo
          etiqueta="Correo institucional"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          inputMode="email"
          requerido
          autoFocus
          name="email"
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          requerido
          name="password"
        />

        {error ? <Aviso>{error}</Aviso> : null}

        <Boton type="submit" variante="solido" tamano="lg" bloque disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Boton>
      </form>

      <p className="mt-6 font-cuerpo text-[0.9375rem] text-tenue">
        ¿Sin cuenta?{" "}
        <Link
          href="/auth/crear-cuenta"
          className="font-semibold text-cyan-claro underline underline-offset-4"
        >
          Crear mi pase
        </Link>
      </p>

      <details className="mt-7 border-t border-linea pt-4">
        <summary className="cursor-pointer font-display text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-tenue">
          Modo demostración
        </summary>
        <div className="mt-3 font-cuerpo text-[0.875rem] leading-relaxed text-tenue">
          <p>
            El módulo de identidad todavía no está en producción. Para recorrer
            la tienda usa:
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            <li>
              <span className="cifra text-superficie">demo@utb.edu.co</span> · cliente
            </li>
            <li>
              <span className="cifra text-superficie">admin@utb.edu.co</span> · administración
            </li>
            <li>
              Contraseña: <span className="cifra text-superficie">{CLAVE_DEMO}</span>
            </li>
          </ul>
          <p className="mt-2">
            Cuando la API responda en <span className="cifra">/identity/login</span>,
            estas credenciales dejan de usarse solas.
          </p>
        </div>
      </details>
    </div>
  );
}

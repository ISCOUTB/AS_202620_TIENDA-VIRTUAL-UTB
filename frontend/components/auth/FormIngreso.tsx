"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Campo } from "@/components/ui/Campo";
import { Boton } from "@/components/ui/Boton";
import { Icono } from "@/components/ui/Icono";
import { Revelar } from "@/components/motion/Revelar";
import { iniciarSesion, destinoSeguro, CLAVE_DEMO } from "@/lib/sesion";

/** Aviso: color + ícono + texto + rol, nunca solo color. */
export function Aviso({
  children,
  tono = "error",
}: {
  children: React.ReactNode;
  tono?: "error" | "info";
}) {
  const clases = tono === "error" ? "bg-error-suave text-error" : "bg-primario-suave text-enlace";
  return (
    <p role="alert" className={`flex items-start gap-2.5 rounded-sm px-4 py-3 text-[0.9375rem] leading-snug ${clases}`}>
      <Icono nombre="info" tamano={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function FormIngreso() {
  const params = useSearchParams();
  const siguiente = destinoSeguro(params.get("next"));
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
      // Navegación completa, no `router.replace`: el layout de servidor y el
      // middleware (cookie pista) se vuelven a pintar ya con la sesión, y no
      // se depende de la navegación RSC, que en las pruebas E2E remotas se
      // quedaba colgada en «Entrando…».
      window.location.assign(siguiente);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar.");
      setEnviando(false);
    }
  }

  return (
    <Revelar inmediato className="rounded-xl bg-tarjeta p-6 shadow-tarjeta sm:p-8">
      <p className="rotulo text-tenue">Acceso</p>
      <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight">Ingresa a tu pase</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-tenue">
        Usa tu correo institucional. Si todavía no tienes cuenta, créala en un
        minuto.
      </p>

      {motivo === "requiere-sesion" && !error ? (
        <div className="mt-5">
          <Aviso tono="info">Esa página necesita tu pase. Entra y te llevamos allá.</Aviso>
        </div>
      ) : null}

      <form onSubmit={enviar} className="mt-7 flex flex-col gap-5" noValidate>
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

        <Boton type="submit" variante="primario" tamano="lg" bloque disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Boton>
      </form>

      <p className="mt-6 text-[0.9375rem] text-tenue">
        ¿Sin cuenta?{" "}
        <Link href="/auth/crear-cuenta" className="font-bold text-enlace underline underline-offset-4">
          Crear mi pase
        </Link>
      </p>

      <details className="group mt-6 border-t border-linea pt-2">
        <summary className="flex min-h-11 list-none items-center justify-between text-sm font-semibold text-tenue [&::-webkit-details-marker]:hidden">
          Modo demostración
          <Icono nombre="mas" tamano={16} className="transition-transform duration-[var(--tk-dur-media)] group-open:rotate-45" />
        </summary>
        <div className="pb-1 text-sm leading-relaxed text-tenue">
          <p>
            Solo se activa si la tienda no responde (API caída o sin
            desplegar). En ese caso, para recorrer la tienda usa:
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            <li>
              <span className="font-mono text-tinta">demo@utb.edu.co</span> · cliente
            </li>
            <li>
              <span className="font-mono text-tinta">admin@utb.edu.co</span> · administración
            </li>
            <li>
              Contraseña: <span className="font-mono text-tinta">{CLAVE_DEMO}</span>
            </li>
          </ul>
          <p className="mt-2">
            Cuando la API responda en <span className="font-mono">/identity/login</span>,
            estas credenciales dejan de usarse solas.
          </p>
        </div>
      </details>
    </Revelar>
  );
}

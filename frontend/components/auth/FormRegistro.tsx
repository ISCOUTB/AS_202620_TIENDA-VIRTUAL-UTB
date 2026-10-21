"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Campo } from "@/components/ui/Campo";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { crearCuenta } from "@/lib/sesion";
import { Aviso } from "./FormIngreso";

const BENEFICIOS = [
  "Apartas y eliges la hora de recogida.",
  "Ves existencias reales antes de salir del salón.",
  "Un solo pase para las cinco tiendas.",
];

export function FormRegistro() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (nombre.trim().length < 2) {
      setError("Escribe tu nombre completo.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Escribe un correo válido, por ejemplo nombre@utb.edu.co.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña necesita al menos 8 caracteres.");
      return;
    }
    if (!acepta) {
      setError("Necesitamos que aceptes los términos para crear tu cuenta.");
      return;
    }

    setEnviando(true);
    try {
      await crearCuenta(nombre, email, password);
      router.replace("/cuenta");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
      setEnviando(false);
    }
  }

  return (
    <div className="tarjeta p-7 sm:p-9">
      <Etiqueta>Nuevo pase</Etiqueta>
      <h1 className="mt-3 font-display text-[2rem] font-extrabold leading-[1.02] tracking-[-0.02em] text-superficie">
        Crea tu pase
      </h1>
      <p className="mt-3 font-cuerpo text-[0.9375rem] leading-relaxed text-tenue">
        Con tu correo institucional. Toma menos que pedir un café.
      </p>

      <ul className="mt-5 flex flex-col gap-1.5">
        {BENEFICIOS.map((b) => (
          <li key={b} className="flex items-start gap-2 font-cuerpo text-[0.875rem] text-superficie">
            <span aria-hidden="true" className="mt-[0.5rem] h-[5px] w-[5px] shrink-0 rounded-[var(--tk-radio-pill)] bg-ambar" />
            {b}
          </li>
        ))}
      </ul>

      <form onSubmit={enviar} className="mt-7 flex flex-col gap-6" noValidate>
        <Campo
          etiqueta="Nombre completo"
          value={nombre}
          onChange={setNombre}
          autoComplete="name"
          requerido
          autoFocus
          name="nombre"
        />
        <Campo
          etiqueta="Correo institucional"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          inputMode="email"
          requerido
          name="email"
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          requerido
          ayuda="Mínimo 8 caracteres."
          name="password"
        />

        <div className="flex items-start gap-3">
          <input
            id="acepta"
            name="acepta"
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--tk-cyan)]"
          />
          <label htmlFor="acepta" className="font-cuerpo text-[0.875rem] leading-snug text-tenue">
            Acepto los{" "}
            <Link href="/terminos" className="text-cyan-claro underline underline-offset-4">
              términos de uso
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="text-cyan-claro underline underline-offset-4">
              política de privacidad
            </Link>
            .
          </label>
        </div>

        {error ? <Aviso>{error}</Aviso> : null}

        <Boton type="submit" variante="solido" tamano="lg" bloque disabled={enviando}>
          {enviando ? "Creando…" : "Crear mi pase"}
        </Boton>
      </form>

      <p className="mt-6 font-cuerpo text-[0.9375rem] text-tenue">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/auth/ingresar"
          className="font-semibold text-cyan-claro underline underline-offset-4"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}

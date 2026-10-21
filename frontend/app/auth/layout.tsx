import Link from "next/link";
import Image from "next/image";
import { TIENDAS, clasesAcento } from "@/lib/tiendas";
import { formatoHora } from "@/lib/formato";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { LOGO } from "@/lib/imagenes";

/**
 * Shell del pase (design/SPEC.md v3 §2.6).
 *
 * Panel izquierdo con la sábana azul de la app y el logo institucional en su
 * versión monocroma blanca; a la derecha, el formulario sobre la superficie
 * oscura. En móvil la sábana se reduce a la cabecera y el pase ocupa el resto.
 */
export default function LayoutAuth({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-tinta lg:grid lg:grid-cols-[55fr_45fr]">
      {/* Panel de marca */}
      <aside className="sabana lg:rounded-none">
        <div className="relative flex min-h-[15rem] flex-col justify-between px-[var(--tk-margen)] pb-10 pt-8 lg:min-h-svh lg:pb-12 lg:pt-10">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src={LOGO.src}
                alt={LOGO.alt}
                width={LOGO.ancho}
                height={LOGO.alto}
                priority
                className="h-8 w-auto [filter:brightness(0)_invert(1)]"
              />
            </Link>
            <Link
              href="/"
              className="rotulo text-cyan-claro underline underline-offset-4"
            >
              Volver
            </Link>
          </div>

          <div className="mt-10 lg:mt-0 lg:max-w-[30ch]">
            <Etiqueta tono="claro">Cafetería del campus</Etiqueta>
            <h2 className="mt-4 text-[clamp(2rem,1.2rem+3.2vw,3.5rem)] text-superficie">
              Tu pase de cafetería.
            </h2>
            <p className="lead mt-5 max-w-[38ch] text-cyan-claro">
              Un solo acceso para las cinco tiendas. Con él apartas, eliges la
              hora y recoges sin fila.
            </p>
          </div>

          {/* Índice del corredor */}
          <div className="mt-10 lg:mt-0">
            <div className="flex items-baseline justify-between gap-4 border-b border-white/25 pb-2">
              <Etiqueta tono="claro">El corredor</Etiqueta>
              <span className="rotulo cifra text-cyan-claro">
                {String(TIENDAS.length).padStart(2, "0")}
              </span>
            </div>
            <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {TIENDAS.map((t, i) => {
                const acento = clasesAcento(t.acento);
                return (
                  <li key={t.slug} className="flex items-center gap-3 py-1.5">
                    <span className="rotulo cifra w-5 text-cyan-claro">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`h-4 w-[5px] rounded-[var(--tk-radio-pill)] ${acento.punto}`}
                    />
                    <span className="font-display text-[0.9375rem] font-semibold text-superficie">
                      {t.nombre}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 font-cuerpo text-[0.8125rem] text-cyan-claro">
              {formatoHora(TIENDAS[0].horario.abre)} –{" "}
              {formatoHora(TIENDAS[0].horario.cierra)} · lunes a viernes
            </p>
          </div>
        </div>
      </aside>

      {/* El pase */}
      <section className="flex items-start justify-center bg-tinta px-[var(--tk-margen)] py-10 lg:min-h-svh lg:items-center lg:py-16">
        <div className="w-full max-w-[27rem]">{children}</div>
      </section>
    </div>
  );
}

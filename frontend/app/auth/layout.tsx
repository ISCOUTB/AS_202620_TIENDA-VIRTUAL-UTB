import Link from "next/link";
import Image from "next/image";
import { TIENDAS, paletaTienda } from "@/lib/tiendas";
import { formatoHora } from "@/lib/formato";
import { LOGO } from "@/lib/imagenes";
import { BotonTema } from "@/components/chrome/BotonTema";
import { Revelar } from "@/components/motion/Revelar";
import { IconoTienda, Icono } from "@/components/ui/Icono";

/**
 * Shell del pase (SPEC v4 §3, `/auth/*`). A la izquierda (arriba en móvil),
 * la sábana azul con el logo blanco, el titular en Fraunces y las cinco
 * tiendas con sus fichas; a la derecha, el formulario en una tarjeta sobre
 * el ground.
 */
export default function LayoutAuth({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh bg-fondo lg:grid lg:grid-cols-[55fr_45fr]">
      <aside className="sabana rounded-b-lg lg:rounded-none">
        <div className="flex flex-col gap-10 px-[var(--tk-margen)] pb-12 pt-4 sm:px-8 lg:sticky lg:top-0 lg:min-h-svh lg:justify-between lg:px-12 lg:pb-12 lg:pt-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex min-h-11 items-center" aria-label="Tienda Virtual UTB, inicio">
              <Image
                src={LOGO.src}
                alt=""
                width={LOGO.ancho}
                height={LOGO.alto}
                priority
                className="h-[30px] w-auto [filter:brightness(0)_invert(1)] sm:h-[34px]"
              />
            </Link>
            <span className="flex-1" />
            <BotonTema />
            <Link href="/" className="boton-vidrio" aria-label="Volver a la tienda">
              <Icono nombre="atras" grosor={2.2} />
            </Link>
          </div>

          <Revelar inmediato className="lg:max-w-[30ch]">
            <p data-escalon="" className="rotulo opacity-90">
              Cafetería La Placita · Campus UTB
            </p>
            <p data-escalon="" className="titulo mt-3">
              Tu pase de cafetería.
            </p>
            <p data-escalon="" className="lead mt-4 max-w-[38ch] opacity-95">
              Un solo acceso para las cinco tiendas. Con él apartas, eliges la
              hora y recoges sin fila.
            </p>
          </Revelar>

          <div className="hidden sm:block">
            <ul className="grid gap-2 sm:grid-cols-2">
              {TIENDAS.map((t) => {
                const p = paletaTienda(t.slug);
                return (
                  <li key={t.slug} className="flex items-center gap-3 rounded-md bg-sabana-vidrio px-3 py-2.5">
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xs ${p.relleno} ${p.sobreRelleno}`}
                    >
                      <IconoTienda slug={t.slug} tamano={20} />
                    </span>
                    <span className="text-[0.9375rem] font-semibold">{t.nombre}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[0.8125rem] opacity-90">
              Lun a vie · {formatoHora(TIENDAS[0].horario.abre)} – {formatoHora(TIENDAS[0].horario.cierra)}
            </p>
          </div>
        </div>
      </aside>

      <main
        id="contenido"
        className="flex items-start justify-center px-[var(--tk-margen)] py-8 lg:min-h-svh lg:items-center lg:py-16"
      >
        <div className="w-full max-w-[27rem]">{children}</div>
      </main>
    </div>
  );
}

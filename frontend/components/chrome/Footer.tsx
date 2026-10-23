import Link from "next/link";
import Image from "next/image";
import { TIENDAS, paletaTienda } from "@/lib/tiendas";
import { estadoHorario } from "@/lib/formato";
import { LOGO } from "@/lib/imagenes";

const EQUIPO = [
  { nombre: "Levis Adrian Ortiz Cano", codigo: "T00083674" },
  { nombre: "Alejandro Patron Montero", codigo: "T00078181" },
  { nombre: "Shalom Jhoanna Arrieta Marrugo", codigo: "T00082962" },
  { nombre: "Jasen Mihovil Yukopila Escobar", codigo: "T00083873" },
];

const PROYECTO = [
  { href: "/terminos", nombre: "Términos" },
  { href: "/privacidad", nombre: "Privacidad" },
  { href: "/cuenta", nombre: "Mi pase" },
];

/**
 * Pie (artefacto «A · Inicio escritorio»): superficie de tarjeta con filo
 * superior, logo en su color (blanco en oscuro, por filtro), tiendas, enlaces
 * del proyecto, equipo y créditos.
 *
 * Móvil: ritmo apretado. Logo y estado en una fila, las dos listas lado a
 * lado (enlaces de 36 px) y una franja final de letra chica con el equipo
 * en renglones corridos, los créditos y el año. Desde `md`, la rejilla de
 * 12 columnas del artefacto.
 */
export function Footer({ className = "" }: { className?: string }) {
  const estado = estadoHorario(TIENDAS[0].horario);
  const enlace =
    "inline-flex min-h-9 items-center text-[0.9375rem] text-tinta underline-offset-4 hover:underline md:min-h-11";

  return (
    <footer className={`border-t border-linea bg-tarjeta text-tenue ${className}`}>
      <div className="contenedor grid grid-cols-2 gap-x-4 gap-y-5 py-6 md:grid-cols-12 md:gap-10 md:py-10 lg:py-12">
        <div className="col-span-2 md:col-span-5">
          <div className="flex items-center justify-between gap-4 md:block">
            <Image
              src={LOGO.src}
              alt={LOGO.alt}
              width={LOGO.ancho}
              height={LOGO.alto}
              className="h-6 w-auto [filter:var(--tk-logo-filtro)] md:h-7"
            />
            {/* En móvil, el estado sube a la fila del logo; desde `md`, bajo el texto. */}
            <p className="flex items-center gap-2 text-[0.8125rem] md:hidden">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-pill ${estado.abierta ? "bg-ok-punto" : "border border-tenue"}`}
              />
              {estado.texto}
            </p>
          </div>
          <p className="mt-3 max-w-[42ch] text-sm leading-relaxed md:mt-4 md:max-w-[38ch] md:text-[0.9375rem]">
            Tienda Virtual UTB · Proyecto académico. El canal de la cafetería
            del campus para consultar, apartar y recoger entre clases.
          </p>
          <p className="mt-4 hidden items-center gap-2 text-sm md:flex">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-pill ${estado.abierta ? "bg-ok-punto" : "border border-tenue"}`}
            />
            {estado.texto}
          </p>
        </div>

        <nav aria-label="Tiendas" className="min-w-0 md:col-span-4">
          <p className="rotulo text-tenue">Las tiendas</p>
          <ul className="mt-1.5 md:mt-3">
            {TIENDAS.map((t) => (
              <li key={t.slug}>
                <Link href={`/tiendas/${t.slug}`} className={`${enlace} gap-2`}>
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-pill ${paletaTienda(t.slug).relleno}`} />
                  {t.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="El proyecto" className="min-w-0 md:col-span-3">
          <p className="rotulo text-tenue">El proyecto</p>
          <ul className="mt-1.5 md:mt-3">
            {PROYECTO.map((e) => (
              <li key={e.href}>
                <Link href={e.href} className={enlace}>
                  {e.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-linea">
        <div className="contenedor grid gap-3 py-4 text-xs leading-relaxed md:grid-cols-12 md:gap-6 md:py-6 md:text-[0.8125rem]">
          <div className="md:col-span-7">
            <p className="rotulo text-tenue">Equipo</p>
            {/* Renglones corridos: cada integrante no pide su propia fila. */}
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 md:mt-2 md:gap-x-5">
              {EQUIPO.map((p) => (
                <li key={p.codigo}>
                  {p.nombre} <span className="cifra whitespace-nowrap font-mono opacity-80">· {p.codigo}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-5">
            <p>
              Fotografía: equipo de la cafetería UTB. Los precios marcados como
              referencia no son definitivos.
            </p>
            <p className="mt-1">
              © {new Date().getFullYear()} Universidad Tecnológica de Bolívar,
              Cartagena de Indias
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

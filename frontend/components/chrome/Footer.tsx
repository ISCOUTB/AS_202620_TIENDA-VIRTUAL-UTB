import Link from "next/link";
import Image from "next/image";
import { TIENDAS } from "@/lib/tiendas";
import { estadoHorario } from "@/lib/formato";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { LOGO } from "@/lib/imagenes";

const EQUIPO = [
  { nombre: "Levis Adrian Ortiz Cano", codigo: "T00083674" },
  { nombre: "Alejandro Patron Montero", codigo: "T00078181" },
  { nombre: "Shalom Jhoanna Arrieta Marrugo", codigo: "T00082962" },
  { nombre: "Jasen Mihovil Yukopila Escobar", codigo: "T00083873" },
];

export function Footer() {
  const estado = estadoHorario(TIENDAS[0].horario);

  return (
    <footer className="border-t border-white/10 bg-navy pb-24 pt-14 lg:pb-14">
      <div className="contenedor">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Image
              src={LOGO.src}
              alt={LOGO.alt}
              width={LOGO.ancho}
              height={LOGO.alto}
              className="h-9 w-auto [filter:brightness(0)_invert(1)]"
            />
            <p className="mt-5 max-w-[38ch] font-cuerpo text-[0.9375rem] leading-relaxed text-cyan-claro">
              El canal de la cafetería del campus para consultar, reservar y
              recoger entre clases. Cinco puntos, un solo pase.
            </p>
            <p className="mt-6 font-cuerpo text-[0.875rem] leading-relaxed text-tenue">
              {estado.texto}
            </p>
          </div>

          <nav aria-label="Tiendas" className="lg:col-span-4">
            <Etiqueta tono="claro">Las tiendas</Etiqueta>
            <ul className="mt-4 flex flex-col gap-2">
              {TIENDAS.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/tiendas/${t.slug}`}
                    className="font-cuerpo text-[0.9375rem] text-superficie underline-offset-4 hover:underline"
                  >
                    {t.nombre}
                    <span className="text-tenue"> · {t.categoria}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <Etiqueta tono="claro">El proyecto</Etiqueta>
            <ul className="mt-4 flex flex-col gap-2">
              <li>
                <Link href="/privacidad" className="font-cuerpo text-[0.9375rem] text-superficie underline-offset-4 hover:underline">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="font-cuerpo text-[0.9375rem] text-superficie underline-offset-4 hover:underline">
                  Términos de uso
                </Link>
              </li>
              <li>
                <Link href="/cuenta" className="font-cuerpo text-[0.9375rem] text-superficie underline-offset-4 hover:underline">
                  Mi pase
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <hr className="my-10 border-white/10" />

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Etiqueta tono="claro">Equipo</Etiqueta>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              {EQUIPO.map((p) => (
                <li key={p.codigo} className="font-cuerpo text-[0.8125rem] text-tenue">
                  {p.nombre} <span className="cifra">· {p.codigo}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <Etiqueta tono="claro">Créditos</Etiqueta>
            <p className="mt-3 font-cuerpo text-[0.8125rem] leading-relaxed text-tenue">
              Fotografía: equipo de la cafetería UTB. Universidad Tecnológica
              de Bolívar, Cartagena de Indias. Proyecto académico: los precios
              marcados como muestra no son definitivos.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

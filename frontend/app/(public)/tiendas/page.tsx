import type { Metadata } from "next";
import { TIENDAS } from "@/lib/tiendas";
import { estadoHorario } from "@/lib/formato";
import { jsonLdMigas } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Revelar } from "@/components/motion/Revelar";
import { TarjetaTienda } from "@/components/tienda/TarjetaTienda";

export const metadata: Metadata = {
  title: "Las tiendas",
  description:
    "Antojos, Punto Fit, Alegría y los dos almuerzos de la cafetería La Placita, campus UTB. Entra a cualquiera y aparta con una sola cuenta.",
  alternates: { canonical: "/tiendas" },
};

/*
 * Módulo «Tiendas» (SPEC v5 §3): el listado de las cinco tiendas en su
 * propia página. Se renderiza en cada petición porque «abierta ahora» se
 * calcula con la hora del servidor.
 */
export const dynamic = "force-dynamic";

export default function Tiendas() {
  const abiertas = TIENDAS.filter((t) => estadoHorario(t.horario).abierta).length;

  return (
    <>
      <JsonLd
        datos={jsonLdMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: "Tiendas", ruta: "/tiendas" },
        ])}
      />

      <header className="sabana bajo-nav relative isolate">
        <span aria-hidden="true" className="orbe -right-24 -top-32 h-[380px] w-[380px] [background:var(--tk-orbe-1)]" />
        <Revelar inmediato className="contenedor pb-10 pt-6 md:pb-14 md:pt-10">
          <p data-escalon="" className="rotulo opacity-85">La Placita · Campus UTB</p>
          <h1 data-escalon="" className="titulo mt-3">
            Las tiendas
          </h1>
          <p data-escalon="" className="lead mt-3 max-w-[40ch] opacity-90">
            Cinco tiendas, una sola cuenta. Puedes mezclar tiendas en un mismo pedido.
          </p>
          <p data-escalon="" className="cristal mt-6 inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${abiertas > 0 ? "bg-ok-punto" : "border border-blanco"}`}
            />
            {abiertas > 0
              ? `${abiertas} de ${TIENDAS.length} abiertas ahora`
              : estadoHorario(TIENDAS[0].horario).texto}
          </p>
        </Revelar>
      </header>

      <Revelar as="section" aria-label="Listado de tiendas" className="contenedor pb-20 pt-8 md:pb-28 md:pt-12">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TIENDAS.map((t) => (
            <li key={t.slug}>
              <TarjetaTienda tienda={t} />
            </li>
          ))}
        </ul>
      </Revelar>
    </>
  );
}

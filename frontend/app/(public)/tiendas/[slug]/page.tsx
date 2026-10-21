import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TIENDAS, tiendaPorSlug, clasesAcento, clasesTratamiento } from "@/lib/tiendas";
import { productosDe } from "@/lib/catalogo";
import { estadoHorario, formatoHora, formatoPrecio } from "@/lib/formato";
import { fotoTienda } from "@/lib/imagenes";
import { jsonLdMigas, jsonLdListaProductos, urlAbsoluta } from "@/lib/seo";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Boton } from "@/components/ui/Boton";
import { CampoFoto } from "@/components/tienda/CampoFoto";
import { ProductoCard } from "@/components/tienda/ProductoCard";
import { JsonLd } from "@/components/seo/JsonLd";

/**
 * El estado "abierto ahora" se calcula en el servidor, así que la página se
 * regenera cada minuto. Sin esto el build congelaría el estado del día de
 * compilación, que es peor que no mostrarlo.
 */
export const revalidate = 60;

export function generateStaticParams() {
  return TIENDAS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tienda = tiendaPorSlug(slug);
  if (!tienda) return { title: "Tienda no encontrada" };

  const productos = productosDe(tienda.slug);
  const titulo = `${tienda.nombre} — ${tienda.categoria}`;
  const descripcion = tienda.descripcion.slice(0, 155);

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `/tiendas/${tienda.slug}` },
    // Solo se indexa cuando la carta está confirmada y tiene contenido
    // suficiente (regla G16): precios de muestra fuera del índice.
    robots: tienda.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: `${tienda.nombre} · Tienda Virtual UTB`,
      description: descripcion,
      type: "website",
      url: urlAbsoluta(`/tiendas/${tienda.slug}`),
    },
    other: {
      "productos-publicados": String(productos.length),
    },
  };
}

export default async function PaginaTienda({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tienda = tiendaPorSlug(slug);
  if (!tienda) notFound();

  const productos = productosDe(tienda.slug);
  const acento = clasesAcento(tienda.acento);
  const estado = estadoHorario(tienda.horario);
  const foto = fotoTienda(tienda.slug);
  const desde = productos.length
    ? Math.min(...productos.map((p) => p.precioCentavos))
    : null;
  const indice = TIENDAS.findIndex((t) => t.slug === tienda.slug) + 1;

  return (
    <>
      <JsonLd
        datos={jsonLdMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: tienda.nombre, ruta: `/tiendas/${tienda.slug}` },
        ])}
      />
      <JsonLd datos={jsonLdListaProductos(tienda)} />

      {/* Cabecera: la sábana azul de la app */}
      <header className="sabana">
        <div className="contenedor pb-16 pt-8 lg:pb-20 lg:pt-10">
          <Link
            href="/#tiendas"
            className="inline-flex items-center gap-2 font-display text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-cyan-claro underline-offset-4 hover:underline"
          >
            <span aria-hidden="true">←</span> Directorio
          </Link>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="rotulo cifra text-cyan-claro">
                  {String(indice).padStart(2, "0")}
                </span>
                <span className="rotulo rounded-[var(--tk-radio-pill)] bg-white/15 px-2.5 py-1 text-superficie">
                  {tienda.categoria}
                </span>
              </div>

              <h1 className={`mt-5 text-superficie ${clasesTratamiento(tienda.tratamiento, "hero")}`}>
                {tienda.nombre}
              </h1>
              <p className="lead mt-4 max-w-[42ch] text-cyan-claro">
                {tienda.tagline}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-[var(--tk-radio-pill)] bg-white/15 px-3.5 py-2">
                <span
                  aria-hidden="true"
                  className={[
                    "h-2.5 w-2.5 rounded-[var(--tk-radio-pill)]",
                    estado.abierta ? "bg-ok" : "border border-superficie",
                  ].join(" ")}
                />
                <span className="font-display text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-superficie">
                  {estado.abierta ? "Abierto" : "Cerrado"}
                </span>
                <span className="font-cuerpo text-[0.8125rem] text-cyan-claro">
                  {estado.detalle}
                </span>
              </span>
              <span className="font-cuerpo text-[0.8125rem] text-cyan-claro">
                {formatoHora(tienda.horario.abre)} – {formatoHora(tienda.horario.cierra)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="bg-tinta">
        <div className="contenedor grid gap-10 py-12 lg:grid-cols-12 lg:gap-12 lg:py-16">
          {/* Ficha */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              {foto ? (
                <div className="overflow-hidden rounded-[var(--tk-radio)] bg-navy">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.src}
                    alt={foto.alt}
                    width={800}
                    height={960}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <CampoFoto
                  acento={tienda.acento}
                  slug={tienda.slug}
                  nombre={tienda.nombre}
                />
              )}

              <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-linea pt-4">
                <Etiqueta>Carta</Etiqueta>
                <span className="rotulo cifra text-tenue">
                  {String(productos.length).padStart(2, "0")} productos
                </span>
              </div>

              {desde !== null ? (
                <p className="mt-3 font-cuerpo text-[0.9375rem] text-tenue">
                  Desde{" "}
                  <span className="cifra font-display font-bold text-cyan-claro">
                    {formatoPrecio(desde)}
                  </span>
                </p>
              ) : null}

              <p className="cuerpo mt-4 text-tenue">{tienda.descripcion}</p>

              {tienda.nota ? (
                <div className="mt-5 rounded-[var(--tk-radio-sm)] border-l-4 border-ambar bg-ambar/10 px-4 py-3">
                  <p className="font-cuerpo text-[0.875rem] leading-snug text-superficie">
                    {tienda.nota}
                  </p>
                </div>
              ) : null}

              <p className="mt-5 font-cuerpo text-[0.8125rem] leading-relaxed text-tenue">
                Para apartar necesitas tu pase. El pago es en el mostrador, al
                recoger.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Boton href="/auth/ingresar" variante="solido" bloque>
                  Entrar para apartar
                </Boton>
                <span className={`h-[3px] w-16 rounded-[var(--tk-radio-pill)] ${acento.punto}`} />
              </div>
            </div>
          </aside>

          {/* Productos */}
          <section aria-labelledby="carta" className="lg:col-span-8">
            <div className="flex items-baseline justify-between gap-4 border-b border-linea pb-3">
              <h2
                id="carta"
                className="font-display text-[1.5rem] font-extrabold tracking-[-0.02em] text-superficie"
              >
                {productos.length > 0 ? "Lo que hay hoy" : "Carta en preparación"}
              </h2>
              <Link
                href="/#tiendas"
                className="rotulo text-tenue underline underline-offset-4 hover:text-superficie"
              >
                Otras tiendas
              </Link>
            </div>

            {productos.length > 0 ? (
              <ul className="mt-6 flex flex-col gap-4">
                {productos.map((producto) => (
                  <ProductoCard
                    key={producto.id}
                    producto={producto}
                    acento={tienda.acento}
                  />
                ))}
              </ul>
            ) : (
              <div className="tarjeta mt-6 border border-dashed border-borde px-6 py-12 text-center">
                <p className="font-display text-[1.125rem] font-bold text-superficie">
                  Este punto todavía no publica su carta.
                </p>
                <p className="cuerpo mx-auto mt-2 max-w-[44ch] text-tenue">
                  Está en montaje dentro de la cafetería. Cuando abra, sus
                  productos aparecen aquí con precios confirmados.
                </p>
                <div className="mt-6 flex justify-center">
                  <Boton href="/#tiendas" variante="solido">
                    Ver las otras tiendas
                  </Boton>
                </div>
              </div>
            )}

            {productos.length > 0 &&
            (productos.some((p) => p.esMuestra) ||
              productos.some((p) => p.sabores?.length)) ? (
              <p className="mt-8 max-w-[62ch] font-cuerpo text-[0.8125rem] leading-relaxed text-tenue">
                {productos.some((p) => p.esMuestra)
                  ? "Los productos marcados como referencia todavía no tienen precio confirmado por la tienda. "
                  : ""}
                {productos.some((p) => p.sabores?.length)
                  ? "El sabor de los snacks y helados se elige en el mostrador al recoger."
                  : ""}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TIENDAS, tiendaPorSlug, paletaTienda } from "@/lib/tiendas";
import { productosDe } from "@/lib/catalogo";
import { estadoHorario, formatoHora } from "@/lib/formato";
import { FOTO_CAFETERIA, fotoTienda } from "@/lib/imagenes";
import { jsonLdMigas, jsonLdListaProductos, urlAbsoluta } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Revelar } from "@/components/motion/Revelar";
import { Boton } from "@/components/ui/Boton";
import { Icono } from "@/components/ui/Icono";
import { CartaTienda } from "@/components/tienda/CartaTienda";
import { ResumenPedido } from "@/components/tienda/ResumenPedido";

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
  const paleta = paletaTienda(tienda.slug);
  const estado = estadoHorario(tienda.horario);
  const indice = TIENDAS.findIndex((t) => t.slug === tienda.slug);
  // Mientras no haya foto propia de la tienda, la cabecera usa una foto de la
  // cafetería (con su alt honesto, sin decir que es de esta tienda).
  const foto = fotoTienda(tienda.slug) ?? FOTO_CAFETERIA[(indice + 4) % FOTO_CAFETERIA.length];
  const hayMuestra = productos.some((p) => p.esMuestra);
  const haySabores = productos.some((p) => p.sabores?.length);

  return (
    <>
      <JsonLd
        datos={jsonLdMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: tienda.nombre, ruta: `/tiendas/${tienda.slug}` },
        ])}
      />
      <JsonLd datos={jsonLdListaProductos(tienda)} />

      {/* Sábana: las cinco tiendas como pastillas; la actual, en blanco. */}
      <div className="sabana bajo-nav">
        <nav aria-label="Tiendas" className="contenedor pb-7 pt-2">
          <ul className="fila-desliza -mx-[var(--tk-margen)] flex gap-2 px-[var(--tk-margen)] md:mx-0 md:flex-wrap md:px-0">
            {TIENDAS.map((t) => {
              const actual = t.slug === tienda.slug;
              return (
                <li key={t.slug} className="shrink-0">
                  <Link
                    href={`/tiendas/${t.slug}`}
                    aria-current={actual ? "page" : undefined}
                    className={[
                      "inline-flex h-11 items-center gap-2 rounded-pill px-4 text-sm font-bold transition-colors duration-[var(--tk-dur)]",
                      actual
                        ? "bg-blanco text-carnet-tinta"
                        : "bg-sabana-vidrio text-sobre-sabana hover:bg-[color:var(--tk-sabana-vidrio-alto)]",
                    ].join(" ")}
                  >
                    <span aria-hidden="true" className={`h-2 w-2 rounded-pill ${paletaTienda(t.slug).punto}`} />
                    {t.nombre}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="contenedor pb-16 pt-5 md:pt-7">
        {/* Cabecera con foto y velo */}
        <Revelar
          as="header"
          inmediato
          className="relative isolate flex min-h-[260px] flex-col justify-end overflow-hidden rounded-xl bg-oscuro text-blanco [--tk-foco:var(--tk-sobre-sabana)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto.src}
            alt={foto.alt}
            width={960}
            height={1280}
            fetchPriority="high"
            className="foto-contenido absolute inset-0 -z-20 h-full w-full object-cover object-[center_40%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 [background:var(--tk-velo-foto-vertical)] md:[background:var(--tk-velo-foto)]"
          />
          <div className="max-w-[560px] px-5 pb-6 pt-16 md:px-9 md:pb-8">
            <span
              className={`inline-flex h-[26px] items-center rounded-pill px-3 text-[0.8125rem] font-bold ${paleta.relleno} ${paleta.sobreRelleno}`}
            >
              {tienda.categoria}
            </span>
            <h1 className="titulo mt-2.5">{tienda.nombre}</h1>
            <p className="mt-2.5 text-sm leading-snug opacity-95 md:text-[1.0625rem] md:leading-[1.45]">
              <span className="md:hidden">{tienda.tagline}</span>
              <span className="hidden md:inline">{tienda.descripcion}</span>
            </p>
            <ul className="mt-3.5 flex flex-wrap gap-2 text-xs font-semibold md:text-[0.8125rem]">
              <li className="inline-flex h-[30px] items-center gap-1.5 rounded-pill bg-sabana-vidrio px-3">
                <span
                  aria-hidden="true"
                  className={`h-[7px] w-[7px] rounded-pill ${estado.abierta ? "bg-fit" : "border border-blanco"}`}
                />
                {estado.abierta ? `Abierto · cierra ${formatoHora(tienda.horario.cierra)}` : estado.texto}
              </li>
              <li className="inline-flex h-[30px] items-center rounded-pill bg-sabana-vidrio px-3">
                Pago en el mostrador
              </li>
              {productos.length > 0 ? (
                <li className="inline-flex h-[30px] items-center rounded-pill bg-sabana-vidrio px-3">
                  {hayMuestra ? "Precios de referencia" : "Precios confirmados"}
                </li>
              ) : null}
            </ul>
          </div>
        </Revelar>

        {tienda.nota ? (
          <p className="mt-4 flex items-start gap-2.5 rounded-sm bg-aviso-suave px-4 py-3 text-sm leading-snug text-aviso">
            <Icono nombre="info" tamano={18} className="mt-px shrink-0" />
            {tienda.nota}
          </p>
        ) : null}

        <div className="mt-7 flex flex-wrap items-start gap-7">
          <Revelar as="section" aria-labelledby="carta" className="min-w-0 flex-[999_1_560px]">
            <h2 id="carta" className="sr-only">
              {productos.length > 0 ? `La carta de ${tienda.nombre}` : "Carta en preparación"}
            </h2>

            {productos.length > 0 ? (
              <CartaTienda productos={productos} />
            ) : (
              <div className="rounded-tarjeta border border-dashed border-borde bg-tarjeta px-6 py-12 text-center">
                <p className="font-display text-2xl font-semibold">Este punto todavía no publica su carta.</p>
                <p className="mx-auto mt-2 max-w-[44ch] text-tenue">
                  Está en montaje dentro de la cafetería. Cuando abra, sus
                  productos aparecen aquí con precios confirmados.
                </p>
                <div className="mt-6 flex justify-center">
                  <Boton href="/#tiendas" variante="primario">
                    Ver las otras tiendas
                  </Boton>
                </div>
              </div>
            )}

            {productos.length > 0 && (hayMuestra || haySabores) ? (
              <p className="mt-8 max-w-[62ch] text-[0.8125rem] leading-relaxed text-tenue">
                {hayMuestra
                  ? "Los productos marcados como referencia todavía no tienen precio confirmado por la tienda. "
                  : ""}
                {haySabores ? "El sabor de los snacks y helados se elige en el mostrador al recoger." : ""}
              </p>
            ) : null}
          </Revelar>

          <div className="hidden min-w-0 flex-[1_1_320px] lg:block lg:self-stretch">
            <ResumenPedido />
          </div>
        </div>
      </div>
    </>
  );
}

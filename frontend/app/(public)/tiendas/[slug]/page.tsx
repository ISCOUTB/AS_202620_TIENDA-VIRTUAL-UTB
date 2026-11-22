import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TIENDAS, tiendaPorSlug, paletaTienda } from "@/lib/tiendas";
import { productosDe } from "@/lib/catalogo";
import { obtenerCatalogo } from "@/lib/catalogo-servidor";
import { estadoHorario, formatoHora } from "@/lib/formato";
import { portadaTienda } from "@/lib/imagenes";
import { jsonLdMigas, jsonLdListaProductos, urlAbsoluta } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Revelar } from "@/components/motion/Revelar";
import { Boton } from "@/components/ui/Boton";
import { Icono } from "@/components/ui/Icono";
import { CartaTienda } from "@/components/tienda/CartaTienda";
import { ResumenPedido } from "@/components/tienda/ResumenPedido";
import { AvisoRespaldo } from "@/components/tienda/AvisoRespaldo";
import { LogoTienda } from "@/components/tienda/LogoTienda";

/*
 * La página se renderiza en cada petición: el catálogo y las existencias se
 * leen sin caché (lib/catalogo-servidor.ts, escenario 3), y con ellos el
 * estado «abierto ahora», que un build congelaría en el día de compilación.
 */

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

  const { productos: catalogo } = await obtenerCatalogo();
  const productos = productosDe(catalogo, tienda.slug);
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

  const { productos: catalogo, origen } = await obtenerCatalogo();
  const productos = productosDe(catalogo, tienda.slug);
  const paleta = paletaTienda(tienda.slug);
  const estado = estadoHorario(tienda.horario);
  const portada = portadaTienda(tienda.slug);
  const haySabores = productos.some((p) => p.sabores?.length);
  const otras = TIENDAS.filter((t) => t.slug !== tienda.slug);

  return (
    <>
      <JsonLd
        datos={jsonLdMigas([
          { nombre: "Inicio", ruta: "/" },
          { nombre: tienda.nombre, ruta: `/tiendas/${tienda.slug}` },
        ])}
      />
      <JsonLd datos={jsonLdListaProductos(tienda, productos)} />

      <div className="contenedor pb-16 pt-3 sm:pt-4">
        {/* ───────────── Portada + ficha de la tienda ───────────── */}
        <Revelar as="header" inmediato className="relative">
          <div className="relative h-44 overflow-hidden rounded-xl bg-oscuro text-blanco [--tk-foco:var(--tk-sobre-sabana)] sm:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={portada.src}
              alt={portada.alt}
              width={960}
              height={1280}
              fetchPriority="high"
              className={`foto-contenido absolute inset-0 h-full w-full object-cover ${portada.encuadre}`}
            />
            <div aria-hidden="true" className="absolute inset-0 [background:var(--tk-velo-foto-vertical)]" />
            <Link
              href="/tiendas"
              aria-label="Volver a todas las tiendas"
              className="cristal absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full sm:left-4 sm:top-4"
            >
              <Icono nombre="atras" tamano={20} grosor={2.2} />
            </Link>
          </div>

          {/* La ficha sube sobre la portada; el logo asoma por su borde. */}
          <div className="vidrio-alto relative mx-2 -mt-12 rounded-lg px-5 pb-4 pt-12 sm:mx-6 sm:-mt-16 sm:pl-[8.5rem] sm:pt-5">
            <span className="absolute -top-10 left-5 rounded-full bg-tarjeta p-1.5 shadow-[var(--tk-vidrio-sombra-alta)] sm:-top-12 sm:left-6">
              <LogoTienda slug={tienda.slug} tamano={72} className="sm:h-[84px] sm:w-[84px]" />
            </span>
            <p className={`tipo-micro ${paleta.tinta}`}>{tienda.categoria}</p>
            <h1 className="mt-1.5 font-display text-[1.75rem] font-extrabold uppercase leading-none tracking-[0.01em] sm:text-4xl">
              {tienda.nombre}
            </h1>
            <p className="mt-2 max-w-[60ch] text-sm leading-snug text-tenue sm:text-[0.9375rem]">
              <span className="sm:hidden">{tienda.tagline}</span>
              <span className="hidden sm:inline">{tienda.descripcion}</span>
            </p>
            {/* Una sola fila que se desliza en móvil: los datos no empujan la carta. */}
            <ul className="fila-desliza -mx-5 mt-4 flex gap-2 whitespace-nowrap px-5 text-xs font-semibold sm:mx-0 sm:flex-wrap sm:px-0">
              <li className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-suave px-3">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${estado.abierta ? "bg-ok-punto" : "border border-tenue"}`}
                />
                {estado.abierta ? `Abierto · cierra ${formatoHora(tienda.horario.cierra)}` : estado.texto}
              </li>
              <li className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-suave px-3">
                <Icono nombre="reloj" tamano={14} grosor={2} />
                Recoges en La Placita
              </li>
              <li className="inline-flex h-8 shrink-0 items-center rounded-pill bg-suave px-3">Pago en el mostrador</li>
            </ul>
          </div>
        </Revelar>

        {origen === "respaldo" ? <AvisoRespaldo className="mt-4" /> : null}

        {tienda.nota ? (
          <p className="mt-4 flex items-start gap-2.5 rounded-md bg-aviso-suave px-4 py-3 text-sm leading-snug text-aviso">
            <Icono nombre="info" tamano={18} className="mt-px shrink-0" />
            {tienda.nota}
          </p>
        ) : null}

        {/* ───────────── Carta + resumen del pedido ───────────── */}
        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <Revelar as="section" aria-labelledby="carta" className="min-w-0">
            <h2 id="carta" className="sr-only">
              {productos.length > 0 ? `La carta de ${tienda.nombre}` : "Carta en preparación"}
            </h2>

            {productos.length > 0 ? (
              <CartaTienda productos={productos} nombreTienda={tienda.nombre} />
            ) : (
              <div className="vidrio flex flex-col items-center px-6 py-12 text-center">
                <LogoTienda slug={tienda.slug} tamano={64} />
                <p className="mt-5 text-lg font-semibold">Este punto todavía no publica su carta.</p>
                <p className="mx-auto mt-2 max-w-[44ch] text-sm text-tenue">
                  Está en montaje dentro de la cafetería. Cuando abra, sus
                  productos aparecen aquí.
                </p>
                <div className="mt-6">
                  <Boton href="/tiendas" variante="primario">
                    Ver las otras tiendas
                  </Boton>
                </div>
              </div>
            )}

            {productos.length > 0 && haySabores ? (
              <p className="mt-8 max-w-[62ch] text-[0.8125rem] leading-relaxed text-tenue">
                {haySabores ? "El sabor de los snacks y helados se elige en el mostrador al recoger." : ""}
              </p>
            ) : null}
          </Revelar>

          <div className="hidden lg:block lg:self-stretch">
            <ResumenPedido />
          </div>
        </div>

        {/* ───────────── Otras tiendas ───────────── */}
        <nav aria-labelledby="h-otras" className="mt-14">
          <h2 id="h-otras" className="tipo-bloque">
            Otras tiendas en La Placita
          </h2>
          <ul className="fila-desliza -mx-[var(--tk-margen)] mt-4 flex gap-2.5 px-[var(--tk-margen)] pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
            {otras.map((t) => (
              <li key={t.slug} className="shrink-0">
                <Link
                  href={`/tiendas/${t.slug}`}
                  className="vidrio-alto flex items-center gap-3 rounded-pill py-1.5 pl-1.5 pr-5 transition-colors duration-[var(--tk-dur)] hover:bg-[color:var(--tk-resalte)]"
                >
                  <LogoTienda slug={t.slug} tamano={40} />
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{t.nombre}</span>
                    <span className="block text-xs text-tenue">{t.categoria}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

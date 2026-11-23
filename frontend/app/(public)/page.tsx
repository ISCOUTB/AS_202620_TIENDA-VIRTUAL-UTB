import Link from "next/link";
import type { Metadata } from "next";
import { TIENDAS, tiendaPorSlug, type SlugTienda } from "@/lib/tiendas";
import { FOTO_CAFETERIA, type Foto } from "@/lib/imagenes";
import { estadoHorario, formatoHora } from "@/lib/formato";
import { esParaCompartir, productosDe, productosDestacados } from "@/lib/catalogo";
import { obtenerCatalogo } from "@/lib/catalogo-servidor";
import { JsonLd } from "@/components/seo/JsonLd";
import { jsonLdCafeteria, DESCRIPCION_SITIO } from "@/lib/seo";
import { Revelar } from "@/components/motion/Revelar";
import { Boton } from "@/components/ui/Boton";
import { Icono } from "@/components/ui/Icono";
import { CarruselPortada, type Diapositiva } from "@/components/portada/CarruselPortada";
import { Vitrina } from "@/components/portada/Vitrina";
import { BuscadorProductos } from "@/components/tienda/BuscadorProductos";
import { LogoTienda } from "@/components/tienda/LogoTienda";

export const metadata: Metadata = {
  title: "Cafetería del campus: cinco tiendas, una sola cuenta",
  description: DESCRIPCION_SITIO,
  alternates: { canonical: "/" },
};

/*
 * Inicio (SPEC v5 §3): SOLO anuncios, recomendaciones y propuestas de
 * compra. Las tiendas tienen su módulo (/tiendas) y el «cómo funciona», la
 * cuenta y las preguntas el suyo (/como-funciona): la portada no lleva a
 * ninguna parte deslizando, cada enlace abre su página.
 *
 * Se renderiza en cada petición: las vitrinas llevan existencias reales
 * (lib/catalogo-servidor.ts) y «Abierto ahora» se calcula en el servidor.
 */

/** Frases de la barra animada (como la barra de información del catálogo). */
const GARANTIAS = [
  "Cinco tiendas, una sola cuenta",
  "Aparta sin fila",
  "Existencias reales",
  "Paga en el mostrador",
  "Campus UTB · Cartagena",
];

/** Fotos de la fila «El lugar»: el salón, los mostradores y las vitrinas. */
const FOTOS_FEED = [3, 4, 5, 7, 8].map((i) => FOTO_CAFETERIA[i]);

export default async function Inicio() {
  const { productos } = await obtenerCatalogo();
  const horario = TIENDAS[0].horario;
  const estado = estadoHorario(horario);
  const franja = `Lun a vie, ${formatoHora(horario.abre)} – ${formatoHora(horario.cierra)}`;

  // Cada producto aparece una sola vez en la portada (su `id` de ancla es
  // único): cada vitrina excluye lo que ya mostró una anterior.
  const destacados = productosDestacados(productos);
  const yaMostrados = new Set(destacados.map((p) => p.id));
  const paraCompartir = productos.filter((p) => esParaCompartir(p) && !yaMostrados.has(p.id)).slice(0, 4);
  paraCompartir.forEach((p) => yaMostrados.add(p.id));
  const vitrina = (slug: SlugTienda) =>
    productosDe(productos, slug).filter((p) => !yaMostrados.has(p.id)).slice(0, 4);

  const proxima = tiendaPorSlug("almuerzo-02");

  const diapositivas: Diapositiva[] = [
    {
      foto: FOTO_CAFETERIA[13],
      rotulo: "Cafetería La Placita · Campus UTB",
      titular: ["Cinco tiendas,", "una sola cuenta."],
      texto:
        "Aparta en Antojos, Punto Fit, Alegría y los dos almuerzos con tu correo institucional. Eliges la hora, pasas y pagas en el mostrador.",
      accion: { href: "/tiendas", texto: "Ver las tiendas" },
      encuadre: "object-[center_8%]",
    },
    {
      foto: FOTO_CAFETERIA[1],
      rotulo: "Antojos · Tienda de barrio",
      titular: ["Lo de siempre,", "sin la fila."],
      accion: { href: "/tiendas/antojos", texto: "Entrar a Antojos" },
      encuadre: "object-[center_35%]",
    },
    {
      foto: FOTO_CAFETERIA[15],
      rotulo: "Alegría · Helados, sándwiches y más",
      titular: ["Aparta ahora,", "recoge después."],
      accion: { href: "/como-funciona", texto: "Cómo funciona" },
      encuadre: "object-[center_55%]",
    },
  ];

  // Triple banner: tres fotos que anuncian una tienda cada una.
  const triple: Array<{ foto: Foto; slug: SlugTienda; encuadre: string }> = [
    { foto: FOTO_CAFETERIA[0], slug: "antojos", encuadre: "object-[center_40%]" },
    { foto: FOTO_CAFETERIA[14], slug: "alegria", encuadre: "object-center" },
    { foto: FOTO_CAFETERIA[13], slug: "almuerzo-01", encuadre: "object-center" },
  ];

  return (
    <>
      <JsonLd datos={jsonLdCafeteria(productos)} />

      {/* ───────────── Anuncios: carrusel ───────────── */}
      <CarruselPortada diapositivas={diapositivas} />

      {/* ───────────── Buscador y estado: panel de vidrio sobre el borde del carrusel ───────────── */}
      <section aria-label="Buscar y horario" className="contenedor relative z-30 -mt-14 md:-mt-12">
        <div className="vidrio flex flex-col items-center gap-3 px-5 py-5 md:flex-row md:justify-between md:px-7">
          {/* El estado no se parte nunca; el horario baja de línea entero
              si no cabe (móvil) y se centra con él. */}
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center md:justify-start md:text-left">
            <span className="tipo-micro inline-flex items-center gap-2 whitespace-nowrap">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${estado.abierta ? "bg-ok-punto" : "border border-tenue"}`}
              />
              {estado.abierta ? "Abierto ahora" : "Cerrado ahora"}
            </span>
            <span className="whitespace-nowrap text-xs text-tenue">{franja}</span>
          </p>
          <div className="w-full max-w-[520px]">
            <BuscadorProductos productos={productos} />
          </div>
        </div>
      </section>

      {/* ───────────── Recomendados: lo más pedido ───────────── */}
      <Vitrina
        id="h-pedido"
        titulo="Lo más pedido"
        enlace={{ href: "/tiendas", texto: "Ver las tiendas" }}
        productos={destacados}
        mostrarTienda
      />

      {/* ───────────── Anuncio de marca: aparta sin fila ───────────── */}
      <Revelar
        as="section"
        aria-labelledby="h-anuncio"
        className="sabana relative isolate mx-2.5 mt-14 overflow-hidden rounded-xl sm:mx-4 md:mt-20"
      >
        {/* Dos orbes de luz difusa: dan al cristal algo que desenfocar. */}
        <span aria-hidden="true" className="orbe -right-24 -top-32 h-[420px] w-[420px] [background:var(--tk-orbe-1)]" />
        <span aria-hidden="true" className="orbe -bottom-40 left-[30%] h-[360px] w-[360px] [background:var(--tk-orbe-2)]" />
        <div className="contenedor flex flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between md:py-16">
          <div>
            <p data-escalon="" className="rotulo opacity-85">Nuevo en el campus</p>
            <h2 id="h-anuncio" data-escalon="" className="titulo mt-3 max-w-[14ch]">
              Aparta y recoge sin fila
            </h2>
            <p data-escalon="" className="mt-4 max-w-[38ch] opacity-90">
              Eliges la hora desde el teléfono, pasas por el mostrador y pagas
              ahí. Sin filas ni repetir el pedido.
            </p>
          </div>
          <div data-escalon="" className="flex flex-wrap gap-3">
            <Boton href="/tiendas" variante="claro">
              Empezar a apartar
            </Boton>
            <Link
              href="/como-funciona"
              className="cristal inline-flex min-h-11 items-center rounded-pill px-6 tipo-accion transition-[background-color] duration-[var(--tk-dur-media)] hover:bg-[color:var(--tk-cristal-alto)]"
            >
              Cómo funciona
            </Link>
          </div>
        </div>
      </Revelar>

      {/* ───────────── Propuestas: para compartir ───────────── */}
      <Vitrina
        id="h-compartir"
        titulo="Para compartir"
        enlace={{ href: "/tiendas", texto: "Ver las tiendas" }}
        productos={paraCompartir}
        mostrarTienda
      />

      {/* ───────────── Recomendados de Antojos ───────────── */}
      <Vitrina id="h-antojos" titulo="Antojos" enlace={{ href: "/tiendas/antojos" }} productos={vitrina("antojos")} />

      {/* ───────────── Anuncios: triple banner ───────────── */}
      <section aria-label="Entra a una tienda" className="mx-2.5 mt-16 grid gap-3 sm:mx-4 md:mt-24 md:grid-cols-3 md:gap-4">
        {triple.map(({ foto, slug, encuadre }) => {
          const t = TIENDAS.find((x) => x.slug === slug)!;
          return (
            <Link
              key={slug}
              href={`/tiendas/${slug}`}
              className="levanta group relative block aspect-[16/11] overflow-hidden rounded-lg bg-oscuro text-blanco [--tk-foco:var(--tk-sobre-sabana)] md:aspect-[3/4]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.src}
                alt={foto.alt}
                width={960}
                height={1280}
                loading="lazy"
                className={`foto-contenido zoom absolute inset-0 h-full w-full object-cover ${encuadre}`}
              />
              <span aria-hidden="true" className="absolute inset-0 [background:var(--tk-velo-hero)]" />
              <span className="cristal absolute inset-x-5 bottom-5 flex items-center justify-between gap-4 px-5 py-4 md:inset-x-6 md:bottom-6">
                <span className="flex items-center gap-3">
                  <LogoTienda slug={slug} tamano={40} />
                  <span className="flex flex-col">
                    <span className="rotulo opacity-90">{t.categoria}</span>
                    <span className="mt-1 font-display text-lg font-extrabold uppercase tracking-[0.04em]">{t.nombre}</span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--tk-cristal-borde)] transition-transform duration-[var(--tk-dur-media)] ease-[var(--tk-ease)] group-hover:translate-x-1"
                >
                  <Icono nombre="flecha" tamano={18} grosor={1.8} />
                </span>
              </span>
            </Link>
          );
        })}
      </section>

      {/* ───────────── Recomendados de Punto Fit ───────────── */}
      <Vitrina id="h-fit" titulo="Punto Fit" enlace={{ href: "/tiendas/punto-fit" }} productos={vitrina("punto-fit")} />

      {/* ───────────── Anuncio: la tienda que viene ───────────── */}
      {proxima ? (
        <Revelar as="section" aria-labelledby="h-proxima" className="contenedor mt-14 md:mt-20">
          <Link
            href={`/tiendas/${proxima.slug}`}
            className="levanta vidrio group flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8"
          >
            <LogoTienda slug={proxima.slug} tamano={72} />
            <span className="min-w-0 flex-1">
              <span className="rotulo text-enlace">Próximamente</span>
              <span id="h-proxima" className="mt-1.5 block tipo-bloque">
                {proxima.nombre} abre pronto
              </span>
              <span className="mt-1.5 block text-sm text-tenue">{proxima.tagline}</span>
            </span>
            <span className="tipo-accion inline-flex items-center gap-2 text-enlace">
              Ver la tienda
              <span aria-hidden="true" className="transition-transform duration-[var(--tk-dur-media)] group-hover:translate-x-1">
                →
              </span>
            </span>
          </Link>
        </Revelar>
      ) : null}

      {/* ───────────── Recomendados de los almuerzos y Alegría ───────────── */}
      <Vitrina
        id="h-oriental"
        titulo="Línea oriental"
        enlace={{ href: "/tiendas/almuerzo-01" }}
        productos={vitrina("almuerzo-01")}
      />
      <Vitrina id="h-alegria" titulo="Alegría" enlace={{ href: "/tiendas/alegria" }} productos={vitrina("alegria")} />

      {/* ───────────── El lugar: fila de fotos ───────────── */}
      <Revelar as="section" aria-labelledby="h-lugar" className="mt-16 md:mt-24">
        <div className="flex flex-col items-center px-[var(--tk-margen)] text-center">
          <p className="rotulo text-tenue">La Placita · Campus UTB</p>
          <h2 id="h-lugar" className="mt-2 tipo-bloque">
            Pasa, recoge y sigue
          </h2>
        </div>
        <ul className="fila-desliza mt-6 flex gap-3 px-[var(--tk-margen)] pb-2 md:gap-4 md:px-8">
          {FOTOS_FEED.map((f) => (
            <li key={f.src} className="levanta relative aspect-square w-[70%] shrink-0 overflow-hidden rounded-lg bg-oscuro sm:w-[40%] md:w-[calc((100%-4rem)/5)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.src}
                alt={f.alt}
                width={960}
                height={1280}
                loading="lazy"
                className="foto-contenido zoom absolute inset-0 h-full w-full object-cover"
              />
            </li>
          ))}
        </ul>
      </Revelar>

      {/* ───────────── Barra de información animada ───────────── */}
      <div className="vidrio mx-2.5 mb-16 mt-16 overflow-hidden rounded-pill py-4 sm:mx-4 md:mb-24 md:mt-24" aria-label="Lo que ofrece la tienda" role="note">
        <p className="cinta-animada tipo-accion text-enlace">
          {/* Dos copias seguidas: el desplazamiento al −50 % empalma sin salto.
              La segunda es decorativa. */}
          {[0, 1].map((copia) => (
            <span key={copia} aria-hidden={copia === 1 ? true : undefined} className="inline-flex shrink-0">
              {GARANTIAS.map((g) => (
                <span key={g} className="px-6">
                  {g}
                  <span aria-hidden="true" className="pl-12 opacity-50">✦</span>
                </span>
              ))}
            </span>
          ))}
        </p>
      </div>
    </>
  );
}

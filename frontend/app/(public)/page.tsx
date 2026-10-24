import Link from "next/link";
import type { Metadata } from "next";
import { TIENDAS, paletaTienda } from "@/lib/tiendas";
import { FOTOS_LUGAR } from "@/lib/imagenes";
import { estadoHorario, formatoHora } from "@/lib/formato";
import { productosDestacados } from "@/lib/catalogo";
import { obtenerCatalogo } from "@/lib/catalogo-servidor";
import { JsonLd } from "@/components/seo/JsonLd";
import { jsonLdCafeteria, jsonLdFaq, DESCRIPCION_SITIO } from "@/lib/seo";
import { Revelar } from "@/components/motion/Revelar";
import { Boton } from "@/components/ui/Boton";
import { Icono, IconoTienda, type NombreIcono } from "@/components/ui/Icono";
import { TarjetaTienda } from "@/components/tienda/TarjetaTienda";
import { ProductoCard } from "@/components/tienda/ProductoCard";
import { BuscadorProductos } from "@/components/tienda/BuscadorProductos";
import { Carnet } from "@/components/auth/Carnet";

export const metadata: Metadata = {
  title: "Cafetería del campus: cinco tiendas, un solo pase",
  description: DESCRIPCION_SITIO,
  alternates: { canonical: "/" },
};

/*
 * Se renderiza en cada petición: «Lo más pedido» lleva existencias reales
 * (lib/catalogo-servidor.ts) y «Abierto ahora» se calcula en el servidor.
 */

const PASOS = [
  {
    n: "01",
    titulo: "Entra con tu correo",
    texto:
      "Tu correo institucional es el pase. Con él ves precios, existencias y tus reservas.",
  },
  {
    n: "02",
    titulo: "Aparta y elige la hora",
    texto:
      "Puedes mezclar tiendas en un mismo pedido. Elige la franja en la que vas a pasar.",
  },
  {
    n: "03",
    titulo: "Recoge y paga ahí",
    texto: "Llegas al mostrador, dices tu nombre, pagas y te vas.",
  },
];

const BENEFICIOS: Array<{ titulo: string; texto: string; icono: NombreIcono }> = [
  {
    titulo: "Tus pedidos en un solo lugar",
    texto: "Historial, estado y hora de recogida, sin buscar correos.",
    icono: "pedidos",
  },
  {
    titulo: "Reserva sin hacer fila",
    texto: "Apartas lo que quieres y eliges cuándo pasar por él.",
    icono: "reloj",
  },
  {
    titulo: "Existencias honestas",
    texto: "Si algo se agotó, lo ves antes de pedirlo. Cero es cero.",
    icono: "caja",
  },
  {
    titulo: "Un pase para las cinco tiendas",
    texto: "Antojos, Punto Fit, Alegría y los dos almuerzos, con una sola cuenta.",
    icono: "tiendas",
  },
  {
    titulo: "Avisos de lo que te gusta",
    texto: "Te contamos cuando vuelve lo que ya habías pedido.",
    icono: "campana",
  },
];

const PREGUNTAS = [
  {
    pregunta: "¿Necesito cuenta para mirar el menú?",
    respuesta:
      "No. Puedes recorrer las cinco tiendas, ver precios y existencias sin entrar. La cuenta solo se pide cuando vas a apartar algo.",
  },
  {
    pregunta: "¿Cómo se paga?",
    respuesta:
      "En el mostrador de la cafetería, al recoger. La tienda no cobra en línea todavía; el pago con tarjeta o Wompi está previsto más adelante.",
  },
  {
    pregunta: "¿Hasta qué hora puedo reservar?",
    respuesta:
      "Dentro del horario de la cafetería: de lunes a viernes de 7:00 a. m. a 8:00 p. m. El horario es provisional hasta que la cafetería lo confirme.",
  },
  {
    pregunta: "¿Y si se agota algo mientras pido?",
    respuesta:
      "La reserva se ajusta a las unidades reales. Si el producto se agota antes de que pases, te avisamos y no se te cobra.",
  },
  {
    pregunta: "¿Quién puede pedir?",
    respuesta:
      "La comunidad de la Universidad Tecnológica de Bolívar con correo institucional. Es un servicio del campus, no una tienda abierta al público.",
  },
  {
    pregunta: "¿Puedo pedir de varias tiendas a la vez?",
    respuesta:
      "Sí. El carrito es uno solo y agrupa los productos por tienda, para que el mostrador sepa de dónde sale cada cosa.",
  },
  {
    pregunta: "¿Qué hacen con mis datos?",
    respuesta:
      "Se usan para gestionar tus pedidos y avisarte de la disponibilidad. No se comparten con terceros ni se usan para publicidad.",
  },
  {
    pregunta: "¿Los precios son definitivos?",
    respuesta:
      "Los de la línea oriental están confirmados. Los de Antojos, Punto Fit y Alegría se muestran como referencia mientras la tienda los confirma.",
  },
];

export default async function Landing() {
  const { productos } = await obtenerCatalogo();
  const horario = TIENDAS[0].horario;
  const estado = estadoHorario(horario);
  const franja = `Lun a vie, ${formatoHora(horario.abre)} – ${formatoHora(horario.cierra)}`;
  const destacados = productosDestacados(productos);
  const [fotoHero, fotoPromo] = FOTOS_LUGAR;

  return (
    <>
      <JsonLd datos={jsonLdCafeteria(productos)} />
      <JsonLd datos={jsonLdFaq(PREGUNTAS)} />

      {/* ───────────── Sábana: titular, buscador y foto ───────────── */}
      <section aria-labelledby="titular" className="sabana bajo-nav">
        <Revelar
          inmediato
          className="contenedor flex flex-wrap items-center gap-12 pb-[60px] pt-4 md:pb-[110px] md:pt-10"
        >
          <div className="min-w-0 flex-[1_1_460px]">
            <p data-escalon="" className="mb-1.5 text-[0.8125rem] font-medium tracking-[0.02em] opacity-90 sm:mb-3.5 sm:text-[0.9375rem] sm:font-semibold">
              Cafetería La Placita · Campus UTB
            </p>
            <h1 id="titular" data-escalon="" className="display">
              Cinco tiendas,
              <br />
              un solo pase.
            </h1>
            <p data-escalon="" className="mt-5 hidden max-w-[30em] text-lg leading-normal opacity-95 sm:block">
              Aparta en Antojos, Punto Fit, Alegría y los dos almuerzos con tu
              correo institucional. Eliges la hora, pasas y pagas en el
              mostrador.
            </p>
            <div data-escalon="" className="relative z-20 mt-[22px] flex flex-wrap gap-3 sm:mt-7">
              <BuscadorProductos productos={productos} />
              <Boton href="#tiendas" variante="oscuro" tamano="lg" className="hidden px-[26px] sm:inline-flex">
                Ver las tiendas
              </Boton>
            </div>
          </div>

          <div data-escalon="" className="relative hidden min-w-0 flex-[1_1_380px] md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoHero.src}
              alt={fotoHero.alt}
              width={960}
              height={1280}
              fetchPriority="high"
              className="foto-contenido h-[400px] w-full rounded-xl bg-oscuro object-cover"
            />
            <div className="absolute -left-4 bottom-7 flex items-center gap-3 rounded-[20px] bg-tarjeta px-[18px] py-3.5 text-tinta shadow-alta">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-pill ${estado.abierta ? "bg-ok-punto" : "border-2 border-tenue"}`}
              />
              <div>
                <p className="text-[0.9375rem] font-bold">{estado.abierta ? "Abierto ahora" : "Cerrado ahora"}</p>
                <p className="mt-0.5 text-[0.8125rem] text-tenue">{franja}</p>
              </div>
            </div>
          </div>
        </Revelar>
      </section>

      {/* ───────────── Elige tienda (se solapa con la sábana) ───────────── */}
      <div className="contenedor relative -mt-8 md:-mt-16">
        <Revelar
          as="section"
          id="tiendas"
          aria-labelledby="h-tiendas"
          className="-mx-[var(--tk-margen)] scroll-mt-6 rounded-t-lg bg-tarjeta px-5 pb-2 pt-[22px] md:mx-0 md:rounded-xl md:p-8 md:shadow-tarjeta"
        >
          <p className="flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-tenue md:hidden">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-pill ${estado.abierta ? "bg-ok-punto" : "border-2 border-tenue"}`}
            />
            <span className="font-semibold text-tinta">{estado.abierta ? "Abierto ahora" : "Cerrado ahora"}</span>
            <span>· {franja}</span>
          </p>

          <div className="mt-[22px] flex flex-wrap items-baseline justify-between gap-2 md:mt-0">
            <h2 id="h-tiendas" className="rotulo text-tenue md:font-display md:text-[length:var(--tk-titulo-seccion)] md:font-semibold md:normal-case md:leading-[1.1] md:tracking-normal md:text-tinta">
              Elige tienda
            </h2>
            <p className="hidden text-[0.9375rem] text-tenue md:block">
              Puedes mezclar tiendas en un mismo pedido.
            </p>
          </div>

          {/* Móvil: la fila de fichas del artefacto. */}
          <ul className="mt-3 grid grid-cols-5 gap-2 md:hidden">
            {TIENDAS.map((t) => {
              const p = paletaTienda(t.slug);
              return (
                <li key={t.slug} data-escalon="">
                  <Link href={`/tiendas/${t.slug}`} className="flex flex-col items-center gap-2 text-center">
                    <span
                      aria-hidden="true"
                      className={`relative flex aspect-square w-full max-w-[62px] items-center justify-center rounded-[20px] ${p.suave} ${p.tinta}`}
                    >
                      <IconoTienda slug={t.slug} tamano={28} />
                      <span className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-pill border-2 border-tarjeta ${p.relleno}`} />
                    </span>
                    <span className="text-xs font-semibold leading-tight">{t.nombre}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desde md: tarjetas con foto. */}
          <ul className="mt-6 hidden grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4 md:grid">
            {TIENDAS.map((t) => (
              <li key={t.slug}>
                <TarjetaTienda tienda={t} />
              </li>
            ))}
          </ul>

          {/* Móvil: la promo «Aparta y recoge sin fila». */}
          <div className="relative mt-6 h-[168px] overflow-hidden rounded-[22px] bg-oscuro md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fotoPromo.src}
              alt={fotoPromo.alt}
              width={960}
              height={1280}
              loading="lazy"
              className="foto-contenido h-full w-full object-cover object-[center_40%]"
            />
            <div aria-hidden="true" className="absolute inset-0 [background:var(--tk-velo-foto)]" />
            <div className="absolute inset-y-[18px] left-[18px] right-[110px] flex flex-col justify-between text-blanco [--tk-foco:var(--tk-sobre-sabana)]">
              <div>
                <p className="font-display text-[1.375rem] font-semibold leading-[1.1]">Aparta y recoge sin fila</p>
                <p className="mt-1.5 text-[0.8125rem] leading-snug opacity-90">
                  Eliges la hora, pagas en el mostrador.
                </p>
              </div>
              <a
                href="#como"
                className="inline-flex min-h-11 items-center self-start rounded-pill bg-blanco px-4 text-[0.8125rem] font-bold text-carnet-azul"
              >
                Así funciona
              </a>
            </div>
          </div>
        </Revelar>
      </div>

      <div className="contenedor pb-16">
        {/* ───────────── Lo más pedido ───────────── */}
        <Revelar as="section" aria-labelledby="h-pedido" className="mt-[22px] md:mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="h-pedido" className="titulo-seccion">
              Lo más pedido
            </h2>
            <Link
              href="/tiendas/almuerzo-01"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-enlace md:text-[0.9375rem] md:font-bold"
            >
              Ver toda la carta
            </Link>
          </div>
          <ul className="fila-desliza -mx-[var(--tk-margen)] mt-2 flex gap-3 px-[var(--tk-margen)] scroll-px-[var(--tk-margen)] pb-1.5 md:mx-0 md:scroll-px-0 md:mt-5 md:grid md:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] md:gap-4 md:overflow-visible md:px-0">
            {destacados.map((p) => (
              <ProductoCard
                key={p.id}
                producto={p}
                disposicion="vertical"
                mostrarTienda
                className="w-[156px] shrink-0 md:w-auto"
              />
            ))}
          </ul>
        </Revelar>

        {/* ───────────── Cómo funciona ───────────── */}
        <Revelar
          as="section"
          id="como"
          aria-labelledby="h-como"
          className="mt-[26px] flex scroll-mt-6 flex-wrap gap-3 md:mt-14 md:gap-8"
        >
          <div className="flex-[1_1_280px]">
            <h2 id="h-como" className="titulo-seccion">
              Cómo funciona
            </h2>
            <p className="mt-3 hidden leading-normal text-tenue md:block">
              Tres pasos, sin fila y sin repetir el pedido.
            </p>
          </div>
          <ol className="grid flex-[3_1_600px] gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:gap-4">
            {PASOS.map((paso) => (
              <li
                key={paso.n}
                data-escalon=""
                className="flex items-start gap-3.5 rounded-md bg-suave p-3.5 md:block md:rounded-tarjeta md:border md:border-linea md:bg-tarjeta md:p-[22px]"
              >
                <span
                  aria-hidden="true"
                  className="cifra flex h-9 w-9 shrink-0 items-center justify-center rounded-xs bg-primario text-sm font-bold text-sobre-primario md:h-11 md:w-11 md:rounded-sm md:text-base"
                >
                  {paso.n}
                </span>
                <div>
                  <h3 className="text-[0.9375rem] font-semibold md:mt-4 md:text-lg">
                    <span className="sr-only">Paso {Number(paso.n)}: </span>
                    {paso.titulo}
                  </h3>
                  <p className="mt-1 text-[0.8125rem] leading-snug text-tenue md:mt-1.5 md:text-[0.9375rem] md:leading-normal">
                    {paso.texto}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Revelar>
      </div>

      {/* ───────────── La cuenta: banda oscura con el carnet ───────────── */}
      <section
        id="cuenta"
        aria-labelledby="h-cuenta"
        className="scroll-mt-6 border-y border-banda-borde bg-banda text-banda-tinta [--tk-foco:var(--tk-banda-acento)]"
      >
        <Revelar className="contenedor flex flex-wrap items-center gap-x-[72px] gap-y-14 py-14 md:py-[88px]">
          <div className="min-w-0 flex-[1_1_420px]">
            <p data-escalon="" className="text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-banda-acento">
              La cuenta
            </p>
            <h2
              id="h-cuenta"
              data-escalon=""
              className="mt-3.5 font-display text-[clamp(2rem,1.2rem+3.2vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.015em]"
            >
              Tu pase no es
              <br />
              un usuario más.
            </h2>
            <p data-escalon="" className="mt-[18px] max-w-[30em] text-[1.0625rem] leading-relaxed text-banda-tenue">
              Es la forma en que la cafetería sabe que lo tuyo ya está apartado
              y que vas a pasar por él. Sin fila, sin repetir el pedido y sin
              quedarte sin lo que querías.
            </p>
            <div data-escalon="" className="mt-10 px-2 sm:px-0">
              <Carnet nombre="Marta Rodríguez" codigo="T00000001" rol="Estudiante" />
              <p className="sr-only">Ejemplo de carnet digital.</p>
            </div>
          </div>

          <ol className="min-w-0 flex-[1_1_480px] border-t border-banda-linea">
            {BENEFICIOS.map((b, i) => (
              <li key={b.titulo} data-escalon="" className="flex items-start gap-4 border-b border-banda-linea py-[22px] sm:gap-5">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[color:var(--tk-banda-acento-borde)] bg-[color:var(--tk-banda-acento-fondo)] text-banda-acento"
                >
                  <Icono nombre={b.icono} tamano={22} grosor={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-baseline gap-2.5">
                    <span className="cifra font-mono text-xs font-semibold text-banda-tenue">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-lg font-semibold">{b.titulo}</span>
                  </h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-banda-tenue">{b.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </Revelar>
      </section>

      {/* ───────────── Preguntas ───────────── */}
      <div className="contenedor pb-16 pt-14 md:pt-[72px]">
        <Revelar as="section" id="preguntas" aria-labelledby="h-faq" className="flex scroll-mt-6 flex-wrap gap-6 md:gap-8">
          <h2 id="h-faq" className="titulo-seccion flex-[1_1_280px]">
            Preguntas
          </h2>
          <div className="flex min-w-0 flex-[3_1_600px] flex-col gap-2.5">
            {PREGUNTAS.map((p) => (
              <details key={p.pregunta} data-escalon="" className="group rounded-md border border-linea bg-tarjeta">
                <summary className="flex min-h-14 list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold sm:px-[22px] sm:text-[1.0625rem] [&::-webkit-details-marker]:hidden">
                  {p.pregunta}
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-suave text-enlace transition-transform duration-[var(--tk-dur-media)] ease-[var(--tk-ease)] group-open:rotate-45"
                  >
                    <Icono nombre="mas" tamano={16} grosor={2.4} />
                  </span>
                </summary>
                <p className="max-w-[62ch] px-5 pb-[18px] text-[0.9375rem] leading-relaxed text-tenue sm:px-[22px]">
                  {p.respuesta}
                </p>
              </details>
            ))}
          </div>
        </Revelar>
      </div>
    </>
  );
}

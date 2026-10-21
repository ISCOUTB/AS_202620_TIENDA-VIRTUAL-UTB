import Link from "next/link";
import type { Metadata } from "next";
import { TIENDAS, clasesAcento, clasesTratamiento, type Tienda } from "@/lib/tiendas";
import { FOTOS_LUGAR } from "@/lib/imagenes";
import { formatoHora, formatoPrecio } from "@/lib/formato";
import { productosDe } from "@/lib/catalogo";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Boton } from "@/components/ui/Boton";
import { CampoFoto } from "@/components/tienda/CampoFoto";
import { JsonLd } from "@/components/seo/JsonLd";
import { jsonLdCafeteria, jsonLdFaq, DESCRIPCION_SITIO } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Cafetería del campus: cinco tiendas, un solo pase",
  description: DESCRIPCION_SITIO,
  alternates: { canonical: "/" },
};

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
    texto:
      "Llegas al mostrador, dices tu nombre, pagas y te vas. Sin fila y sin repetir el pedido.",
  },
];

const BENEFICIOS = [
  {
    titulo: "Tus pedidos en un solo lugar",
    texto: "Historial, estado y hora de recogida sin buscar correos.",
  },
  {
    titulo: "Reserva sin hacer fila",
    texto: "Apartas lo que quieres y eliges cuándo pasar por él.",
  },
  {
    titulo: "Existencias honestas",
    texto: "Si algo se agotó, se dice. Cero se imprime como cero.",
  },
  {
    titulo: "Un pase para las cinco tiendas",
    texto: "Antojos, Punto Fit, Alegría y los dos almuerzos, con una sola cuenta.",
  },
  {
    titulo: "Avisos de lo que te gusta",
    texto: "Te contamos cuando vuelve lo que ya habías pedido.",
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

export default function Landing() {
  return (
    <>
      <JsonLd datos={jsonLdCafeteria()} />
      <JsonLd datos={jsonLdFaq(PREGUNTAS)} />

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="sabana">
        <div className="contenedor grid gap-10 pb-24 pt-12 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-32 lg:pt-16">
          <div className="lg:col-span-6">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-3 w-3 rounded-[var(--tk-radio-pill)] bg-ambar" />
              <Etiqueta tono="claro">Cafetería UTB · Campus Cartagena</Etiqueta>
            </div>

            <h1 className="display mt-6 text-superficie">
              Cinco puntos.
              <br />
              Un solo pase.
            </h1>

            <p className="lead mt-8 max-w-[46ch] text-cyan-claro">
              Antojos, Punto Fit, Alegría y los dos almuerzos del campus.
              Consulta qué hay hoy, aparta lo tuyo y recógelo entre clases sin
              hacer fila.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Boton href="/auth/ingresar" variante="ambar" tamano="lg">
                Entrar con tu correo
              </Boton>
              <Boton href="#tiendas" variante="contorno" tamano="lg" className="border-white/40">
                Ver el menú
              </Boton>
            </div>

            <p className="mt-8 max-w-[44ch] font-cuerpo text-[0.875rem] leading-relaxed text-cyan-claro">
              Se paga en el mostrador. La cuenta solo se pide para apartar;
              mirar el menú es libre.
            </p>
          </div>
        </div>
      </section>

      {/* Directorio: la señalética hecha navegación, solapada a la sábana */}
      <div className="contenedor -mt-16 lg:-mt-20">
        <div className="tarjeta mx-auto max-w-[46rem] overflow-hidden shadow-[0_28px_60px_-32px_var(--tk-sombra)]">
          <div className="flex items-baseline justify-between gap-4 border-b border-linea px-5 py-4">
            <span className="font-display text-[1.125rem] font-extrabold tracking-[-0.01em] text-superficie">
              Directorio
            </span>
            <span className="rotulo text-tenue">5 puntos</span>
          </div>

          <ul className="divide-y divide-linea">
            {TIENDAS.map((t, i) => {
              const acento = clasesAcento(t.acento);
              return (
                <li key={t.slug}>
                  <Link
                    href={`/tiendas/${t.slug}`}
                    className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-[var(--tk-dur)] hover:bg-tarjeta-alta"
                  >
                    <span className="rotulo cifra text-tenue">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`h-9 w-[5px] shrink-0 rounded-[var(--tk-radio-pill)] ${acento.punto}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[1.0625rem] font-extrabold tracking-[-0.01em] text-superficie">
                        {t.nombre}
                      </span>
                      <span className="mt-0.5 block truncate font-cuerpo text-[0.8125rem] text-tenue">
                        {t.categoria}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-right font-cuerpo text-[0.8125rem] leading-tight text-tenue sm:block">
                      {formatoHora(t.horario.abre)}
                      <br />
                      {formatoHora(t.horario.cierra)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-display text-[1.25rem] font-bold text-cyan-claro transition-transform duration-[var(--tk-dur)] group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ───────────────────────── El lugar ───────────────────────── */}
      <section aria-labelledby="lugar" className="bg-tinta">
        <div className="contenedor pt-16 lg:pt-20">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="lugar" className="font-display text-[1rem] font-extrabold uppercase tracking-[0.08em] text-superficie">
              El lugar
            </h2>
            <Etiqueta tono="claro">Cafetería UTB</Etiqueta>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {FOTOS_LUGAR.map((foto) => (
              <div key={foto.src} className="relative overflow-hidden rounded-[var(--tk-radio)] bg-navy">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={foto.src}
                  alt={foto.alt}
                  width={480}
                  height={640}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Las tiendas ───────────────────────── */}
      <section id="tiendas" aria-labelledby="tiendas-titulo" className="bg-tinta">
        <div className="contenedor py-16 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Etiqueta tono="claro">Directorio completo</Etiqueta>
              <h2 id="tiendas-titulo" className="titulo-seccion mt-3 text-superficie">
                Lo que hay, tienda por tienda.
              </h2>
            </div>
            <p className="cuerpo max-w-[52ch] text-tenue lg:col-span-5">
              Cada punto tiene su propia carta, su horario y su encargado. Los
              precios de la línea oriental están confirmados; los demás se
              marcan como referencia mientras la tienda los define.
            </p>
          </div>

          <div className="mt-12 flex flex-col gap-6">
            {TIENDAS.map((tienda, i) => (
              <SeccionTienda key={tienda.slug} tienda={tienda} indice={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Cómo pedir ───────────────────────── */}
      <section aria-labelledby="como-pedir" className="bg-navy py-16 lg:py-24">
        <div className="contenedor">
          <Etiqueta tono="claro">Cómo funciona</Etiqueta>
          <h2 id="como-pedir" className="titulo-seccion mt-3 text-superficie">
            Tres pasos y ya estás en el mostrador.
          </h2>

          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {PASOS.map((paso) => (
              <li key={paso.n} className="tarjeta p-6">
                <span className="rotulo cifra block text-ambar">{paso.n}</span>
                <h3 className="mt-5 text-[1.375rem] text-superficie">
                  {paso.titulo}
                </h3>
                <p className="cuerpo mt-3 text-tenue">{paso.texto}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10">
            <Boton href="/auth/crear-cuenta" variante="claro" tamano="lg">
              Crear mi pase
            </Boton>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Tu pase ───────────────────────── */}
      <section aria-labelledby="tu-pase" className="bg-tinta py-16 lg:py-24">
        <div className="contenedor grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Etiqueta tono="claro">La cuenta</Etiqueta>
            <h2 id="tu-pase" className="titulo-seccion mt-3 text-superficie">
              Tu pase no es un usuario más.
            </h2>
            <p className="cuerpo mt-5 max-w-[42ch] text-tenue">
              Es la forma en que la cafetería sabe que lo tuyo ya está apartado
              y que vas a pasar por él. Sin fila, sin repetir el pedido y sin
              quedarte sin lo que querías.
            </p>

            {/* La credencial, como en la app */}
            <div className="credencial mt-8 max-w-[26rem] -rotate-[1.5deg] p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="font-display text-[1.375rem] font-extrabold tracking-[-0.02em] text-deep">
                  UTB
                </span>
                <span className="rotulo text-deep">Carnet digital</span>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-[var(--tk-radio-sm)] bg-deep font-display text-[1.25rem] font-extrabold text-superficie">
                  MA
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-[1.0625rem] font-extrabold text-deep">
                    Marta Rodríguez
                  </p>
                  <p className="cifra mt-0.5 font-cuerpo text-[0.875rem] text-tinta/70">
                    T00000001
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-deep/15 pt-4">
                <span className="rotulo rounded-[var(--tk-radio-pill)] bg-deep px-2.5 py-1 text-superficie">
                  Estudiante
                </span>
                <span className="rotulo text-deep">Cafetería</span>
              </div>
            </div>
          </div>

          <ul className="flex flex-col gap-3 lg:col-span-7">
            {BENEFICIOS.map((b, i) => (
              <li key={b.titulo} className="tarjeta flex gap-4 p-5">
                <span className="rotulo cifra pt-1 text-tenue">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-[1.125rem] font-bold tracking-[-0.01em] text-superficie">
                    {b.titulo}
                  </h3>
                  <p className="cuerpo mt-1 text-tenue">{b.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────────────────── FAQ ───────────────────────── */}
      <section aria-labelledby="preguntas" className="bg-navy py-16 lg:py-24">
        <div className="contenedor grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Etiqueta tono="claro">Preguntas</Etiqueta>
            <h2 id="preguntas" className="titulo-seccion mt-3 text-superficie">
              Lo que suelen preguntar.
            </h2>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-8">
            {PREGUNTAS.map((p) => (
              <details key={p.pregunta} className="tarjeta group p-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-display text-[1.125rem] font-bold tracking-[-0.01em] text-superficie marker:hidden">
                  {p.pregunta}
                  <span
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-[1.25rem] leading-none text-cyan transition-transform duration-[var(--tk-dur)] group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="cuerpo mt-3 max-w-[62ch] text-tenue">
                  {p.respuesta}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Cierre ───────────────────────── */}
      <section className="sabana">
        <div className="contenedor flex flex-col items-start gap-8 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div>
            <h2 className="text-[clamp(2rem,1.4rem+3vw,3.5rem)] text-superficie">
              ¿Almorzamos?
            </h2>
            <p className="lead mt-3 max-w-[40ch] text-cyan-claro">
              Entra con tu correo institucional y aparta lo tuyo en menos de un
              minuto.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Boton href="/auth/ingresar" variante="ambar" tamano="lg">
              Entrar
            </Boton>
            <Boton
              href="/auth/crear-cuenta"
              variante="contorno"
              tamano="lg"
              className="border-white/40"
            >
              Crear cuenta
            </Boton>
          </div>
        </div>
      </section>
    </>
  );
}

/** Una tienda como tarjeta con barra de acento + ficha. */
function SeccionTienda({ tienda, indice }: { tienda: Tienda; indice: number }) {
  const acento = clasesAcento(tienda.acento);
  const productos = productosDe(tienda.slug);
  const desde = productos.length
    ? Math.min(...productos.map((p) => p.precioCentavos))
    : null;

  return (
    <article
      aria-labelledby={`tienda-${tienda.slug}`}
      className={`tarjeta grid overflow-hidden border-l-4 lg:grid-cols-12 ${acento.borde}`}
    >
      <div className="p-6 lg:col-span-5 lg:p-7">
        <div className="flex items-center gap-3">
          <span className="rotulo cifra text-tenue">
            {String(indice + 1).padStart(2, "0")}
          </span>
          <span className="rotulo rounded-[var(--tk-radio-pill)] bg-tarjeta-alta px-2.5 py-1 text-cyan-claro">
            {tienda.categoria}
          </span>
        </div>

        <h3
          id={`tienda-${tienda.slug}`}
          className={`mt-4 font-extrabold tracking-[-0.02em] text-superficie ${clasesTratamiento(
            tienda.tratamiento,
            "grande",
          )}`}
        >
          {tienda.nombre}
        </h3>

        <p className="mt-3 font-cuerpo text-[1.0625rem] leading-snug text-cyan-claro">
          {tienda.tagline}
        </p>
        <p className="cuerpo mt-4 max-w-[46ch] text-tenue">
          {tienda.descripcion}
        </p>

        <ul className="mt-6 flex flex-col gap-2">
          {tienda.destacados.map((d) => (
            <li key={d} className="flex items-start gap-3 font-cuerpo text-[0.9375rem] text-superficie">
              <span
                aria-hidden="true"
                className={`mt-[0.55rem] h-[6px] w-[6px] shrink-0 rounded-[var(--tk-radio-pill)] ${acento.punto}`}
              />
              {d}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Boton href={`/tiendas/${tienda.slug}`} variante="contorno">
            Ver la carta
          </Boton>
          <p className="font-cuerpo text-[0.8125rem] leading-relaxed text-tenue">
            {desde !== null ? `${productos.length} productos · desde ${formatoPrecio(desde)}` : "Carta en preparación"}
          </p>
        </div>

        {tienda.nota ? (
          <p className="mt-4 font-cuerpo text-[0.8125rem] leading-relaxed text-tenue">
            {tienda.nota}
          </p>
        ) : null}
      </div>

      <div className="p-3 lg:col-span-7 lg:p-4">
        <CampoFoto
          acento={tienda.acento}
          slug={tienda.slug}
          nombre={tienda.nombre}
        />
      </div>
    </article>
  );
}

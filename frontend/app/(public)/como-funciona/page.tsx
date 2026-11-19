import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { jsonLdFaq } from "@/lib/seo";
import { Revelar } from "@/components/motion/Revelar";
import { Boton } from "@/components/ui/Boton";
import { Icono, type NombreIcono } from "@/components/ui/Icono";
import { Carnet } from "@/components/auth/Carnet";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "Aparta en las cinco tiendas de la cafetería con tu correo institucional, elige la hora y paga al recoger. Pasos, la cuenta y preguntas frecuentes.",
  alternates: { canonical: "/como-funciona" },
};

/*
 * Módulo «Cómo funciona» (SPEC v5 §3): todo lo que explica el servicio, en
 * su propia página — los pasos, la cuenta y las preguntas frecuentes —, fuera
 * de la portada, que queda solo para anuncios y recomendaciones.
 */

const PASOS = [
  {
    n: "01",
    titulo: "Entra con tu correo",
    texto:
      "Tu cuenta es tu correo institucional. Con ella ves precios, existencias y tus reservas.",
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
    titulo: "Una cuenta para las cinco tiendas",
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

export default function ComoFunciona() {
  return (
    <>
      <JsonLd datos={jsonLdFaq(PREGUNTAS)} />

      {/* ───────────── Cabecera + los tres pasos ───────────── */}
      <section aria-labelledby="titular" className="sabana bajo-nav relative isolate">
        <span aria-hidden="true" className="orbe -right-24 -top-32 h-[420px] w-[420px] [background:var(--tk-orbe-1)]" />
        <span aria-hidden="true" className="orbe -bottom-40 left-[30%] h-[360px] w-[360px] [background:var(--tk-orbe-2)]" />
        <Revelar inmediato className="contenedor pb-12 pt-6 md:pb-16 md:pt-10">
          <p data-escalon="" className="rotulo opacity-85">Ayuda</p>
          <h1 id="titular" data-escalon="" className="titulo mt-3 max-w-[16ch]">
            Aparta y recoge sin fila
          </h1>
          <p data-escalon="" className="lead mt-4 max-w-[40ch] opacity-90">
            Tres pasos, sin fila y sin repetir el pedido.
          </p>
          <ol className="mt-10 grid gap-3 sm:grid-cols-3">
            {PASOS.map((paso) => (
              <li key={paso.n} data-escalon="" className="cristal flex flex-col p-6">
                <span aria-hidden="true" className="cifra font-display text-3xl font-extrabold opacity-90">
                  {paso.n}
                </span>
                <h2 className="mt-6 tipo-accion font-bold">
                  <span className="sr-only">Paso {Number(paso.n)}: </span>
                  {paso.titulo}
                </h2>
                <p className="mt-2 text-sm leading-relaxed opacity-90">{paso.texto}</p>
              </li>
            ))}
          </ol>
          <div data-escalon="" className="mt-8">
            <Boton href="/tiendas" variante="claro">
              Empezar a apartar
            </Boton>
          </div>
        </Revelar>
      </section>

      {/* ───────────── La cuenta: banda azul profundo con el carnet ───────────── */}
      <section
        aria-labelledby="h-cuenta"
        className="relative isolate mx-2.5 mt-14 overflow-hidden rounded-xl bg-banda text-banda-tinta [--tk-foco:var(--tk-banda-acento)] sm:mx-4 md:mt-20"
      >
        <span aria-hidden="true" className="orbe -left-32 top-10 h-[460px] w-[460px] [background:var(--tk-orbe-1)]" />
        <span aria-hidden="true" className="orbe -bottom-32 right-[8%] h-[380px] w-[380px] [background:var(--tk-orbe-2)]" />
        <Revelar className="contenedor flex flex-wrap items-center gap-x-[72px] gap-y-14 py-14 md:py-[88px]">
          <div className="min-w-0 flex-[1_1_420px]">
            <p data-escalon="" className="rotulo text-banda-acento">
              La cuenta
            </p>
            <h2 id="h-cuenta" data-escalon="" className="titulo mt-3.5">
              Tu cuenta no es
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

          <ol className="cristal min-w-0 flex-[1_1_480px] px-5 py-2 sm:px-7">
            {BENEFICIOS.map((b, i) => (
              <li key={b.titulo} data-escalon="" className="flex items-start gap-4 border-b border-banda-linea py-[22px] last:border-b-0 sm:gap-5">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-[color:var(--tk-banda-acento-borde)] text-banda-acento"
                >
                  <Icono nombre={b.icono} tamano={20} grosor={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-baseline gap-2.5">
                    <span className="cifra font-display text-[0.6875rem] font-semibold text-banda-tenue">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="tipo-accion font-bold">{b.titulo}</span>
                  </h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-banda-tenue">{b.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </Revelar>
      </section>

      {/* ───────────── Preguntas ───────────── */}
      <div className="contenedor pb-20 pt-14 md:pb-28 md:pt-20">
        <Revelar as="section" aria-labelledby="h-faq" className="grid gap-8 md:grid-cols-[1fr_2fr] md:gap-16">
          <div>
            <h2 id="h-faq" className="tipo-bloque">
              Preguntas
            </h2>
            <p className="mt-3 max-w-[30ch] text-sm text-tenue">
              Lo que más nos preguntan antes del primer pedido.
            </p>
          </div>
          <div className="vidrio min-w-0 px-5 py-1 sm:px-7">
            {PREGUNTAS.map((p) => (
              <details key={p.pregunta} data-escalon="" className="group border-b border-linea last:border-b-0">
                <summary className="flex min-h-14 list-none items-center justify-between gap-4 py-4 text-[0.9375rem] font-semibold [&::-webkit-details-marker]:hidden">
                  {p.pregunta}
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-tinta transition-transform duration-[var(--tk-dur-media)] ease-[var(--tk-ease)] group-open:rotate-45"
                  >
                    <Icono nombre="mas" tamano={18} grosor={1.6} />
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-5 text-sm leading-relaxed text-tenue">{p.respuesta}</p>
              </details>
            ))}
          </div>
        </Revelar>
      </div>
    </>
  );
}

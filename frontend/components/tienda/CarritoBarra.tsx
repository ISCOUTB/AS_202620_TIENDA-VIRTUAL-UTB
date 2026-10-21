"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCarrito,
  cambiarCantidad,
  quitar,
  vaciar,
  elegirHora,
  totalCentavos,
  unidades,
  EVENTO_ABRIR_PEDIDO,
} from "@/lib/carrito";
import { productoPorId } from "@/lib/catalogo";
import { nombreTienda, acentoDeTienda, clasesAcento } from "@/lib/tiendas";
import { formatoPrecio, franjasRecogida } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";
import { crearPedido, type ResultadoPedido } from "@/lib/pedidos";
import { Boton } from "@/components/ui/Boton";
import { Badge } from "@/components/ui/Badge";
import { Etiqueta } from "@/components/ui/Etiqueta";

/**
 * Barra de pedido + panel de confirmación (design/SPEC.md v3 §2.4).
 *
 * Aparece solo cuando hay unidades en el carrito. El panel muestra las
 * líneas agrupadas por tienda (el carrito es global), deja elegir la franja
 * de recogida y confirma contra `POST /orders`.
 *
 * Cualquier pantalla puede pedir que se abra con `abrirPedido()` (lo usa la
 * barra inferior de móvil).
 *
 * Regla de honestidad: si el endpoint no existe todavía, la confirmación lo
 * dice ("modo demostración") en lugar de inventar un número de pedido.
 */
export function CarritoBarra() {
  const { carrito, cargando } = useCarrito();
  const { sesion } = useSesion();
  const router = useRouter();
  const ruta = usePathname();

  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Las franjas se calculan al abrir el panel, no en el render: así la hora
  // ofrecida es la del momento real y no la del primer render.
  const [franjas, setFranjas] = useState<string[]>([]);

  const n = unidades(carrito);
  const total = totalCentavos(carrito);
  const hora = carrito.horaRecogida;

  useEffect(() => {
    if (abierto) setFranjas(franjasRecogida(8));
  }, [abierto]);

  // Apertura remota desde la barra inferior de navegación.
  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener(EVENTO_ABRIR_PEDIDO, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_PEDIDO, abrir);
  }, []);

  const muestra = carrito.lineas.some(
    (l) => productoPorId(l.productoId)?.esMuestra,
  );

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  // El panel también sigue montado cuando el carrito acaba de vaciarse por
  // una reserva confirmada: si no, la confirmación desaparecería junto con
  // las últimas unidades.
  if (cargando) return null;
  if (n === 0 && !resultado) return null;

  async function confirmar() {
    setError(null);
    if (!sesion) {
      router.push(`/auth/ingresar?next=${encodeURIComponent(ruta)}`);
      return;
    }
    if (!hora) {
      setError("Elige la hora a la que vas a pasar por el pedido.");
      return;
    }
    setEnviando(true);
    const r = await crearPedido(carrito, hora);
    setEnviando(false);
    if (r.estado === "error") {
      setError(r.mensaje);
      return;
    }
    setResultado(r);
    vaciar();
  }

  return (
    <>
      {/* Barra flotante: solo con unidades. Tras confirmar, el panel sigue
          abierto mostrando la confirmación, pero la barra ya no cuenta nada. */}
      {n > 0 ? (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-3 lg:bottom-5">
          <div className="tarjeta flex w-full max-w-[32rem] items-center justify-between gap-4 px-4 py-3 shadow-[0_22px_44px_-22px_var(--tk-sombra)]">
            <div className="flex items-baseline gap-3">
              <span className="cifra flex h-8 min-w-8 items-center justify-center rounded-[var(--tk-radio-pill)] bg-ambar px-1.5 font-display text-[0.875rem] font-extrabold text-tinta">
                {n}
              </span>
              <span className="font-cuerpo text-[0.9375rem] text-cyan-claro">
                {n === 1 ? "unidad apartada" : "unidades apartadas"}
              </span>
              <span className="cifra hidden font-display text-[1.125rem] font-extrabold text-superficie sm:inline">
                {formatoPrecio(total)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="gradiente-marca rounded-[var(--tk-radio-pill)] px-5 py-2.5 font-display text-[0.9375rem] font-semibold text-superficie transition-[filter] duration-[var(--tk-dur)] hover:brightness-110"
            >
              Ver pedido
            </button>
          </div>
        </div>
      ) : null}

      {abierto ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/80 backdrop-blur-sm sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-pedido"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92svh] w-full max-w-[36rem] overflow-y-auto rounded-t-[var(--tk-radio-sabana)] border border-linea bg-tarjeta p-6 text-superficie sm:rounded-[var(--tk-radio-sabana)] sm:p-8"
          >
            {resultado ? (
              <Confirmacion
                resultado={resultado}
                hora={hora}
                alCerrar={() => {
                  setResultado(null);
                  setAbierto(false);
                }}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Etiqueta>Tu pedido</Etiqueta>
                    <h2
                      id="titulo-pedido"
                      className="mt-2 font-display text-[1.75rem] font-extrabold leading-[1.02] tracking-[-0.02em] text-superficie"
                    >
                      {n === 1 ? "1 unidad" : `${n} unidades`}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    className="mt-1 font-display text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-tenue underline underline-offset-4"
                  >
                    Cerrar
                  </button>
                </div>

                <ul className="mt-6 flex flex-col gap-3">
                  {carrito.lineas.map((linea) => {
                    const p = productoPorId(linea.productoId);
                    if (!p) return null;
                    const acento = clasesAcento(acentoDeTienda(p.tienda));
                    return (
                      <li
                        key={linea.productoId}
                        className={`tarjeta flex items-start justify-between gap-4 border-l-4 bg-tarjeta-alta p-4 ${acento.borde}`}
                      >
                        <div className="min-w-0">
                          {/* La presentación es imprescindible cuando el mismo
                              plato existe entero y medio: sin ella el panel
                              mostraría dos líneas idénticas con precios
                              distintos. */}
                          <p className="font-display text-[0.9375rem] font-bold text-superficie">
                            {p.nombre}
                            {p.presentacion ? (
                              <span className="ml-2 font-cuerpo text-[0.75rem] font-normal uppercase tracking-[0.08em] text-tenue">
                                {p.presentacion}
                              </span>
                            ) : null}
                          </p>
                          <p className="font-cuerpo text-[0.8125rem] text-tenue">
                            {formatoPrecio(p.precioCentavos)} c/u ·{" "}
                            {nombreTienda(p.tienda)}
                          </p>
                          {p.esMuestra ? (
                            <span className="mt-1.5 inline-block">
                              <Badge tono="muestra">Referencia</Badge>
                            </span>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidad(linea.productoId, linea.cantidad - 1)
                            }
                            aria-label={`Quitar una unidad de ${p.nombre}`}
                            className="flex h-8 w-8 items-center justify-center rounded-[var(--tk-radio-pill)] border border-borde font-display text-[1rem] font-bold text-superficie"
                          >
                            −
                          </button>
                          <span className="cifra w-6 text-center font-display text-[0.9375rem] font-bold text-superficie">
                            {linea.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              cambiarCantidad(linea.productoId, linea.cantidad + 1)
                            }
                            disabled={linea.cantidad >= p.existencias}
                            aria-label={`Añadir una unidad de ${p.nombre}`}
                            className="flex h-8 w-8 items-center justify-center rounded-[var(--tk-radio-pill)] border border-borde font-display text-[1rem] font-bold text-superficie disabled:opacity-30"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => quitar(linea.productoId)}
                            className="ml-1 font-cuerpo text-[0.75rem] text-tenue underline underline-offset-4"
                          >
                            Quitar
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Hora de recogida */}
                <fieldset className="mt-6">
                  <legend className="rotulo text-tenue">
                    ¿A qué hora pasas?
                  </legend>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {franjas.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => elegirHora(f)}
                        aria-pressed={hora === f}
                        className={[
                          "cifra rounded-[var(--tk-radio-pill)] py-2 font-display text-[0.875rem] font-semibold transition-colors",
                          hora === f
                            ? "gradiente-marca text-superficie"
                            : "bg-tarjeta-alta text-superficie hover:bg-linea",
                        ].join(" ")}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 font-cuerpo text-[0.8125rem] text-tenue">
                    La hora se acuerda con el mostrador. Si llegas tarde, el
                    pedido sigue apartado hasta el cierre.
                  </p>
                </fieldset>

                <div className="mt-6 flex items-baseline justify-between border-t border-linea pt-4">
                  <span className="rotulo text-tenue">Total</span>
                  <span className="cifra font-display text-[1.5rem] font-extrabold text-superficie">
                    {formatoPrecio(total)}
                  </span>
                </div>

                <p className="mt-2 font-cuerpo text-[0.8125rem] leading-relaxed text-tenue">
                  {muestra
                    ? "Incluye precios de referencia. La tienda los confirma al entregar. "
                    : ""}
                  El pago es en el mostrador, al recoger.
                </p>

                {error ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-[var(--tk-radio-sm)] border-l-4 border-error bg-error/10 px-3 py-2 font-cuerpo text-[0.875rem] text-error"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col items-center gap-3">
                  <Boton
                    variante="ambar"
                    tamano="lg"
                    bloque
                    onClick={confirmar}
                    disabled={enviando}
                  >
                    {enviando
                      ? "Confirmando…"
                      : sesion
                        ? "Confirmar reserva"
                        : "Entrar y confirmar"}
                  </Boton>
                  <button
                    type="button"
                    onClick={() => {
                      vaciar();
                      setAbierto(false);
                    }}
                    className="font-cuerpo text-[0.8125rem] text-tenue underline underline-offset-4"
                  >
                    Vaciar el carrito
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Confirmacion({
  resultado,
  hora,
  alCerrar,
}: {
  resultado: ResultadoPedido;
  hora: string | null;
  alCerrar: () => void;
}) {
  if (resultado.estado === "real") {
    return (
      <div>
        <Badge tono="abierto">Reserva registrada</Badge>
        <h2 className="mt-4 font-display text-[2rem] font-extrabold leading-[1.02] text-superficie">
          Pedido #{resultado.pedido.id}
        </h2>
        <p className="cuerpo mt-3 text-tenue">
          Quedó apartado{hora ? ` para las ${hora}` : ""}. Pasa por el
          mostrador, di tu nombre y paga ahí.
        </p>
        <div className="mt-6">
          <Boton href="/cuenta" variante="solido" bloque>
            Ver en mi pase
          </Boton>
        </div>
        <button
          type="button"
          onClick={alCerrar}
          className="mt-4 w-full font-cuerpo text-[0.8125rem] text-tenue underline underline-offset-4"
        >
          Seguir mirando
        </button>
      </div>
    );
  }

  return (
    <div>
      <Badge tono="muestra">Modo demostración</Badge>
      <h2 className="mt-4 font-display text-[2rem] font-extrabold leading-[1.02] text-superficie">
        Reserva simulada.
      </h2>
      <p className="cuerpo mt-3 text-tenue">
        No hay un servidor de pedidos conectado en este entorno, así que no se
        creó nada en el servidor. Tu carrito se vació para que puedas seguir
        probando el flujo.
      </p>
      <div className="mt-6">
        <Boton onClick={alCerrar} variante="solido" bloque>
          Entendido
        </Boton>
      </div>
    </div>
  );
}

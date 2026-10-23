"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCarrito,
  cambiarCantidad,
  vaciar,
  elegirHora,
  totalCentavos,
  unidades,
  EVENTO_ABRIR_PEDIDO,
} from "@/lib/carrito";
import { productoPorId } from "@/lib/catalogo";
import { nombreTienda } from "@/lib/tiendas";
import { formatoHora, formatoPrecio, franjasRecogida } from "@/lib/formato";
import { useSesion } from "@/lib/sesion";
import { crearPedido, type ResultadoPedido } from "@/lib/pedidos";
import { gsap, useGSAP, CONDICIONES, MOVIMIENTO } from "@/lib/movimiento";
import { Boton } from "@/components/ui/Boton";
import { Badge } from "@/components/ui/Badge";
import { Icono } from "@/components/ui/Icono";
import { MarcadorFoto } from "./MarcadorFoto";
import { Cantidad } from "./Cantidad";

/**
 * Carrito y reserva (artefacto «A · Carrito y reserva»): hoja inferior en
 * móvil, panel lateral derecho desde `lg`.
 *
 * - Cualquier pantalla lo abre con `abrirPedido()` (evento
 *   `EVENTO_ABRIR_PEDIDO`): nav superior, nav inferior, barra flotante y el
 *   resumen de la tienda.
 * - Líneas con control de cantidad, franja de recogida (radios nativos),
 *   total y confirmación contra `POST /orders` (lib/pedidos.ts).
 * - Regla de honestidad: si el endpoint no existe la confirmación lo dice
 *   («Modo demostración») en lugar de inventar un número de pedido.
 * - Entra y sale con GSAP (deslizamiento + velo); con movimiento reducido,
 *   aparece y desaparece sin tween. Foco atrapado mientras está abierto y
 *   devuelto al control que lo abrió al cerrar.
 */
export function PanelPedido() {
  const { carrito } = useCarrito();
  const { sesion } = useSesion();
  const router = useRouter();
  const ruta = usePathname();

  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Las franjas se calculan al abrir, no en el render: así la hora ofrecida
  // es la del momento real y no la del primer render.
  const [franjas, setFranjas] = useState<string[]>([]);

  const raiz = useRef<HTMLDivElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);

  const n = unidades(carrito);
  const total = totalCentavos(carrito);
  const hora = carrito.horaRecogida;
  const muestra = carrito.lineas.some((l) => productoPorId(l.productoId)?.esMuestra);
  const tiendas = Array.from(
    new Set(
      carrito.lineas
        .map((l) => productoPorId(l.productoId)?.tienda)
        .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    ),
  ).map(nombreTienda);

  const cerrar = useCallback(() => setAbierto(false), []);

  useEffect(() => {
    const abrir = () => {
      focoPrevio.current = document.activeElement as HTMLElement | null;
      setAbierto(true);
    };
    window.addEventListener(EVENTO_ABRIR_PEDIDO, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_PEDIDO, abrir);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    setMontado(true);
    setFranjas(franjasRecogida(6));
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [abierto]);

  // Escape cierra; Tab no sale del panel.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        return;
      }
      if (e.key !== "Tab" || !hoja.current) return;
      const enfocables = hoja.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  const alTerminarSalida = useCallback(() => {
    setMontado(false);
    setResultado(null);
    setError(null);
    focoPrevio.current?.focus?.();
  }, []);

  useGSAP(
    () => {
      if (!montado) return;
      const velo = raiz.current?.querySelector("[data-velo]");
      const panel = hoja.current;
      if (!velo || !panel) return;
      const mm = gsap.matchMedia();

      mm.add(
        { ...CONDICIONES, ancho: "(min-width: 1024px)" },
        (contexto) => {
          const { movimiento, ancho } = contexto.conditions as {
            movimiento: boolean;
            ancho: boolean;
          };
          const eje = ancho ? { xPercent: 100 } : { yPercent: 100 };
          const reposo = ancho ? { xPercent: 0 } : { yPercent: 0 };
          const { duracion, ease, salida, easeSalida } = MOVIMIENTO.panel;

          if (abierto) {
            if (movimiento) {
              gsap.fromTo(velo, { opacity: 0 }, { opacity: 1, duration: duracion, ease });
              gsap.fromTo(panel, eje, { ...reposo, duration: duracion + 0.08, ease });
            }
            botonCerrar.current?.focus();
          } else if (movimiento) {
            gsap.to(velo, { opacity: 0, duration: salida, ease: easeSalida });
            gsap.to(panel, { ...eje, duration: salida, ease: easeSalida, onComplete: alTerminarSalida });
          } else {
            alTerminarSalida();
          }
        },
      );
    },
    // revertOnUpdate: al cambiar de abierto a cerrado se deshace el tween de
    // entrada (el panel queda en reposo) y el de salida parte de ahí.
    { dependencies: [abierto, montado], scope: raiz, revertOnUpdate: true },
  );

  if (!montado) return null;

  async function confirmar() {
    setError(null);
    if (!sesion) {
      router.push(`/auth/ingresar?next=${encodeURIComponent(ruta)}`);
      setAbierto(false);
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

  const etiquetaConfirmar = enviando
    ? "Apartando…"
    : !sesion
      ? "Entrar y apartar"
      : hora
        ? `Apartar para las ${formatoHora(hora)}`
        : "Apartar";

  return (
    <div ref={raiz} className="fixed inset-0 z-[70]">
      <div data-velo="" aria-hidden="true" onClick={cerrar} className="absolute inset-0 bg-velo" />

      <div
        ref={hoja}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-pedido"
        className="absolute inset-x-0 bottom-0 max-h-[92svh] overflow-y-auto rounded-t-lg bg-tarjeta px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2.5 text-tinta shadow-hoja lg:inset-y-0 lg:left-auto lg:max-h-none lg:w-[440px] lg:rounded-none lg:p-7"
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-[5px] w-11 rounded-pill bg-linea lg:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="titulo-pedido" className="font-display text-[1.625rem] font-semibold lg:text-[1.875rem]">
              {resultado ? "Listo" : "Tu pedido"}
            </h2>
            {!resultado && n > 0 ? (
              <p className="mt-0.5 text-sm text-tenue">
                {n} {n === 1 ? "unidad" : "unidades"} · {tiendas.join(", ")}
              </p>
            ) : null}
          </div>
          <button
            ref={botonCerrar}
            type="button"
            onClick={cerrar}
            aria-label="Cerrar el pedido"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-suave text-tinta"
          >
            <Icono nombre="cerrar" tamano={18} grosor={2.2} />
          </button>
        </div>

        {resultado ? (
          <Confirmacion resultado={resultado} hora={hora} alCerrar={cerrar} />
        ) : n === 0 ? (
          <div className="py-10 text-center">
            <p className="font-semibold">Todavía no agregas nada.</p>
            <p className="mx-auto mt-1.5 max-w-[34ch] text-sm text-tenue">
              Puedes mezclar tiendas en un mismo pedido y elegir la hora en la
              que pasas.
            </p>
            <div className="mt-5 flex justify-center">
              <Boton href="/#tiendas" variante="suave" onClick={cerrar}>
                Ver las tiendas
              </Boton>
            </div>
          </div>
        ) : (
          <>
            <ul className="mt-4">
              {carrito.lineas.map((linea) => {
                const p = productoPorId(linea.productoId);
                if (!p) return null;
                const nombre = p.presentacion
                  ? `${p.nombre} · ${p.presentacion.toLowerCase()}`
                  : p.nombre;
                return (
                  <li key={linea.productoId} className="flex items-center gap-3 border-b border-linea py-3">
                    <MarcadorFoto slug={p.tienda} tamanoIcono={20} className="h-12 w-12 shrink-0 rounded-xs lg:h-14 lg:w-14" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] font-semibold leading-snug">{nombre}</p>
                      <p className="cifra mt-0.5 text-[0.8125rem] text-tenue">
                        {formatoPrecio(p.precioCentavos * linea.cantidad)} · {nombreTienda(p.tienda)}
                      </p>
                      {p.esMuestra ? (
                        <Badge tono="muestra" className="mt-1">
                          Referencia
                        </Badge>
                      ) : null}
                    </div>
                    <Cantidad
                      variante="linea"
                      cantidad={linea.cantidad}
                      nombre={nombre}
                      maximo={p.existencias}
                      alRestar={() => cambiarCantidad(linea.productoId, linea.cantidad - 1)}
                      alSumar={() => cambiarCantidad(linea.productoId, linea.cantidad + 1)}
                    />
                  </li>
                );
              })}
            </ul>

            <fieldset className="mt-6">
              <legend className="text-base font-bold">¿A qué hora pasas?</legend>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {franjas.map((f) => (
                  <label key={f} className="relative">
                    <input
                      type="radio"
                      name="hora-recogida"
                      value={f}
                      checked={hora === f}
                      onChange={() => elegirHora(f)}
                      className="peer sr-only"
                    />
                    <span className="cifra flex h-12 items-center justify-center rounded-sm border-[1.5px] border-linea text-sm font-bold transition-colors duration-[var(--tk-dur)] peer-checked:border-primario peer-checked:bg-primario peer-checked:text-sobre-primario peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--tk-foco)] hover:border-borde">
                      {formatoHora(f)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 flex items-start gap-2.5 rounded-sm bg-suave px-3.5 py-3 text-[0.8125rem] leading-relaxed text-tenue lg:text-sm">
              <Icono nombre="info" tamano={18} className="mt-0.5 shrink-0" />
              <span>
                {muestra ? "Incluye precios de referencia: la tienda los confirma al entregar. " : ""}
                Pagas en el mostrador al recoger. Llegas, dices tu nombre y te
                vas.
              </span>
            </div>

            <div className="mb-3 mt-5 flex items-baseline justify-between">
              <span className="text-[0.9375rem] text-tenue">Total a pagar</span>
              <span className="cifra text-2xl font-bold lg:text-[1.75rem]">{formatoPrecio(total)}</span>
            </div>

            {error ? (
              <p role="alert" className="mb-3 rounded-sm bg-error-suave px-3.5 py-2.5 text-sm text-error">
                {error}
              </p>
            ) : null}

            <Boton variante="primario" tamano="lg" bloque cuadrado onClick={confirmar} disabled={enviando}>
              {etiquetaConfirmar}
            </Boton>

            <button
              type="button"
              onClick={() => {
                vaciar();
                cerrar();
              }}
              className="mt-2 min-h-11 w-full text-sm font-semibold text-tenue underline underline-offset-4"
            >
              Vaciar el pedido
            </button>
          </>
        )}
      </div>
    </div>
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
      <div className="mt-5">
        <Badge tono="abierto">
          <Icono nombre="check" tamano={14} grosor={2.6} />
          Reserva registrada
        </Badge>
        <p className="mt-4 font-display text-[2rem] font-semibold leading-tight">
          Pedido #{resultado.pedido.id}
        </p>
        <p className="mt-2 text-tenue">
          Quedó apartado{hora ? ` para las ${formatoHora(hora)}` : ""}. Pasa por
          el mostrador, di tu nombre y paga ahí.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Boton href="/cuenta" variante="primario" tamano="lg" bloque cuadrado onClick={alCerrar}>
            Ver en mi pase
          </Boton>
          <Boton variante="texto" bloque onClick={alCerrar}>
            Seguir mirando
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <Badge tono="muestra">Modo demostración</Badge>
      <p className="mt-4 font-display text-[2rem] font-semibold leading-tight">Reserva simulada.</p>
      <p className="mt-2 text-tenue">
        No hay un servidor de pedidos conectado en este entorno, así que no se
        creó nada en el servidor. Tu pedido se vació para que puedas seguir
        probando el flujo.
      </p>
      <div className="mt-6">
        <Boton onClick={alCerrar} variante="primario" tamano="lg" bloque cuadrado>
          Entendido
        </Boton>
      </div>
    </div>
  );
}

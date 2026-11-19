"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TIENDAS } from "@/lib/tiendas";
import { useSesion, cerrarSesion } from "@/lib/sesion";
import { useCarrito, unidades, abrirPedido } from "@/lib/carrito";
import { LOGO } from "@/lib/imagenes";
import { gsap, useGSAP, CONDICIONES, MOVIMIENTO } from "@/lib/movimiento";
import { Icono } from "@/components/ui/Icono";
import { LogoTienda } from "@/components/tienda/LogoTienda";
import { BotonTema } from "./BotonTema";
import { ContadorPedido } from "./ContadorPedido";
import { ReservasRapidas } from "./ReservasRapidas";

/**
 * Barra superior (SPEC v5 §2.7): cinta azul de mensaje y, debajo, una cápsula
 * de vidrio que flota con margen: logo a la izquierda, menú centrado en el
 * azul de marca y pedido, tema e «Ingresar» a la derecha. Es `sticky`: se
 * esconde al bajar y reaparece en cuanto el usuario sube. Bajo `lg` los enlaces se recogen en un menú desplegable animado con
 * GSAP; la navegación principal de móvil es `NavInferior`.
 */

/** A partir de cuántos píxeles de scroll la barra puede esconderse. */
const UMBRAL_OCULTAR = 480;

const SECCIONES = [
  // Cada sección es su propia página (módulo); ninguna salta a un ancla.
  { href: "/", nombre: "Inicio" },
  { href: "/tiendas", nombre: "Tiendas" },
  { href: "/como-funciona", nombre: "Cómo funciona" },
  { href: "/pedidos", nombre: "Mis pedidos" },
];

export function Nav() {
  const ruta = usePathname();
  const { sesion } = useSesion();
  const { carrito } = useCarrito();
  const n = unidades(carrito);
  const enTienda = ruta.startsWith("/tiendas/");

  // `abierto` = lo que pidió el usuario; `montado` = el menú sigue en el DOM
  // mientras dura la animación de salida.
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const cerrar = useCallback(() => setAbierto(false), []);

  // Barra que se esconde al bajar y vuelve al subir. Se lee el scroll una vez
  // por fotograma (rAF) para no recalcular en cada evento, y nunca se esconde
  // con el menú abierto.
  const [oculta, setOculta] = useState(false);
  useEffect(() => {
    let ultimoY = window.scrollY;
    let pendiente = false;
    const alDesplazar = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        // 6 px de tolerancia: el rebote del scroll táctil no la hace parpadear.
        if (Math.abs(y - ultimoY) > 6) {
          setOculta(y > UMBRAL_OCULTAR && y > ultimoY);
          ultimoY = y;
        }
        pendiente = false;
      });
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  // Publica el estado de la barra en <html> para que lo fijo bajo ella (las
  // pestañas de la carta) suba cuando se esconde, sin dejar un hueco.
  const barraOculta = oculta && !abierto;
  useEffect(() => {
    document.documentElement.dataset.barra = barraOculta ? "oculta" : "visible";
  }, [barraOculta]);

  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

  useEffect(() => {
    if (abierto) setMontado(true);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        botonMenu.current?.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <>
      <header
        data-oculta={barraOculta ? "si" : undefined}
        className="barra-sitio sticky top-0 z-[60]"
      >
        {/* Cinta de mensaje: lo esencial del servicio en una línea. */}
        <p className="flex h-[var(--tk-alto-cinta)] items-center justify-center bg-cinta px-4 text-center tipo-micro text-sobre-primario">
          <span className="truncate">
            Aparta sin fila<span aria-hidden="true" className="mx-2.5 opacity-60">·</span>
            Paga en el mostrador<span aria-hidden="true" className="mx-2.5 hidden opacity-60 sm:inline">·</span>
            <span className="hidden sm:inline">Cinco tiendas, una sola cuenta</span>
          </span>
        </p>

        {/* Cápsula de vidrio que flota con margen sobre el contenido. */}
        <div className="px-2.5 pt-2.5 sm:px-4">
        <div className="capsula relative mx-auto flex h-[var(--tk-alto-nav)] max-w-[calc(var(--tk-ancho)+2rem)] items-center gap-2 pl-4 pr-1.5 sm:gap-2.5 sm:pl-6">
          <Link href="/" className="flex min-h-11 shrink-0 items-center" aria-label="Tienda Virtual UTB, inicio">
            <Image
              src={LOGO.src}
              alt=""
              width={LOGO.ancho}
              height={LOGO.alto}
              priority
              className="h-[26px] w-auto [filter:var(--tk-logo-filtro)] sm:h-[30px]"
            />
          </Link>

          {/* Menú centrado sobre la barra (como el catálogo de referencia),
              independiente del ancho del logo y de los botones. */}
          {enTienda ? (
            <Link
              href="/tiendas"
              className="enlace-nav hidden gap-1.5 md:absolute md:left-1/2 md:inline-flex md:-translate-x-1/2"
            >
              <Icono nombre="atras" tamano={16} grosor={2.2} />
              Todas las tiendas
            </Link>
          ) : (
            <nav aria-label="Secciones" className="hidden lg:absolute lg:left-1/2 lg:block lg:-translate-x-1/2">
              <ul className="flex items-center gap-[1.625rem]">
                {SECCIONES.map((s) => (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      aria-current={(s.href === "/" ? ruta === "/" : ruta.startsWith(s.href)) ? "page" : undefined}
                      className="enlace-nav"
                    >
                      {s.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={abrirPedido}
            aria-haspopup="dialog"
            title="Tu pedido"
            aria-label={`Tu pedido${n > 0 ? `: ${n} ${n === 1 ? "unidad" : "unidades"} por apartar` : ""}`}
            className="boton-vidrio relative hidden sm:inline-flex"
          >
            <Icono nombre="pedidos" />
            <ContadorPedido n={n} className="absolute -right-1 -top-1" />
          </button>

          <ReservasRapidas key={ruta} />
          <BotonTema />

          <Link
            href="/cuenta"
            className="ml-1 hidden min-h-10 items-center rounded-pill bg-primario px-5 tipo-accion text-sobre-primario transition-colors duration-[var(--tk-dur)] hover:bg-primario-hover sm:inline-flex"
          >
            {sesion ? sesion.usuario.nombre.split(" ")[0] : "Ingresar"}
          </Link>

          <button
            ref={botonMenu}
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-movil"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            className="boton-vidrio lg:hidden"
          >
            <Icono nombre={abierto ? "cerrar" : "menu"} />
          </button>
        </div>
        </div>
      </header>

      {montado ? (
        <MenuMovil
          abierto={abierto}
          alCerrar={cerrar}
          alTerminarSalida={() => setMontado(false)}
          panel={panel}
          sesion={sesion}
          rutaActual={ruta}
        />
      ) : null}
    </>
  );
}

function MenuMovil({
  abierto,
  alCerrar,
  alTerminarSalida,
  panel,
  sesion,
  rutaActual,
}: {
  abierto: boolean;
  alCerrar: () => void;
  alTerminarSalida: () => void;
  panel: React.RefObject<HTMLDivElement | null>;
  sesion: { usuario: { nombre: string } } | null;
  rutaActual: string;
}) {
  const raiz = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const velo = raiz.current?.querySelector("[data-velo]");
      const hoja = panel.current;
      if (!velo || !hoja) return;
      const items = hoja.querySelectorAll("[data-item]");
      const mm = gsap.matchMedia();

      mm.add(CONDICIONES.movimiento, () => {
        const { duracion, ease, salida, easeSalida } = MOVIMIENTO.panel;
        if (abierto) {
          gsap.fromTo(velo, { opacity: 0 }, { opacity: 1, duration: duracion, ease });
          gsap.fromTo(
            hoja,
            { opacity: 0, y: -16 },
            { opacity: 1, y: 0, duration: duracion, ease },
          );
          gsap.fromTo(
            items,
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: duracion, ease, stagger: 0.035, delay: 0.06 },
          );
          hoja.querySelector<HTMLElement>("a, button")?.focus();
        } else {
          gsap.to(velo, { opacity: 0, duration: salida, ease: easeSalida });
          gsap.to(hoja, {
            opacity: 0,
            y: -12,
            duration: salida,
            ease: easeSalida,
            onComplete: alTerminarSalida,
          });
        }
      });

      mm.add(CONDICIONES.reducido, () => {
        if (abierto) {
          hoja.querySelector<HTMLElement>("a, button")?.focus();
        } else {
          alTerminarSalida();
        }
      });
    },
    { dependencies: [abierto], scope: raiz, revertOnUpdate: true },
  );

  return (
    <div ref={raiz} className="lg:hidden">
      <div
        data-velo=""
        aria-hidden="true"
        onClick={alCerrar}
        className="fixed inset-0 z-[45] bg-velo backdrop-blur-[3px]"
      />
      <div
        ref={panel}
        id="menu-movil"
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className="vidrio-alto fixed inset-x-2.5 top-[calc(var(--tk-alto-nav)+var(--tk-alto-cinta)+1.25rem)] z-50 max-h-[calc(100svh-var(--tk-alto-nav)-var(--tk-alto-cinta)-2rem)] overflow-y-auto rounded-lg px-4 pb-5 pt-4 text-tinta sm:inset-x-4"
      >
        <p data-item="" className="rotulo px-2 pb-2 text-tenue">
          Tiendas
        </p>
        <ul className="flex flex-col">
          {TIENDAS.map((t) => {
            const href = `/tiendas/${t.slug}`;
            return (
              <li key={t.slug} data-item="">
                <Link
                  href={href}
                  aria-current={rutaActual === href ? "page" : undefined}
                  onClick={alCerrar}
                  className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-suave aria-[current=page]:bg-primario-suave"
                >
                  <LogoTienda slug={t.slug} tamano={44} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{t.nombre}</span>
                    <span className="block truncate text-sm text-tenue">{t.categoria}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <hr data-item="" className="my-3 border-linea" />

        <ul className="flex flex-col">
          {SECCIONES.filter((s) => s.href !== "/tiendas").map((s) => (
            <li key={s.href} data-item="">
              <Link
                href={s.href}
                onClick={alCerrar}
                className="flex min-h-11 items-center rounded-md px-2 tipo-accion hover:bg-suave"
              >
                {s.nombre}
              </Link>
            </li>
          ))}
        </ul>

        <div data-item="" className="mt-3 flex flex-col gap-2 border-t border-linea pt-4">
          <Link
            href="/cuenta"
            onClick={alCerrar}
            className="flex min-h-12 items-center justify-center rounded-pill bg-primario px-5 tipo-accion text-sobre-primario"
          >
            {sesion ? `Mi cuenta · ${sesion.usuario.nombre.split(" ")[0]}` : "Ingresar"}
          </Link>
          {sesion ? (
            <button
              type="button"
              onClick={() => {
                cerrarSesion();
                alCerrar();
              }}
              className="min-h-11 text-sm font-semibold text-enlace underline underline-offset-4"
            >
              Cerrar sesión
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

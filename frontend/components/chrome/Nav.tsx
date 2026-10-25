"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { TIENDAS, paletaTienda } from "@/lib/tiendas";
import { useSesion, cerrarSesion } from "@/lib/sesion";
import { useCarrito, unidades } from "@/lib/carrito";
import { LOGO } from "@/lib/imagenes";
import { gsap, useGSAP, CONDICIONES, MOVIMIENTO } from "@/lib/movimiento";
import { Icono, IconoTienda } from "@/components/ui/Icono";
import { BotonTema } from "./BotonTema";
import { ContadorPedido } from "./ContadorPedido";

/**
 * Barra superior (SPEC v4 §2.7). Flota, transparente, sobre la sábana azul
 * con la que empieza cada página: logo blanco, enlaces de sección, pedido,
 * tema e «Ingresar». Bajo `lg` los enlaces se recogen en un menú desplegable
 * animado con GSAP; la navegación principal de móvil es `NavInferior`.
 */

const SECCIONES = [
  { href: "/#tiendas", nombre: "Tiendas" },
  { href: "/#como", nombre: "Cómo funciona" },
  { href: "/#cuenta", nombre: "La cuenta" },
  { href: "/#preguntas", nombre: "Preguntas" },
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
      <header className="absolute inset-x-0 top-0 z-[60] text-sobre-sabana [--tk-foco:var(--tk-sobre-sabana)]">
        <div className="contenedor flex h-[var(--tk-alto-nav)] items-center gap-3 sm:gap-5">
          <Link href="/" className="flex min-h-11 shrink-0 items-center" aria-label="Tienda Virtual UTB, inicio">
            <Image
              src={LOGO.src}
              alt=""
              width={LOGO.ancho}
              height={LOGO.alto}
              priority
              className="h-[30px] w-auto [filter:brightness(0)_invert(1)] sm:h-[34px]"
            />
          </Link>

          {enTienda ? (
            <Link
              href="/#tiendas"
              className="hidden min-h-11 items-center gap-1.5 text-[0.9375rem] font-semibold hover:underline hover:underline-offset-4 md:inline-flex"
            >
              <Icono nombre="atras" tamano={18} grosor={2.2} />
              Todas las tiendas
            </Link>
          ) : (
            <nav aria-label="Secciones" className="hidden lg:block">
              <ul className="flex items-center gap-6 text-[0.9375rem] font-semibold">
                {SECCIONES.map((s) => (
                  <li key={s.href}>
                    <Link
                      href={s.href}
                      className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                    >
                      {s.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex-1" />

          <Link
            href="/pedidos"
            aria-current={ruta.startsWith("/pedidos") ? "page" : undefined}
            aria-label={`Mis pedidos${n > 0 ? `: ${n} ${n === 1 ? "unidad" : "unidades"} por apartar` : ""}`}
            className="boton-vidrio relative hidden sm:inline-flex"
          >
            <Icono nombre="pedidos" />
            <ContadorPedido n={n} className="absolute -right-1 -top-1" />
          </Link>

          <BotonTema />

          <Link
            href="/cuenta"
            className="hidden min-h-11 items-center rounded-pill bg-blanco px-5 text-[0.9375rem] font-bold text-carnet-azul transition-colors duration-[var(--tk-dur)] hover:bg-carnet-azul-suave sm:inline-flex"
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
        className="fixed inset-0 z-[45] bg-velo"
      />
      <div
        ref={panel}
        id="menu-movil"
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className="fixed inset-x-3 top-[calc(var(--tk-alto-nav)-0.25rem)] z-50 max-h-[calc(100svh-var(--tk-alto-nav)-1rem)] overflow-y-auto rounded-lg bg-tarjeta p-4 text-tinta shadow-alta"
      >
        <p data-item="" className="rotulo px-2 pb-2 text-tenue">
          Tiendas
        </p>
        <ul className="flex flex-col">
          {TIENDAS.map((t) => {
            const p = paletaTienda(t.slug);
            const href = `/tiendas/${t.slug}`;
            return (
              <li key={t.slug} data-item="">
                <Link
                  href={href}
                  aria-current={rutaActual === href ? "page" : undefined}
                  onClick={alCerrar}
                  className="flex min-h-14 items-center gap-3 rounded-md px-2 py-2 hover:bg-suave aria-[current=page]:bg-primario-suave"
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm ${p.suave} ${p.tinta}`}>
                    <IconoTienda slug={t.slug} tamano={22} />
                  </span>
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
          {SECCIONES.filter((s) => s.href !== "/#tiendas").map((s) => (
            <li key={s.href} data-item="">
              <Link
                href={s.href}
                onClick={alCerrar}
                className="flex min-h-11 items-center rounded-md px-2 font-semibold hover:bg-suave"
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
            className="flex min-h-12 items-center justify-center rounded-pill bg-primario px-5 font-bold text-sobre-primario"
          >
            {sesion ? `Mi pase · ${sesion.usuario.nombre.split(" ")[0]}` : "Ingresar"}
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

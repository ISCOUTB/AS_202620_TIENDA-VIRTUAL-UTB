"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { TIENDAS } from "@/lib/tiendas";
import { useSesion, cerrarSesion } from "@/lib/sesion";
import { useCarrito, unidades, abrirPedido } from "@/lib/carrito";
import { LOGO } from "@/lib/imagenes";

/**
 * Navegación del sitio (design/SPEC.md v3 §2.4).
 *
 * Barra superior translúcida con el logo institucional en su versión
 * monocroma blanca —uso autorizado de la marca, igual que la app oficial— y,
 * en móvil, una **barra inferior flotante** con el pedido integrado: es el
 * gesto más reconocible de la app de la UTB.
 */

const ENLACES = TIENDAS.map((t) => ({
  href: `/tiendas/${t.slug}`,
  nombre: t.nombre,
  categoria: t.categoria,
}));

export function Nav() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const { sesion } = useSesion();
  const { carrito } = useCarrito();
  const n = unidades(carrito);

  useEffect(() => {
    setAbierto(false);
  }, [ruta]);

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

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-tinta/85 backdrop-blur">
        <div className="contenedor flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={LOGO.src}
              alt={LOGO.alt}
              width={LOGO.ancho}
              height={LOGO.alto}
              priority
              className="h-7 w-auto [filter:brightness(0)_invert(1)]"
            />
            <span aria-hidden="true" className="hidden h-6 w-px bg-white/20 sm:block" />
            <span className="hidden font-display text-[0.9375rem] font-extrabold tracking-[-0.01em] text-superficie sm:inline">
              Tienda Virtual
            </span>
          </Link>

          <nav aria-label="Tiendas" className="hidden lg:flex items-center gap-1">
            {ENLACES.map((e) => {
              const activa = ruta === e.href;
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  aria-current={activa ? "page" : undefined}
                  className={[
                    "rounded-[var(--tk-radio-pill)] px-3.5 py-2 font-display text-[0.875rem] font-semibold tracking-[0.01em]",
                    "transition-colors duration-[var(--tk-dur)]",
                    activa
                      ? "bg-sabana-2/25 text-superficie"
                      : "text-cyan-claro hover:bg-tarjeta-alta hover:text-superficie",
                  ].join(" ")}
                >
                  {e.nombre}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={abrirPedido}
              aria-label={`Ver pedido${n > 0 ? `: ${n} ${n === 1 ? "unidad" : "unidades"}` : ""}`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--tk-radio-pill)] text-superficie transition-colors duration-[var(--tk-dur)] hover:bg-tarjeta-alta"
            >
              <Icono nombre="pedido" />
              {n > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-[var(--tk-radio-pill)] bg-ambar px-1 font-display text-[0.6875rem] font-bold text-tinta cifra">
                  {n}
                </span>
              ) : null}
            </button>

            <Link
              href="/cuenta"
              className="hidden rounded-[var(--tk-radio-pill)] px-3.5 py-2 font-display text-[0.875rem] font-semibold text-superficie transition-colors duration-[var(--tk-dur)] hover:bg-tarjeta-alta sm:inline-flex"
            >
              {sesion ? sesion.usuario.nombre.split(" ")[0] : "Mi pase"}
            </Link>

            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              aria-controls="menu-movil"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--tk-radio-pill)] text-superficie transition-colors duration-[var(--tk-dur)] hover:bg-tarjeta-alta lg:hidden"
            >
              <span className="sr-only">{abierto ? "Cerrar menú" : "Abrir menú"}</span>
              <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true" fill="currentColor">
                {abierto ? (
                  <path d="M2 2l16 10M18 2L2 12" stroke="currentColor" strokeWidth="2" fill="none" />
                ) : (
                  <>
                    <rect width="20" height="2.4" rx="1.2" />
                    <rect y="5.8" width="20" height="2.4" rx="1.2" />
                    <rect y="11.6" width="20" height="2.4" rx="1.2" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {abierto ? (
        <div
          id="menu-movil"
          className="fixed inset-0 top-16 z-40 overflow-y-auto bg-tinta lg:hidden"
        >
          <nav aria-label="Tiendas" className="contenedor flex flex-col gap-3 py-6">
            {ENLACES.map((e, i) => (
              <Link
                key={e.href}
                href={e.href}
                className="tarjeta flex items-center justify-between gap-4 px-5 py-4"
              >
                <span className="min-w-0">
                  <span className="rotulo cifra block text-tenue">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1 block font-display text-[1.25rem] font-extrabold tracking-[-0.02em] text-superficie">
                    {e.nombre}
                  </span>
                  <span className="block font-cuerpo text-[0.8125rem] text-tenue">
                    {e.categoria}
                  </span>
                </span>
                <span aria-hidden="true" className="font-display text-[1.25rem] text-cyan-claro">
                  →
                </span>
              </Link>
            ))}

            <div className="mt-4 flex flex-col gap-4">
              <Link
                href="/cuenta"
                className="font-display text-[0.9375rem] font-semibold uppercase tracking-[0.08em] text-ambar"
              >
                {sesion ? "Mi pase" : "Ingresar"}
              </Link>
              {sesion ? (
                <button
                  type="button"
                  onClick={() => {
                    cerrarSesion();
                    setAbierto(false);
                  }}
                  className="self-start font-display text-[0.8125rem] uppercase tracking-[0.08em] text-cyan-claro underline underline-offset-4"
                >
                  Cerrar sesión
                </button>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}

      <NavInferior sesion={sesion} unidadesPedido={n} />
    </>
  );
}

/** Barra inferior flotante (solo móvil): Inicio · Tiendas · Pedido · Pase. */
function NavInferior({
  sesion,
  unidadesPedido,
}: {
  sesion: { usuario: { nombre: string } } | null;
  unidadesPedido: number;
}) {
  const ruta = usePathname();

  const items = [
    { clave: "inicio", href: "/", etiqueta: "Inicio", icono: "inicio" as const },
    { clave: "tiendas", href: "/#tiendas", etiqueta: "Tiendas", icono: "tiendas" as const },
    { clave: "pedido", href: null, etiqueta: "Pedido", icono: "pedido" as const },
    { clave: "pase", href: "/cuenta", etiqueta: "Pase", icono: "pase" as const },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 lg:hidden"
    >
      <ul className="flex w-full max-w-[26rem] items-stretch gap-1 rounded-[var(--tk-radio-pill)] border border-white/10 bg-tinta/90 p-1.5 backdrop-blur">
        {items.map((it) => {
          const activa =
            it.href === "/"
              ? ruta === "/"
              : it.href
                ? ruta.startsWith(it.href.replace("/#tiendas", "/tiendas"))
                : false;
          const contenido = (
            <>
              <span className="relative">
                <Icono nombre={it.icono} />
                {it.clave === "pedido" && unidadesPedido > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-[var(--tk-radio-pill)] bg-ambar px-1 font-display text-[0.625rem] font-bold text-tinta cifra">
                    {unidadesPedido}
                  </span>
                ) : null}
              </span>
              <span className="font-display text-[0.6875rem] font-semibold">
                {it.etiqueta}
                {it.clave === "pase" && sesion ? (
                  <span className="sr-only"> de {sesion.usuario.nombre.split(" ")[0]}</span>
                ) : null}
              </span>
            </>
          );
          const clases = [
            "flex w-full flex-col items-center justify-center gap-1 rounded-[var(--tk-radio-pill)] px-2 py-2 transition-colors duration-[var(--tk-dur)]",
            activa ? "bg-sabana-2/30 text-superficie" : "text-cyan-claro",
          ].join(" ");

          return (
            <li key={it.clave} className="flex-1">
              {it.href ? (
                <Link href={it.href} aria-current={activa ? "page" : undefined} className={clases}>
                  {contenido}
                </Link>
              ) : (
                <button type="button" onClick={abrirPedido} className={clases}>
                  {contenido}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type NombreIcono = "inicio" | "tiendas" | "pedido" | "pase";

function Icono({ nombre }: { nombre: NombreIcono }): ReactNode {
  const comun = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (nombre === "inicio") {
    return (
      <svg {...comun}>
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6 9.5V20h12V9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    );
  }
  if (nombre === "tiendas") {
    return (
      <svg {...comun}>
        <path d="M5 8h14l-1 12H6z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    );
  }
  if (nombre === "pedido") {
    return (
      <svg {...comun}>
        <path d="M4 5h2l2 10h9l2-7H7" />
        <circle cx="9.5" cy="19" r="1.4" />
        <circle cx="16.5" cy="19" r="1.4" />
      </svg>
    );
  }
  return (
    <svg {...comun}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M13 9.5h5M13 13h5M5.5 16.5c1-1.6 4.5-1.6 6 0" />
    </svg>
  );
}

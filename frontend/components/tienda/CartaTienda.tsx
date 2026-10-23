"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { esParaCompartir, type Producto } from "@/lib/catalogo";
import { gsap, useGSAP, CONDICIONES, MOVIMIENTO } from "@/lib/movimiento";
import { ProductoCard } from "./ProductoCard";

type Pestana = "uno" | "compartir";

const PESTANAS: Array<{ id: Pestana; etiqueta: string }> = [
  { id: "uno", etiqueta: "Para uno" },
  { id: "compartir", etiqueta: "Para compartir" },
];

/**
 * La carta de una tienda (artefacto «A · Tienda»): control segmentado
 * «Para uno / Para compartir» —solo si la tienda tiene de los dos— y la
 * rejilla de productos (filas en móvil).
 *
 * Las pestañas siguen el patrón ARIA de tabs: flechas, Inicio y Fin mueven
 * la selección. Al cambiar de pestaña las tarjetas entran escalonadas.
 */
export function CartaTienda({ productos }: { productos: Producto[] }) {
  const base = useId();
  const compartir = productos.filter(esParaCompartir);
  const uno = productos.filter((p) => !esParaCompartir(p));
  const conPestanas = compartir.length > 0 && uno.length > 0;

  const [pestana, setPestana] = useState<Pestana>("uno");
  const rejilla = useRef<HTMLUListElement>(null);
  const botones = useRef<Array<HTMLButtonElement | null>>([]);

  const visibles = !conPestanas ? productos : pestana === "uno" ? uno : compartir;

  // La primera pintura no se anima aquí (la página ya entra con `Revelar` y
  // animar lo que llegó del servidor causaría un parpadeo); solo los cambios
  // de pestaña.
  const pestanaPrevia = useRef<Pestana>(pestana);

  useGSAP(
    () => {
      if (pestanaPrevia.current === pestana) return;
      pestanaPrevia.current = pestana;
      if (!conPestanas || !rejilla.current) return;
      const mm = gsap.matchMedia();
      mm.add(CONDICIONES.movimiento, () => {
        const { duracion, ease, escalon } = MOVIMIENTO.entrada;
        gsap.from(rejilla.current!.children, {
          opacity: 0,
          y: 10,
          duration: duracion * 0.8,
          ease,
          stagger: escalon * 0.75,
          clearProps: "transform,opacity",
        });
      });
    },
    { dependencies: [pestana], scope: rejilla },
  );

  function alTeclear(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const ultimo = PESTANAS.length - 1;
    const destino =
      e.key === "ArrowRight"
        ? (i + 1) % PESTANAS.length
        : e.key === "ArrowLeft"
          ? (i - 1 + PESTANAS.length) % PESTANAS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? ultimo
              : null;
    if (destino === null) return;
    e.preventDefault();
    setPestana(PESTANAS[destino].id);
    botones.current[destino]?.focus();
  }

  const lista = (
    <ul
      ref={rejilla}
      className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
    >
      {visibles.map((p) => (
        <ProductoCard key={p.id} producto={p} />
      ))}
    </ul>
  );

  if (!conPestanas) return <div className="mt-2 sm:mt-5">{lista}</div>;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Porciones"
        className="grid grid-cols-2 gap-1 rounded-[16px] bg-suave-2 p-1 sm:inline-grid sm:rounded-[18px]"
      >
        {PESTANAS.map((t, i) => {
          const sel = pestana === t.id;
          const cuantos = t.id === "uno" ? uno.length : compartir.length;
          return (
            <button
              key={t.id}
              ref={(el) => {
                botones.current[i] = el;
              }}
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={sel}
              aria-controls={`${base}-panel`}
              tabIndex={sel ? 0 : -1}
              onClick={() => setPestana(t.id)}
              onKeyDown={(e) => alTeclear(e, i)}
              className={[
                "h-11 rounded-xs px-5 text-sm font-bold transition-colors duration-[var(--tk-dur)] sm:rounded-sm sm:px-[1.375rem] sm:text-[0.9375rem]",
                sel ? "bg-tarjeta text-tinta shadow-pestana" : "text-tenue hover:text-tinta",
              ].join(" ")}
            >
              {t.etiqueta}
              <span className="cifra ml-1.5 font-semibold text-tenue">{cuantos}</span>
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-tab-${pestana}`}
        className="mt-2 sm:mt-[18px]"
      >
        {lista}
      </div>
    </div>
  );
}

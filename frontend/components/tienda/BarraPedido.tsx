"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { useCarrito, unidades, totalCentavos, abrirPedido } from "@/lib/carrito";
import { formatoPrecio } from "@/lib/formato";
import { gsap, useGSAP, CONDICIONES, MOVIMIENTO } from "@/lib/movimiento";

/**
 * Botón flotante «Ver pedido» (artefacto «A · Tienda móvil»): número de
 * unidades, texto y total. Solo existe con unidades en el pedido.
 *
 * - Móvil: sobre la navegación inferior, de borde a borde.
 * - Escritorio: abajo a la derecha, salvo en la página de una tienda, donde el
 *   resumen lateral ya cumple ese papel.
 * Entra con un deslizamiento corto (GSAP) la primera vez que aparece.
 */
export function BarraPedido() {
  const { carrito, cargando } = useCarrito();
  const ruta = usePathname();
  const ref = useRef<HTMLButtonElement>(null);
  const n = unidades(carrito);
  const visible = !cargando && n > 0;
  const enTienda = ruta.startsWith("/tiendas/");

  useGSAP(
    () => {
      if (!visible || !ref.current) return;
      const mm = gsap.matchMedia();
      mm.add(CONDICIONES.movimiento, () => {
        gsap.from(ref.current, {
          y: 24,
          opacity: 0,
          duration: MOVIMIENTO.panel.duracion,
          ease: MOVIMIENTO.panel.ease,
          clearProps: "transform,opacity",
        });
      });
    },
    { dependencies: [visible] },
  );

  if (!visible) return null;

  return (
    <button
      ref={ref}
      type="button"
      // El layout público lo detecta (`group-has`) para reservar su sitio al pie.
      data-barra-pedido
      onClick={abrirPedido}
      className={[
        "fixed inset-x-4 mx-auto max-w-lg bottom-[calc(5rem+max(0.5rem,env(safe-area-inset-bottom)))] z-30 flex h-[60px] items-center gap-3 rounded-[20px] bg-primario px-[18px] text-sobre-primario shadow-primaria transition-colors duration-[var(--tk-dur)] hover:bg-primario-hover",
        "lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[22rem]",
        enTienda ? "lg:hidden" : "",
      ].join(" ")}
    >
      <span className="cifra flex h-7 min-w-7 shrink-0 items-center justify-center rounded-pill bg-sabana-vidrio px-1.5 text-sm font-bold">
        {n}
      </span>
      <span className="min-w-0 truncate text-base font-bold">
        Ver pedido
        <span className="sr-only">
          : {n} {n === 1 ? "unidad" : "unidades"}
        </span>
      </span>
      <span className="flex-1" />
      <span className="cifra shrink-0 whitespace-nowrap text-base font-bold">{formatoPrecio(totalCentavos(carrito))}</span>
    </button>
  );
}

"use client";

import { useRef } from "react";
import { gsap, useGSAP, CONDICIONES, MOVIMIENTO } from "@/lib/movimiento";

/**
 * Burbuja con el número de unidades del pedido. Cuando el número SUBE (se
 * agregó algo) da un pequeño rebote de escala: la confirmación de «agregar al
 * carrito» se ve también donde vive el carrito. Con movimiento reducido no
 * rebota. Solo `transform`.
 */
export function ContadorPedido({
  n,
  className = "",
}: {
  n: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const anterior = useRef(n);

  useGSAP(
    () => {
      const subio = n > anterior.current;
      anterior.current = n;
      if (!subio || !ref.current) return;
      const mm = gsap.matchMedia();
      mm.add(CONDICIONES.movimiento, () => {
        const { duracion, ease, escala } = MOVIMIENTO.pulso;
        gsap.fromTo(
          ref.current,
          { scale: escala + 0.2 },
          { scale: 1, duration: duracion, ease, clearProps: "transform" },
        );
      });
    },
    { dependencies: [n], scope: ref },
  );

  if (n <= 0) return null;

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={[
        "cifra flex h-5 min-w-5 items-center justify-center rounded-pill bg-antojos px-1 text-[0.6875rem] font-bold text-antojos-sobre",
        className,
      ].join(" ")}
    >
      {n}
    </span>
  );
}

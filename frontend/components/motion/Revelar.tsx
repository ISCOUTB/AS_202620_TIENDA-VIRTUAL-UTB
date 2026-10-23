"use client";

import {
  useRef,
  type ComponentType,
  type ElementType,
  type ReactNode,
  type Ref,
} from "react";
import { gsap, ScrollTrigger, useGSAP, CONDICIONES, MOVIMIENTO } from "@/lib/movimiento";

/**
 * Entrada de sección (SPEC v4 §2.8): fundido + 16 px hacia arriba, con
 * escalonado en las rejillas de tarjetas.
 *
 * - El contenedor lleva `data-revelar`: globals.css lo mantiene invisible
 *   desde el HTML del servidor (solo si el usuario no pidió movimiento
 *   reducido), así no hay destello antes de que GSAP tome el control.
 * - Se animan los descendientes marcados con `data-escalon` (tarjetas,
 *   bloques); si no hay, el contenedor entero.
 * - Lo que ya está en pantalla entra al montar; lo de más abajo, cuando llega
 *   al 88 % del viewport (ScrollTrigger.batch, una sola vez).
 * - Solo `opacity` y `transform`: nada que mueva la maquetación.
 * - `useGSAP` crea un contexto acotado a este contenedor y lo revierte al
 *   desmontar: sin fugas al navegar entre páginas.
 * - Con movimiento reducido no hay tween: todo queda en su estado final.
 *
 * Funciona dentro de componentes de servidor: los hijos llegan ya renderizados.
 */
export function Revelar({
  children,
  as: Etiqueta = "div",
  className,
  id,
  inmediato = false,
  ...resto
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  id?: string;
  /** Entra al montar aunque esté fuera de pantalla (cabeceras). */
  inmediato?: boolean;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const raiz = ref.current;
      if (!raiz) return;
      const escalones = Array.from(raiz.querySelectorAll<HTMLElement>("[data-escalon]"));
      const objetivos = escalones.length > 0 ? escalones : [raiz];
      const mm = gsap.matchMedia();

      mm.add(CONDICIONES.movimiento, () => {
        const { duracion, ease, y, escalon } = MOVIMIENTO.entrada;
        // En el mismo fotograma: GSAP oculta los objetivos y el contenedor
        // deja de estar oculto por CSS. No hay parpadeo.
        gsap.set(objetivos, { opacity: 0, y });
        raiz.setAttribute("data-revelado", "");

        const entrar = (lote: Element[]) =>
          gsap.to(lote, {
            opacity: 1,
            y: 0,
            duration: duracion,
            ease,
            stagger: escalon,
            overwrite: true,
            clearProps: "opacity,transform",
          });

        if (inmediato) {
          entrar(objetivos);
          return;
        }

        // Lo que ya está a la vista (o por encima, si la página se cargó con
        // scroll) entra ya; el resto espera a que llegue.
        const umbral = window.innerHeight * 0.88;
        const yaVisibles = objetivos.filter((el) => el.getBoundingClientRect().top < umbral);
        const pendientes = objetivos.filter((el) => !yaVisibles.includes(el));
        if (yaVisibles.length > 0) entrar(yaVisibles);
        if (pendientes.length === 0) return;

        ScrollTrigger.batch(pendientes, {
          start: "top 88%",
          once: true,
          onEnter: entrar,
        });
      });

      mm.add(CONDICIONES.reducido, () => {
        raiz.setAttribute("data-revelado", "");
      });
    },
    { scope: ref },
  );

  const Elemento = Etiqueta as unknown as ComponentType<PropsElemento>;

  return (
    <Elemento ref={ref} className={className} id={id} data-revelar="" {...resto}>
      {children}
    </Elemento>
  );
}

type PropsElemento = {
  ref: Ref<HTMLElement>;
  className?: string;
  id?: string;
  children?: ReactNode;
  "data-revelar": string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
};

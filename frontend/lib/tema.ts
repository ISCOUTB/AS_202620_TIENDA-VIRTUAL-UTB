"use client";

/**
 * Tema claro / oscuro con revelado circular (design/SPEC.md v4 §2.9).
 *
 * Cómo funciona el círculo:
 * 1. Se mide el centro del botón que se pulsó y el radio que cubre la
 *    pantalla entera: la distancia hasta la esquina más lejana.
 * 2. `document.startViewTransition()` fotografía la página con el tema viejo,
 *    cambia `data-theme` y deja la página nueva viva debajo de la foto.
 * 3. globals.css apaga el fundido por defecto. Aquí se recorta
 *    `::view-transition-new(root)` con `clip-path: circle(r at x y)` y `r`
 *    crece de 0 al radio máximo. Dentro del círculo se ve el tema nuevo;
 *    fuera, la foto del viejo.
 * 4. La curva es la de GSAP (`MOVIMIENTO.tema.ease`): se muestrea en
 *    fotogramas clave y se reproduce con la Web Animations API, que es la
 *    única que puede animar un pseudo-elemento de View Transitions.
 *
 * Respaldo: sin `startViewTransition` (Firefox < 144, navegadores viejos) o
 * con movimiento reducido, el cambio es instantáneo.
 */

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { gsap, MOVIMIENTO, prefiereMenosMovimiento } from "@/lib/movimiento";
import { CLAVE_TEMA, resolverTema, type Tema } from "@/lib/tema-inicial";
import { fotogramasCirculo, radioMaximo } from "@/lib/circulo";

export type { Tema };

const EVENTO_TEMA = "tvutb:tema";

type TransicionVista = { ready: Promise<void>; finished: Promise<void> };
type DocumentoConTransicion = Document & {
  startViewTransition?: (actualizar: () => void) => TransicionVista;
};

function leerGuardado(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_TEMA);
  } catch {
    return null;
  }
}

/** El tema que muestra la página ahora mismo. */
export function temaActual(): Tema {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

/** Aplica un tema a <html>; con `guardar` lo recuerda para la próxima visita. */
export function aplicarTema(tema: Tema, guardar = true): void {
  const raiz = document.documentElement;
  raiz.setAttribute("data-theme", tema);
  raiz.style.colorScheme = tema;
  if (guardar) {
    try {
      window.localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // Almacenamiento bloqueado: el tema dura lo que dure la pestaña.
    }
  }
  window.dispatchEvent(new Event(EVENTO_TEMA));
}

/** Quita la clase que congela las transiciones de color tras dos fotogramas. */
function soltarCongelado(): void {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      document.documentElement.classList.remove("tema-cambiando");
    }),
  );
}

/**
 * Alterna el tema. `origen` es el botón pulsado: de su centro nace el círculo.
 */
export function alternarTema(origen?: HTMLElement | null): void {
  const raiz = document.documentElement;
  const siguiente: Tema = temaActual() === "dark" ? "light" : "dark";
  const doc = document as DocumentoConTransicion;

  raiz.classList.add("tema-cambiando");

  if (typeof doc.startViewTransition !== "function" || prefiereMenosMovimiento()) {
    aplicarTema(siguiente);
    soltarCongelado();
    return;
  }

  const caja = origen?.getBoundingClientRect();
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  const x = caja ? caja.left + caja.width / 2 : ancho / 2;
  const y = caja ? caja.top + caja.height / 2 : alto / 2;
  const radio = radioMaximo(x, y, ancho, alto);

  // El cambio de atributo ocurre dentro del callback, de forma síncrona: la
  // captura nueva ya tiene el tema nuevo en toda la página (barras fijas
  // incluidas). Ningún elemento lleva `view-transition-name`, así todo va en
  // la captura raíz y el círculo lo barre por igual.
  // `flushSync` vuelca también lo que React pinta según el tema (el icono).
  const transicion = doc.startViewTransition(() => flushSync(() => aplicarTema(siguiente)));

  transicion.ready
    .then(() => {
      const ease = gsap.parseEase(MOVIMIENTO.tema.ease) ?? ((t: number) => t);
      raiz.animate(fotogramasCirculo(x, y, radio, ease, MOVIMIENTO.tema.muestras), {
        duration: MOVIMIENTO.tema.duracion * 1000,
        easing: "linear",
        fill: "both",
        pseudoElement: "::view-transition-new(root)",
      });
    })
    .catch(() => {
      // La transición se saltó (pestaña oculta, otra transición): el tema ya
      // quedó aplicado por el callback, no hay nada que animar.
    });

  transicion.finished.finally(soltarCongelado).catch(() => undefined);
}

/**
 * Mientras el usuario no haya elegido, el sitio sigue al sistema también en
 * vivo (si cambia el modo del sistema con la página abierta). Devuelve la
 * función de limpieza para un `useEffect`.
 */
export function seguirSistema(): () => void {
  const consulta = window.matchMedia("(prefers-color-scheme: dark)");
  const alCambiar = () => {
    const guardado = leerGuardado();
    if (guardado === "light" || guardado === "dark") return;
    aplicarTema(resolverTema(null, consulta.matches), false);
  };
  consulta.addEventListener("change", alCambiar);
  return () => consulta.removeEventListener("change", alCambiar);
}

function suscribir(avisar: () => void): () => void {
  window.addEventListener(EVENTO_TEMA, avisar);
  return () => window.removeEventListener(EVENTO_TEMA, avisar);
}

/** Tema actual para componentes. `null` en el servidor y en la hidratación. */
export function useTema(): Tema | null {
  return useSyncExternalStore<Tema | null>(suscribir, temaActual, () => null);
}

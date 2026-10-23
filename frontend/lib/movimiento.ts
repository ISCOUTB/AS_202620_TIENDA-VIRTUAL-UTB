"use client";

/**
 * Movimiento — un solo lugar para GSAP (design/SPEC.md v4 §2.8).
 *
 * - Registra los plugins una vez (`useGSAP`, `ScrollTrigger`).
 * - Fija la gramática del movimiento: duraciones, curvas y desplazamientos.
 *   Ningún componente inventa sus propios números.
 * - `CONDICIONES` es el par de consultas de `gsap.matchMedia()`: con
 *   movimiento reducido todo se resuelve en su estado final, sin tween.
 *
 * Solo se importa desde componentes de cliente: GSAP toca el DOM.
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

export { gsap, ScrollTrigger, useGSAP };

export const MOVIMIENTO = {
  /** Entrada de sección y tarjetas. */
  entrada: { duracion: 0.6, ease: "power2.out", y: 16, escalon: 0.06 },
  /** Hojas, menús y paneles. */
  panel: { duracion: 0.42, ease: "power3.out", salida: 0.28, easeSalida: "power2.in" },
  /** Confirmación al agregar al carrito. */
  pulso: { duracion: 0.45, ease: "back.out(3)", escala: 1.18 },
  /** Revelado circular del cambio de tema. */
  tema: { duracion: 0.75, ease: "power2.inOut", muestras: 32 },
} as const;

/** Consultas de `gsap.matchMedia()`: una rama con movimiento, otra sin él. */
export const CONDICIONES = {
  movimiento: "(prefers-reduced-motion: no-preference)",
  reducido: "(prefers-reduced-motion: reduce)",
} as const;

/** true si el usuario pidió reducir el movimiento (seguro en servidor). */
export function prefiereMenosMovimiento(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia(CONDICIONES.reducido).matches;
}

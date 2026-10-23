/**
 * Geometría del revelado circular del cambio de tema (lib/tema.ts).
 *
 * Funciones puras, sin DOM ni GSAP, para poder probarlas en Node.
 */

/** Radio que cubre todo el viewport desde (x, y): distancia a la esquina más lejana. */
export function radioMaximo(x: number, y: number, ancho: number, alto: number): number {
  return Math.hypot(Math.max(x, ancho - x), Math.max(y, alto - y));
}

export type FotogramaCirculo = { offset: number; clipPath: string };

/**
 * Fotogramas clave de `clip-path` para un círculo que crece siguiendo `ease`
 * (una curva 0→1, la de GSAP en la app). Entre fotogramas la interpolación es
 * lineal; con 32 muestras la curva es indistinguible de la original.
 */
export function fotogramasCirculo(
  x: number,
  y: number,
  radio: number,
  ease: (progreso: number) => number,
  muestras: number,
): FotogramaCirculo[] {
  const n = Math.max(2, Math.trunc(muestras));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const r = Math.max(0, radio * ease(t));
    return {
      offset: t,
      clipPath: `circle(${r.toFixed(2)}px at ${x.toFixed(2)}px ${y.toFixed(2)}px)`,
    };
  });
}

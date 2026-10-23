/**
 * Tema inicial — lo que corre ANTES del primer pintado.
 *
 * Este módulo no es de cliente: app/layout.tsx incrusta `SCRIPT_TEMA_INICIAL`
 * en el <head> para que <html> ya tenga `data-theme` cuando el navegador pinta
 * por primera vez. Así no hay destello del tema equivocado.
 *
 * Reglas (design/SPEC.md v4 §2.9):
 * 1. Si el usuario eligió un tema, se respeta (localStorage, con try/catch:
 *    en modo privado o con almacenamiento bloqueado puede lanzar).
 * 2. Si no, manda `prefers-color-scheme` del sistema.
 * 3. `data-motion="si"` solo cuando el usuario no pide movimiento reducido:
 *    globals.css lo usa para ocultar los bloques que GSAP va a revelar.
 */

export type Tema = "light" | "dark";

export const CLAVE_TEMA = "tvutb.tema";

/** El tema efectivo a partir de lo guardado y de la preferencia del sistema. */
export function resolverTema(guardado: string | null, sistemaOscuro: boolean): Tema {
  if (guardado === "light" || guardado === "dark") return guardado;
  return sistemaOscuro ? "dark" : "light";
}

/**
 * La misma lógica de `resolverTema`, como script autónomo (no puede importar
 * nada: corre antes que React). Si cambias una, cambia la otra; la prueba
 * tests/tema.test.ts comprueba que el script nombra la misma clave.
 */
export const SCRIPT_TEMA_INICIAL = `(function(){var d=document.documentElement;var t=null;try{t=localStorage.getItem(${JSON.stringify(
  CLAVE_TEMA,
)})}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.setAttribute("data-theme",t);d.style.colorScheme=t;try{if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){d.setAttribute("data-motion","si")}}catch(e){}})();`;

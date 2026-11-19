"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Cargador3D } from "@/components/ui/Cargador3D";

/** Tope de seguridad: si la navegación nunca termina, el velo se retira. */
const TOPE_MS = 15000;

/**
 * Pantalla de carga entre páginas (SPEC v5 §2.10).
 *
 * En la navegación del lado del cliente, Next deja la página anterior quieta
 * hasta que llega la nueva, sin ninguna señal; `loading.tsx` solo aparece al
 * instante si la ruta ya estaba precargada. Con red lenta, tocar una tienda
 * parecía no hacer nada. Este componente muestra el cubo en cuanto se toca
 * un enlace interno a OTRA página y lo retira cuando cambia la ruta.
 *
 * - Escucha en fase de captura: el `<Link>` de Next cancela el evento en la
 *   de burbuja para navegar por su cuenta.
 * - Ignora lo que no es una navegación de página: otra pestaña o ventana
 *   (modificadores, `target`, `download`), otro origen, o la misma ruta (un
 *   ancla `#` dentro de la página).
 * - El cubo aparece con 150 ms de espera (`.carga-aparece`): una navegación
 *   rápida no lo llega a mostrar.
 */
export function IndicadorNavegacion() {
  const ruta = usePathname();
  const [navegando, setNavegando] = useState(false);

  // La ruta cambió: la página nueva ya está aquí.
  useEffect(() => {
    setNavegando(false);
  }, [ruta]);

  useEffect(() => {
    const alPulsar = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as Element | null)?.closest?.("a[href]");
      if (!(enlace instanceof HTMLAnchorElement)) return;
      if (enlace.target && enlace.target !== "_self") return;
      if (enlace.hasAttribute("download")) return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin) return;
      if (destino.pathname === window.location.pathname) return;
      setNavegando(true);
    };
    document.addEventListener("click", alPulsar, true);
    return () => document.removeEventListener("click", alPulsar, true);
  }, []);

  // Tope de seguridad por si la navegación se cancela o falla.
  useEffect(() => {
    if (!navegando) return;
    const id = window.setTimeout(() => setNavegando(false), TOPE_MS);
    return () => window.clearTimeout(id);
  }, [navegando]);

  return navegando ? <Cargador3D variante="pantalla" etiqueta="Cargando" /> : null;
}

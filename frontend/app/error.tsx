"use client";

import { useEffect } from "react";
import { PantallaEstado } from "@/components/chrome/PantallaEstado";
import { Boton } from "@/components/ui/Boton";

/**
 * Límite de error de la aplicación. Dice lo que pasó sin tecnicismos y
 * ofrece reintentar (el `reset` de Next vuelve a renderizar el segmento).
 */
export default function ErrorDeRuta({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PantallaEstado
      codigo="Ups"
      titulo="Algo se nos cayó en el mostrador."
      texto={
        <>
          No pudimos mostrar esta página. Vuelve a intentarlo; si sigue
          fallando, prueba en unos minutos.
          {error.digest ? (
            <span className="mt-2 block font-mono text-sm opacity-80">Referencia: {error.digest}</span>
          ) : null}
        </>
      }
      acciones={
        <>
          <Boton variante="claro" tamano="lg" onClick={reset}>
            Reintentar
          </Boton>
          <Boton href="/" variante="oscuro" tamano="lg">
            Ir al inicio
          </Boton>
        </>
      }
    />
  );
}

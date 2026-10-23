import type { Metadata } from "next";
import { PantallaEstado } from "@/components/chrome/PantallaEstado";
import { Boton } from "@/components/ui/Boton";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

export default function NoEncontrada() {
  return (
    <PantallaEstado
      codigo="404"
      titulo="Esta página no está en la carta."
      texto="Puede que el enlace esté mal escrito o que la tienda haya cambiado de dirección. Las cinco tiendas siguen donde siempre."
      acciones={
        <>
          <Boton href="/" variante="claro" tamano="lg">
            Ir al inicio
          </Boton>
          <Boton href="/#tiendas" variante="oscuro" tamano="lg">
            Ver las tiendas
          </Boton>
        </>
      }
    />
  );
}

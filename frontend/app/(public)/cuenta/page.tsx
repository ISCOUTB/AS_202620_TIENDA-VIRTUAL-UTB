import type { Metadata } from "next";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { PanelCuenta } from "@/components/auth/PanelCuenta";
import { Revelar } from "@/components/motion/Revelar";

export const metadata: Metadata = {
  title: "Mi pase",
  description:
    "Tus datos, tus pedidos y tu carrito en la Tienda Virtual de la cafetería UTB.",
  robots: { index: false, follow: false },
};

export default function PaginaCuenta() {
  return (
    <>
      <header className="sabana bajo-nav">
        <Revelar inmediato className="contenedor pb-16 pt-6 md:pb-20 md:pt-10">
          <p data-escalon="" className="rotulo opacity-90">
            Mi pase
          </p>
          <h1 data-escalon="" className="titulo mt-3">
            Tu cuenta de cafetería
          </h1>
          <p data-escalon="" className="lead mt-3 max-w-[40ch] opacity-95">
            Tus datos, tus pedidos y lo que tienes apartado, en un solo lugar.
          </p>
        </Revelar>
      </header>

      <div className="contenedor relative -mt-10 pb-16">
        <RequiereSesion>
          <PanelCuenta />
        </RequiereSesion>
      </div>
    </>
  );
}

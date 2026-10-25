import type { Metadata } from "next";
import { PanelMisPedidos } from "@/components/pedidos/PanelMisPedidos";
import { Revelar } from "@/components/motion/Revelar";

export const metadata: Metadata = {
  title: "Mis pedidos",
  description:
    "Lo que tienes por apartar y tus pedidos con su hora de recogida en la Tienda Virtual de la cafetería UTB.",
  robots: { index: false, follow: false },
};

export default function PaginaPedidos() {
  return (
    <>
      <header className="sabana bajo-nav">
        <Revelar inmediato className="contenedor pb-16 pt-6 md:pb-20 md:pt-10">
          <p data-escalon="" className="rotulo opacity-90">
            Pedidos
          </p>
          <h1 data-escalon="" className="titulo mt-3">
            Tus pedidos
          </h1>
          <p data-escalon="" className="lead mt-3 max-w-[40ch] opacity-95">
            Lo que falta apartar y lo que ya está apartado, con la hora a la
            que pasas.
          </p>
        </Revelar>
      </header>

      <div className="contenedor relative -mt-10 pb-16">
        <PanelMisPedidos />
      </div>
    </>
  );
}

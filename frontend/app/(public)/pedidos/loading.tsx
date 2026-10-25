import { Esqueleto, ZonaCargando } from "@/components/ui/Esqueleto";
import { EsqueletoPedidos } from "@/components/pedidos/PanelMisPedidos";

/** Carga de `/pedidos`: la misma sábana y la rejilla de `PanelMisPedidos`. */
export default function CargandoPedidos() {
  return (
    <ZonaCargando etiqueta="Cargando tus pedidos…">
      <div className="sabana bajo-nav" aria-hidden="true">
        <div className="contenedor pb-16 pt-6 md:pb-20 md:pt-10">
          <Esqueleto className="h-4 w-20 bg-sabana-vidrio" />
          <Esqueleto className="mt-3 h-[clamp(2.25rem,4vw,3.5rem)] w-full max-w-[28rem] bg-sabana-vidrio" />
          <Esqueleto className="mt-3 h-6 w-full max-w-[24rem] bg-sabana-vidrio" />
        </div>
      </div>
      <div className="contenedor relative -mt-10 pb-16">
        <EsqueletoPedidos />
      </div>
    </ZonaCargando>
  );
}

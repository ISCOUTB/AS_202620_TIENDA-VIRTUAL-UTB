import { ZonaCargando } from "@/components/ui/Esqueleto";
import { EsqueletoAdmin } from "@/components/admin/RequiereAdmin";

/** Carga del panel: cabecera, KPI y tabla con sus medidas finales. */
export default function CargandoAdmin() {
  return (
    <ZonaCargando etiqueta="Cargando el panel…" className="contenedor pb-12">
      <EsqueletoAdmin />
    </ZonaCargando>
  );
}

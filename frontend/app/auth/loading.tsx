import { EsqueletoFormulario, ZonaCargando } from "@/components/ui/Esqueleto";

/** Carga de `/auth/*`: el formulario con sus campos y botón. */
export default function CargandoAuth() {
  return (
    <ZonaCargando etiqueta="Cargando el acceso…">
      <EsqueletoFormulario campos={2} />
    </ZonaCargando>
  );
}

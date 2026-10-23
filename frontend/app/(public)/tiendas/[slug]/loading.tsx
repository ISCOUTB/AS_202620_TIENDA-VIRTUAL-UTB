import {
  Esqueleto,
  EsqueletoDetalle,
  EsqueletoRejillaProductos,
  ZonaCargando,
} from "@/components/ui/Esqueleto";

/**
 * Carga de la página de una tienda: misma sábana con las cinco pastillas,
 * cabecera de foto de 260 px, rejilla de la carta y resumen lateral. Cada
 * bloque mide lo mismo que el contenido final.
 */
export default function CargandoTienda() {
  return (
    <ZonaCargando etiqueta="Cargando la tienda…">
      <div className="sabana bajo-nav" aria-hidden="true">
        <div className="contenedor flex gap-2 overflow-hidden pb-7 pt-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Esqueleto key={i} className="h-11 w-28 shrink-0 rounded-pill bg-sabana-vidrio" />
          ))}
        </div>
      </div>
      <div className="contenedor pb-16 pt-5 md:pt-7">
        <EsqueletoDetalle />
        <div className="mt-7 flex flex-wrap items-start gap-7">
          <div className="min-w-0 flex-[999_1_560px]">
            <Esqueleto className="h-[52px] w-full rounded-[16px] sm:w-[22rem]" />
            <div className="mt-2 sm:mt-[18px]">
              <EsqueletoRejillaProductos n={6} />
            </div>
          </div>
          <div aria-hidden="true" className="hidden min-w-0 flex-[1_1_320px] rounded-lg bg-tarjeta p-6 shadow-tarjeta lg:block">
            <Esqueleto className="h-8 w-40" />
            <Esqueleto className="mt-3 h-5 w-full" />
            <Esqueleto className="mt-6 h-8 w-full" />
            <Esqueleto className="mt-4 h-14 w-full rounded-md" />
          </div>
        </div>
      </div>
    </ZonaCargando>
  );
}

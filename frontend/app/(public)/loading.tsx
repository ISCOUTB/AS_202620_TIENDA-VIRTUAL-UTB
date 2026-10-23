import { Esqueleto, EsqueletoTiendaCard, ZonaCargando } from "@/components/ui/Esqueleto";

/**
 * Carga genérica del sitio público (portada y páginas legales): la sábana
 * con titular y buscador y, solapada, la tarjeta de «Elige tienda». Las
 * rutas con forma propia (tienda, cuenta) tienen su propio `loading.tsx`.
 */
export default function CargandoPublico() {
  return (
    <ZonaCargando etiqueta="Cargando…">
      <div className="sabana bajo-nav" aria-hidden="true">
        <div className="contenedor pb-[60px] pt-4 md:pb-[110px] md:pt-10">
          <Esqueleto className="h-4 w-56 bg-sabana-vidrio" />
          <Esqueleto className="mt-3 h-[clamp(4.5rem,9vw,8.5rem)] w-full max-w-[34rem] bg-sabana-vidrio" />
          <Esqueleto className="mt-7 h-14 w-full max-w-[34rem] rounded-pill bg-sabana-vidrio" />
        </div>
      </div>
      <div className="contenedor relative -mt-8 pb-16 md:-mt-16" aria-hidden="true">
        <div className="-mx-[var(--tk-margen)] rounded-t-lg bg-tarjeta px-5 pb-6 pt-[22px] md:mx-0 md:rounded-xl md:p-8 md:shadow-tarjeta">
          <Esqueleto className="h-8 w-48" />
          <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
            {Array.from({ length: 5 }, (_, i) => (
              <EsqueletoTiendaCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </ZonaCargando>
  );
}

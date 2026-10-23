/**
 * Esqueletos de carga (SPEC v4 §2.10).
 *
 * - Colores del tema (`--tk-esqueleto`, `--tk-esqueleto-brillo`): se ven bien
 *   en claro y en oscuro sin una variante por tema.
 * - Brillo que se desliza con `transform` (globals.css `.esqueleto::after`);
 *   con movimiento reducido el brillo desaparece y queda el bloque quieto.
 * - Cada esqueleto replica la caja del contenido final (misma rejilla, mismas
 *   proporciones, mismos altos de línea) para que al llegar los datos no haya
 *   salto de maquetación.
 * - Son decorativos: el contenedor anuncia la carga una sola vez con
 *   `aria-busy` y un texto solo para lectores de pantalla.
 */

type PropsBloque = { className?: string };

/** Bloque base. El alto y el ancho los da quien lo usa. */
export function Esqueleto({ className = "" }: PropsBloque) {
  return <span aria-hidden="true" className={`esqueleto ${className}`} />;
}

/** Envoltorio accesible de una zona en carga. */
export function ZonaCargando({
  etiqueta,
  children,
  className = "",
}: {
  etiqueta: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{etiqueta}</span>
      {children}
    </div>
  );
}

/**
 * Producto (ProductoCard `adaptable`): fila con miniatura de 88 px en móvil,
 * tarjeta con foto 4:3 desde `sm`. Mismas clases de caja que el componente.
 */
export function EsqueletoProductoCard() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-3.5 border-b border-linea py-4 sm:h-full sm:flex-col sm:items-stretch sm:gap-0 sm:overflow-hidden sm:rounded-tarjeta sm:border sm:bg-tarjeta sm:py-0"
    >
      <Esqueleto className="h-[88px] w-[88px] shrink-0 rounded-md sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-1.5 sm:px-5 sm:pb-5 sm:pt-4">
        <Esqueleto className="h-5 w-3/4 sm:h-[1.375rem]" />
        <Esqueleto className="h-4 w-1/2" />
        <div className="mt-1.5 flex items-center justify-between gap-3 sm:mt-auto sm:pt-2.5">
          <Esqueleto className="h-6 w-20" />
          <Esqueleto className="h-11 w-11 rounded-pill sm:w-28" />
        </div>
      </div>
    </div>
  );
}

/** Tarjeta de tienda de la portada (TarjetaTienda). */
export function EsqueletoTiendaCard() {
  return (
    <div aria-hidden="true" className="flex flex-col overflow-hidden rounded-tarjeta bg-suave">
      <Esqueleto className="aspect-[16/10] w-full rounded-none" />
      <Esqueleto className="relative -mt-7 ml-5 h-14 w-14 rounded-[18px]" />
      <div className="flex flex-col gap-1.5 px-5 pb-5 pt-3">
        <Esqueleto className="h-3.5 w-24" />
        <Esqueleto className="h-7 w-2/3" />
        <Esqueleto className="h-4 w-full" />
        <Esqueleto className="h-4 w-4/5" />
      </div>
    </div>
  );
}

/** Filas de lista: carrito, pedidos, inventario en móvil. */
export function EsqueletoFilas({ filas = 4, miniatura = true }: { filas?: number; miniatura?: boolean }) {
  return (
    <ul aria-hidden="true" className="flex flex-col">
      {Array.from({ length: filas }, (_, i) => (
        <li key={i} className="flex items-center gap-3 border-b border-linea py-3">
          {miniatura ? <Esqueleto className="h-12 w-12 shrink-0" /> : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Esqueleto className="h-[1.125rem] w-3/5" />
            <Esqueleto className="h-4 w-1/4" />
          </div>
          <Esqueleto className="h-11 w-[7.5rem] shrink-0 rounded-pill" />
        </li>
      ))}
    </ul>
  );
}

/** Rejilla de N tarjetas de producto, con la misma rejilla que la carta. */
export function EsqueletoRejillaProductos({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {Array.from({ length: n }, (_, i) => (
        <EsqueletoProductoCard key={i} />
      ))}
    </div>
  );
}

/** Cabecera de una vista de detalle (tienda, cuenta): foto + título + chips. */
export function EsqueletoDetalle() {
  return (
    <div aria-hidden="true">
      <Esqueleto className="h-[260px] w-full rounded-xl" />
      <div className="mt-7 flex flex-wrap gap-2">
        <Esqueleto className="h-[30px] w-40 rounded-pill" />
        <Esqueleto className="h-[30px] w-36 rounded-pill" />
        <Esqueleto className="h-[30px] w-32 rounded-pill" />
      </div>
    </div>
  );
}

/** Tabla de inventario (admin): cabecera + filas de 5 columnas. */
export function EsqueletoTabla({ filas = 6 }: { filas?: number }) {
  return (
    <div aria-hidden="true" className="tarjeta overflow-hidden">
      <div className="hidden grid-cols-[1fr_8rem_7rem_8rem] gap-4 border-b border-linea px-5 py-3.5 md:grid">
        <Esqueleto className="h-4 w-24" />
        <Esqueleto className="h-4 w-16" />
        <Esqueleto className="h-4 w-20" />
        <Esqueleto className="h-4 w-16 justify-self-end" />
      </div>
      {Array.from({ length: filas }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-linea px-5 py-4 last:border-b-0 md:grid-cols-[1fr_8rem_7rem_8rem]"
        >
          <div className="flex flex-col gap-1.5">
            <Esqueleto className="h-[1.125rem] w-1/2" />
            <Esqueleto className="h-4 w-1/3" />
          </div>
          <Esqueleto className="hidden h-5 w-16 md:block" />
          <Esqueleto className="hidden h-6 w-10 md:block" />
          <Esqueleto className="h-11 w-[7.5rem] justify-self-end rounded-pill" />
        </div>
      ))}
    </div>
  );
}

/** Formulario de acceso o registro. */
export function EsqueletoFormulario({ campos = 2 }: { campos?: number }) {
  return (
    <div aria-hidden="true" className="tarjeta p-6 sm:p-8">
      <Esqueleto className="h-4 w-20" />
      <Esqueleto className="mt-3 h-9 w-3/4" />
      <Esqueleto className="mt-3 h-5 w-full" />
      <div className="mt-7 flex flex-col gap-5">
        {Array.from({ length: campos }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Esqueleto className="h-[1.3125rem] w-32" />
            <Esqueleto className="h-[52px] w-full rounded-sm" />
          </div>
        ))}
        <Esqueleto className="h-14 w-full rounded-pill" />
      </div>
    </div>
  );
}

import { Nav } from "@/components/chrome/Nav";
import { NavInferior } from "@/components/chrome/NavInferior";
import { Footer } from "@/components/chrome/Footer";
import { BarraPedido } from "@/components/tienda/BarraPedido";
import { PanelPedido } from "@/components/tienda/PanelPedido";
import { CatalogoProvider } from "@/components/tienda/CatalogoProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { jsonLdSitio } from "@/lib/seo";
import { obtenerCatalogo } from "@/lib/catalogo-servidor";

/**
 * Shell público (SPEC v4 §2.7). Cada página empieza con una sábana azul
 * (`.sabana.bajo-nav`) sobre la que flota `Nav`. En móvil manda la
 * navegación inferior; el pedido vive en un panel global.
 *
 * El catálogo de la petición se lee aquí una vez y llega a los componentes
 * de cliente (carrito, barra, panel) por `CatalogoProvider`.
 */
export default async function LayoutPublico({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const catalogo = await obtenerCatalogo();
  // `overflow-x-clip`: nada de lo que hay dentro puede ensanchar la página.
  // En móvil, un desborde horizontal agranda el viewport de maquetación
  // (aunque `body` tenga `overflow-x: hidden`) y lo `fixed` —la barra
  // «Ver pedido», la navegación inferior— se estira y se corta a la
  // derecha. `clip` no crea contenedor de desplazamiento: `sticky` sigue
  // funcionando.
  return (
    <CatalogoProvider catalogo={catalogo}>
      <div className="group/publico relative overflow-x-clip">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-pill focus:bg-tarjeta focus:px-5 focus:py-3 focus:font-bold focus:text-tinta focus:shadow-alta"
        >
          Saltar al contenido
        </a>
        <JsonLd datos={jsonLdSitio()} />
        <Nav />
        <main id="contenido" tabIndex={-1} className="outline-none">
          {children}
        </main>
        {/* En móvil el pie reserva justo lo que tapa lo fijo de abajo: la
            navegación inferior (4rem + 1px de filo + su relleno inferior) y,
            solo si existe la barra «Ver pedido» (`data-barra-pedido`), su
            altura y su separación (5rem + 60px sobre el mismo relleno). El
            respiro lo pone el `py-6` propio del pie. Desde `lg` no hay nada. */}
        <Footer className="max-lg:pb-[calc(4rem+1px+max(0.5rem,env(safe-area-inset-bottom)))] max-lg:group-has-[[data-barra-pedido]]/publico:pb-[calc(8.75rem+max(0.5rem,env(safe-area-inset-bottom)))]" />
        <NavInferior />
        <BarraPedido />
        <PanelPedido />
      </div>
    </CatalogoProvider>
  );
}

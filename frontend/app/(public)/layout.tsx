import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";
import { CarritoBarra } from "@/components/tienda/CarritoBarra";
import { JsonLd } from "@/components/seo/JsonLd";
import { jsonLdSitio } from "@/lib/seo";

export default function LayoutPublico({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--tk-radio-pill)] focus:bg-amarillo focus:px-4 focus:py-2 focus:font-display focus:font-semibold focus:text-tinta"
      >
        Saltar al contenido
      </a>
      <JsonLd datos={jsonLdSitio()} />
      <Nav />
      <main id="contenido">{children}</main>
      <Footer />
      {/* Deja sitio a la barra inferior flotante de móvil. */}
      <div aria-hidden="true" className="h-20 lg:hidden" />
      <CarritoBarra />
    </>
  );
}

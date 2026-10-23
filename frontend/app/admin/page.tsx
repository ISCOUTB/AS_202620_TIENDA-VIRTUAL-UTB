import type { Metadata } from "next";
import { PRODUCTOS } from "@/lib/catalogo";
import { TIENDAS, paletaTienda } from "@/lib/tiendas";
import { formatoPrecio } from "@/lib/formato";
import { Badge } from "@/components/ui/Badge";
import { IconoTienda } from "@/components/ui/Icono";
import { Revelar } from "@/components/motion/Revelar";
import { TablaInventario } from "@/components/admin/TablaInventario";

export const metadata: Metadata = {
  title: "Inventario",
  robots: { index: false, follow: false },
};

function Kpi({
  rotulo,
  valor,
  nota,
  tono = "neutro",
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tono?: "neutro" | "alerta";
}) {
  return (
    <div data-escalon="" className="rounded-tarjeta bg-tarjeta p-5 shadow-tarjeta">
      <p className="rotulo text-tenue">{rotulo}</p>
      <p
        className={[
          "cifra mt-2 text-[2rem] font-bold leading-none",
          tono === "alerta" ? "text-error" : "text-tinta",
        ].join(" ")}
      >
        {valor}
      </p>
      <p className="mt-2 text-[0.8125rem] leading-snug text-tenue">{nota}</p>
    </div>
  );
}

export default function PaginaAdmin() {
  const agotados = PRODUCTOS.filter((p) => p.existencias === 0);
  const muestras = PRODUCTOS.filter((p) => p.esMuestra);
  const valorInventario = PRODUCTOS.reduce(
    (total, p) => total + p.precioCentavos * p.existencias,
    0,
  );

  return (
    <div className="contenedor pb-12">
      <Revelar inmediato className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="rotulo text-tenue">Panel de cafetería</p>
            <h1 className="titulo mt-2">Inventario y precios</h1>
            <p className="mt-3 max-w-[62ch] leading-relaxed text-tenue">
              Una sola vista para los cinco puntos. Los datos salen del catálogo
              del frontend mientras la API no exponga el inventario real; cada
              cifra que no viene del servidor se marca como tal.
            </p>
          </div>
          <Badge tono="muestra">Datos de muestra</Badge>
        </div>
      </Revelar>

      <Revelar className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi rotulo="Productos" valor={String(PRODUCTOS.length)} nota="En los cinco puntos de la cafetería." />
        <Kpi
          rotulo="Agotados"
          valor={String(agotados.length)}
          nota="Se muestran al cliente como «Agotado», nunca ocultos."
          tono={agotados.length > 0 ? "alerta" : "neutro"}
        />
        <Kpi
          rotulo="Precios sin confirmar"
          valor={String(muestras.length)}
          nota="Marcados como referencia en la tienda y fuera del índice."
        />
        <Kpi
          rotulo="Valor del inventario"
          valor={formatoPrecio(valorInventario)}
          nota="Precio × existencias del catálogo cargado."
        />
      </Revelar>

      <Revelar as="section" aria-labelledby="por-tienda" className="mt-12">
        <h2 id="por-tienda" className="titulo-seccion">
          Por tienda
        </h2>
        <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {TIENDAS.map((t) => {
            const p = paletaTienda(t.slug);
            const productos = PRODUCTOS.filter((x) => x.tienda === t.slug);
            const agotado = productos.filter((x) => x.existencias === 0).length;
            return (
              <li key={t.slug} data-escalon="" className={`rounded-tarjeta p-4 ${p.suave}`}>
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 items-center justify-center rounded-xs ${p.relleno} ${p.sobreRelleno}`}
                  >
                    <IconoTienda slug={t.slug} tamano={20} />
                  </span>
                  <span className="font-semibold">{t.nombre}</span>
                </div>
                <p className="cifra mt-3 text-2xl font-bold">{productos.length}</p>
                <p className="text-[0.8125rem] text-tenue">
                  productos{agotado > 0 ? ` · ${agotado} agotados` : ""}
                </p>
                <p className={`mt-1.5 text-xs font-bold ${p.tinta}`}>{t.categoria}</p>
              </li>
            );
          })}
        </ul>
      </Revelar>

      <section aria-labelledby="tabla" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="tabla" className="titulo-seccion">
            Tabla de inventario
          </h2>
          {agotados.length > 0 ? (
            <p className="text-[0.8125rem] text-tenue">
              Agotados: {agotados.map((p) => p.nombre).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="mt-5">
          <TablaInventario />
        </div>
      </section>
    </div>
  );
}

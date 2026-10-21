import type { Metadata } from "next";
import { PRODUCTOS } from "@/lib/catalogo";
import { TIENDAS, clasesAcento } from "@/lib/tiendas";
import { formatoPrecio } from "@/lib/formato";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Badge } from "@/components/ui/Badge";
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
    <div className="tarjeta border-t-2 border-azure p-5">
      <Etiqueta>{rotulo}</Etiqueta>
      <p
        className={[
          "cifra mt-2 font-display text-[2rem] font-extrabold leading-none",
          tono === "alerta" ? "text-error" : "text-superficie",
        ].join(" ")}
      >
        {valor}
      </p>
      <p className="mt-2 font-cuerpo text-[0.8125rem] leading-snug text-tenue">
        {nota}
      </p>
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
    <div className="contenedor py-10 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Etiqueta>Panel de cafetería</Etiqueta>
          <h1 className="mt-3 text-[clamp(2rem,1.4rem+3vw,3.25rem)] text-superficie">
            Inventario y precios.
          </h1>
          <p className="cuerpo mt-3 max-w-[62ch] text-tenue">
            Una sola vista para los cinco puntos. Los datos salen del catálogo
            del frontend mientras la API no exponga el inventario real; cada
            cifra que no viene del servidor se marca como tal.
          </p>
        </div>
        <Badge tono="muestra">Datos de muestra</Badge>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          rotulo="Productos"
          valor={String(PRODUCTOS.length)}
          nota="En los cinco puntos de la cafetería."
        />
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
      </div>

      <section aria-labelledby="por-tienda" className="mt-12">
        <h2
          id="por-tienda"
          className="font-display text-[1.25rem] font-extrabold text-superficie"
        >
          Por tienda
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TIENDAS.map((t) => {
            const productos = PRODUCTOS.filter((p) => p.tienda === t.slug);
            const acento = clasesAcento(t.acento);
            const agotado = productos.filter((p) => p.existencias === 0).length;
            return (
              <li key={t.slug} className="tarjeta border-l-4 p-4">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-4 w-[5px] rounded-[var(--tk-radio-pill)] ${acento.punto}`}
                  />
                  <span className="font-display text-[0.9375rem] font-extrabold text-superficie">
                    {t.nombre}
                  </span>
                </div>
                <p className="cifra mt-3 font-display text-[1.5rem] font-extrabold text-superficie">
                  {productos.length}
                </p>
                <p className="font-cuerpo text-[0.8125rem] text-tenue">
                  productos
                  {agotado > 0 ? ` · ${agotado} agotados` : ""}
                </p>
                <p className="mt-2 font-cuerpo text-[0.75rem] leading-snug text-tenue">
                  {t.categoria}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="tabla" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="tabla"
            className="font-display text-[1.25rem] font-extrabold text-superficie"
          >
            Tabla de inventario
          </h2>
          {agotados.length > 0 ? (
            <p className="font-cuerpo text-[0.8125rem] text-tenue">
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

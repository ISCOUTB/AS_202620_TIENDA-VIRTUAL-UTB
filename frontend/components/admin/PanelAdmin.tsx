"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProductOut } from "@/lib/api/generated/contract";
import { ApiError } from "@/lib/api/client";
import { cargarPanel, type DatosPanel } from "@/lib/admin";
import { useSesion } from "@/lib/sesion";
import { administraTienda, gestionaInventario, tiendasGestionadas } from "@/lib/roles";
import { SLUGS_TIENDA, paletaTienda, type SlugTienda } from "@/lib/tiendas";
import { formatoPrecio } from "@/lib/formato";
import { Boton } from "@/components/ui/Boton";
import { IconoTienda } from "@/components/ui/Icono";
import { Revelar } from "@/components/motion/Revelar";
import { EsqueletoAdmin } from "./RequiereAdmin";
import { TablaInventario } from "./TablaInventario";
import { ColaPedidos } from "./ColaPedidos";
import { FormProducto } from "./FormProducto";

function Kpi({
  rotulo,
  valor,
  nota,
  tono = "neutro",
}: Readonly<{
  rotulo: string;
  valor: string;
  nota: string;
  tono?: "neutro" | "alerta";
}>) {
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

type Carga =
  | { tipo: "cargando" }
  | { tipo: "listo"; datos: DatosPanel }
  | { tipo: "error"; mensaje: string };

/**
 * Panel de cafetería con datos reales (API 0.4.0): KPI, resumen por tienda,
 * inventario editable, cola de pedidos y alta/edición de productos. Cada
 * persona ve solo las tiendas que gestiona (`UserOut.roles`); la API lo
 * vuelve a comprobar en cada escritura.
 */
export function PanelAdmin() {
  const { sesion } = useSesion();
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" });
  // undefined = formulario cerrado; null = producto nuevo.
  const [edicion, setEdicion] = useState<ProductOut | null | undefined>(undefined);

  const cargar = useCallback(async () => {
    try {
      setCarga({ tipo: "listo", datos: await cargarPanel() });
    } catch (e) {
      const mensaje =
        e instanceof ApiError && e.esCaida
          ? "No pudimos conectar con la tienda. El panel necesita la API para mostrar datos reales."
          : e instanceof ApiError
            ? e.message
            : "No se pudo cargar el panel.";
      setCarga({ tipo: "error", mensaje });
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const usuario = sesion?.usuario;
  const vista = useMemo(() => {
    if (carga.tipo !== "listo" || !usuario) return null;
    const alcance = tiendasGestionadas(usuario);
    const tiendas = carga.datos.tiendas.filter(
      (t) => alcance === "todas" || alcance.includes(t.id),
    );
    const slugs = new Set(tiendas.map((t) => t.identificador));
    const filas = carga.datos.filas.filter((f) => slugs.has(f.producto.tienda ?? ""));
    return {
      tiendas,
      filas,
      administrables: tiendas.filter((t) => administraTienda(usuario, t.id)),
      conInventario: tiendas.filter((t) => gestionaInventario(usuario, t.id)),
    };
  }, [carga, usuario]);

  if (sesion?.modo === "demo") {
    return (
      <div className="contenedor pb-12">
        <p className="rounded-xl bg-aviso-suave p-6 text-aviso">
          <strong className="font-bold">Modo demostración.</strong> El panel
          trabaja solo con datos reales y esta sesión no está conectada a la
          tienda. Entra con una cuenta real cuando la API esté disponible.
        </p>
      </div>
    );
  }

  if (carga.tipo === "cargando" || !usuario) {
    return (
      <div className="contenedor pb-12" aria-busy="true">
        <span className="sr-only">Cargando el panel…</span>
        <EsqueletoAdmin />
      </div>
    );
  }

  if (carga.tipo === "error" || !vista) {
    return (
      <div className="contenedor pb-12">
        <div role="alert" className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8">
          <p className="text-error">{carga.tipo === "error" ? carga.mensaje : "Sin datos."}</p>
          <div className="mt-4">
            <Boton variante="primario" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          </div>
        </div>
      </div>
    );
  }

  const { tiendas, filas, administrables, conInventario } = vista;
  const activos = filas.filter((f) => f.producto.activo !== false);
  const agotados = activos.filter((f) => f.existencias === 0);
  const muestras = activos.filter((f) => f.producto.precio_confirmado === false);
  const valorInventario = activos.reduce(
    (total, f) => total + f.producto.precio_centavos * f.existencias,
    0,
  );

  function actualizarExistencias(productoId: number, existencias: number) {
    setCarga((c) =>
      c.tipo === "listo"
        ? {
            ...c,
            datos: {
              ...c.datos,
              filas: c.datos.filas.map((f) =>
                f.producto.id === productoId ? { ...f, existencias } : f,
              ),
            },
          }
        : c,
    );
  }

  function productoGuardado(producto: ProductOut) {
    setEdicion(undefined);
    setCarga((c) => {
      if (c.tipo !== "listo") return c;
      const existe = c.datos.filas.some((f) => f.producto.id === producto.id);
      const filasNuevas = existe
        ? c.datos.filas.map((f) => (f.producto.id === producto.id ? { ...f, producto } : f))
        : [...c.datos.filas, { producto, existencias: 0 }];
      return { ...c, datos: { ...c.datos, filas: filasNuevas } };
    });
  }

  return (
    <div className="contenedor pb-12">
      <Revelar inmediato className="rounded-xl bg-tarjeta p-6 shadow-tarjeta md:p-8">
        <p className="rotulo text-tenue">Panel de cafetería</p>
        <h1 className="titulo mt-2">Inventario, pedidos y precios</h1>
        <p className="mt-3 max-w-[62ch] leading-relaxed text-tenue">
          {tiendas.length === 1
            ? `Gestionas ${tiendas[0].nombre}.`
            : `Gestionas ${tiendas.length} tiendas.`}{" "}
          Los datos salen de la API y cada cambio se guarda al momento.
        </p>
      </Revelar>

      <Revelar className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi rotulo="Productos a la venta" valor={String(activos.length)} nota={`${filas.length - activos.length} inactivos.`} />
        <Kpi
          rotulo="Agotados"
          valor={String(agotados.length)}
          nota="Se muestran al cliente como «Agotado», nunca ocultos."
          tono={agotados.length > 0 ? "alerta" : "neutro"}
        />
        <Kpi
          rotulo="Precios sin confirmar"
          valor={String(muestras.length)}
          nota="Marcados como referencia en la tienda."
        />
        <Kpi
          rotulo="Valor del inventario"
          valor={formatoPrecio(valorInventario)}
          nota="Precio × existencias de lo que está a la venta."
        />
      </Revelar>

      <Revelar as="section" aria-labelledby="por-tienda" className="mt-12">
        <h2 id="por-tienda" className="titulo-seccion">
          Por tienda
        </h2>
        <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {tiendas.map((t) => {
            const p = paletaTienda(t.identificador);
            const propios = activos.filter((f) => f.producto.tienda === t.identificador);
            const agotado = propios.filter((f) => f.existencias === 0).length;
            return (
              <li key={t.id} data-escalon="" className={`rounded-tarjeta p-4 ${p.suave}`}>
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 items-center justify-center rounded-xs ${p.relleno} ${p.sobreRelleno}`}
                  >
                    {SLUGS_TIENDA.includes(t.identificador as SlugTienda) ? (
                      <IconoTienda slug={t.identificador as SlugTienda} tamano={20} />
                    ) : null}
                  </span>
                  <span className="font-semibold">{t.nombre}</span>
                </div>
                <p className="cifra mt-3 text-2xl font-bold">{propios.length}</p>
                <p className="text-[0.8125rem] text-tenue">
                  productos{agotado > 0 ? ` · ${agotado} agotados` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </Revelar>

      {conInventario.length > 0 ? (
        <section aria-labelledby="cola" className="mt-12">
          <h2 id="cola" className="titulo-seccion">
            Pedidos
          </h2>
          <div className="mt-5">
            <ColaPedidos tiendas={conInventario} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="tabla" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="tabla" className="titulo-seccion">
            Inventario
          </h2>
          {administrables.length > 0 && edicion === undefined ? (
            <Boton variante="suave" onClick={() => setEdicion(null)}>
              Producto nuevo
            </Boton>
          ) : null}
        </div>
        {edicion !== undefined ? (
          <div className="mt-5">
            <FormProducto
              key={edicion?.id ?? "nuevo"}
              tiendas={administrables}
              producto={edicion}
              alGuardar={productoGuardado}
              alCerrar={() => setEdicion(undefined)}
            />
          </div>
        ) : null}
        <div className="mt-5">
          <TablaInventario
            filas={filas}
            tiendas={tiendas}
            usuario={usuario}
            alActualizar={actualizarExistencias}
            alEditar={(p) => {
              setEdicion(p);
              document.getElementById("tabla")?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      </section>
    </div>
  );
}

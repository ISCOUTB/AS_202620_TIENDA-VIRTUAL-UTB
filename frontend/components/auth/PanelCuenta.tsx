"use client";

import Link from "next/link";
import Image from "next/image";
import { useSesion, cerrarSesion } from "@/lib/sesion";
import { useCarrito, totalCentavos, unidades, porTienda } from "@/lib/carrito";
import { formatoPrecio } from "@/lib/formato";
import { productoPorId } from "@/lib/catalogo";
import { acentoDeTienda, clasesAcento, nombreTienda } from "@/lib/tiendas";
import { LOGO } from "@/lib/imagenes";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Badge } from "@/components/ui/Badge";
import { Boton } from "@/components/ui/Boton";

/**
 * El pase de la cuenta. Siguiendo la app oficial, la tarjeta de identidad es
 * un **carnet**: superficie clara, ligeramente inclinado, con el logo de la
 * institución, las iniciales y el código (design/SPEC.md v3 §2.6).
 */
export function PanelCuenta() {
  const { sesion } = useSesion();
  const { carrito } = useCarrito();

  if (!sesion) return null;
  const { usuario, modo } = sesion;
  const iniciales = usuario.nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const n = unidades(carrito);
  const total = totalCentavos(carrito);
  const grupos = porTienda(carrito);

  return (
    <div className="contenedor py-12 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Etiqueta>Mi pase</Etiqueta>
          <h1 className="mt-3 text-[clamp(2.25rem,1.5rem+3vw,3.75rem)] text-superficie">
            Hola, {usuario.nombre.split(" ")[0]}.
          </h1>
        </div>
        <button
          type="button"
          onClick={cerrarSesion}
          className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-tenue underline underline-offset-4 hover:text-superficie"
        >
          Cerrar sesión
        </button>
      </div>

      {modo === "demo" ? (
        <div className="mt-8 flex items-start gap-3 rounded-[var(--tk-radio-sm)] border-l-4 border-ambar bg-ambar/10 px-4 py-3">
          <p className="font-cuerpo text-[0.9375rem] leading-snug text-superficie">
            <strong className="font-semibold">Modo demostración.</strong> El
            módulo de identidad todavía no está en producción: esta sesión vive
            solo en tu navegador y no crea pedidos reales.
          </p>
        </div>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        {/* El carnet */}
        <section aria-labelledby="datos" className="lg:col-span-5">
          <div className="credencial -rotate-[1.5deg] p-5">
            <div className="flex items-start justify-between gap-3">
              <Image
                src={LOGO.src}
                alt={LOGO.alt}
                width={LOGO.ancho}
                height={LOGO.alto}
                className="h-7 w-auto"
              />
              <span className="rotulo text-deep">Carnet UTB</span>
            </div>

            <div className="mt-5 flex items-center gap-4" id="datos">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--tk-radio-sm)] bg-deep font-display text-[1.25rem] font-extrabold text-superficie">
                {iniciales}
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-display text-[1.125rem] font-extrabold text-deep">
                  {usuario.nombre}
                </h2>
                <p className="truncate font-cuerpo text-[0.875rem] text-tinta/70">
                  {usuario.email}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-deep/15 pt-4">
              <span className="rotulo rounded-[var(--tk-radio-pill)] bg-deep px-2.5 py-1 text-superficie">
                {usuario.rol === "admin" ? "Administración" : "Estudiante"}
              </span>
              <span className="cifra font-display text-[0.9375rem] font-bold text-deep">
                {String(usuario.id).padStart(6, "0")}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Badge tono={modo === "demo" ? "muestra" : "abierto"}>
              {modo === "demo" ? "Demostración" : "Cuenta real"}
            </Badge>
            <Badge tono="abierto">Activo</Badge>
            <span className="rotulo text-tenue">Rol: {usuario.rol}</span>
          </div>

          {usuario.rol === "admin" ? (
            <div className="mt-5">
              <Boton href="/admin" variante="contorno" bloque>
                Ir a administración
              </Boton>
            </div>
          ) : null}
        </section>

        {/* Pedidos */}
        <section aria-labelledby="pedidos" className="lg:col-span-7">
          <div className="flex items-baseline justify-between gap-4 border-b border-linea pb-3">
            <h2 id="pedidos" className="font-display text-[1.25rem] font-extrabold text-superficie">
              Pedidos
            </h2>
            <span className="rotulo cifra text-tenue">0</span>
          </div>

          <div className="tarjeta mt-6 px-6 py-10 text-center">
            <p className="font-display text-[1.0625rem] font-bold text-superficie">
              Todavía no tienes pedidos.
            </p>
            <p className="cuerpo mx-auto mt-2 max-w-[42ch] text-tenue">
              Cuando apartes algo, aquí verás el estado, la hora de recogida y
              el total. No se envía nada por correo: todo queda en tu pase.
            </p>
            <div className="mt-6 flex justify-center">
              <Boton href="/#tiendas" variante="solido">
                Ver las tiendas
              </Boton>
            </div>
          </div>

          {/* Carrito */}
          <div className="mt-10 flex items-baseline justify-between gap-4 border-b border-linea pb-3">
            <h2 className="font-display text-[1.25rem] font-extrabold text-superficie">
              Tu carrito
            </h2>
            <span className="rotulo cifra text-tenue">
              {String(n).padStart(2, "0")}
            </span>
          </div>

          {n === 0 ? (
            <p className="cuerpo mt-4 text-tenue">
              Está vacío. Puedes mezclar productos de varias tiendas en un
              mismo pedido.
            </p>
          ) : (
            <div className="mt-5 flex flex-col gap-4">
              {grupos.map((g) => {
                const acento = clasesAcento(acentoDeTienda(g.tienda));
                return (
                  <div
                    key={g.tienda}
                    className={`tarjeta border-l-4 p-4 ${acento.borde}`}
                  >
                    <p className="rotulo text-tenue">{nombreTienda(g.tienda)}</p>
                    <ul className="mt-2">
                      {g.items.map((item) => (
                        <li
                          key={item.nombre}
                          className="flex items-baseline justify-between gap-4 border-b border-linea py-2 font-cuerpo text-[0.9375rem] text-superficie last:border-b-0"
                        >
                          <span>{item.nombre}</span>
                          <span className="cifra shrink-0 text-tenue">
                            ×{item.cantidad}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {carrito.horaRecogida ? (
                <p className="font-cuerpo text-[0.875rem] text-tenue">
                  Recogida: <span className="cifra text-superficie">{carrito.horaRecogida}</span>
                </p>
              ) : null}

              <div className="flex items-baseline justify-between border-t border-linea pt-3">
                <span className="rotulo text-tenue">Total</span>
                <span className="cifra font-display text-[1.5rem] font-extrabold text-superficie">
                  {formatoPrecio(total)}
                </span>
              </div>

              <p className="font-cuerpo text-[0.8125rem] leading-relaxed text-tenue">
                {carrito.lineas.some(
                  (l) => productoPorId(l.productoId)?.esMuestra,
                )
                  ? "Incluye precios de referencia: la tienda los confirma en el mostrador. "
                  : ""}
                El pedido se confirma al recoger; el pago es en el mostrador.
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-12 font-cuerpo text-[0.875rem] text-tenue">
        ¿Necesitas cambiar algo?{" "}
        <Link href="/#tiendas" className="text-cyan-claro underline underline-offset-4">
          Vuelve al directorio
        </Link>
        .
      </p>
    </div>
  );
}

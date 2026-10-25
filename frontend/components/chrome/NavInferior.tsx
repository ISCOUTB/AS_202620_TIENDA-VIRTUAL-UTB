"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSesion } from "@/lib/sesion";
import { useCarrito, unidades } from "@/lib/carrito";
import { Icono, type NombreIcono } from "@/components/ui/Icono";
import { ContadorPedido } from "./ContadorPedido";

/**
 * Navegación inferior de móvil (artefacto «A · Inicio móvil»): Inicio ·
 * Tiendas · Pedidos · Cuenta. El destino activo lleva la pastilla azul suave
 * detrás del ícono. «Pedidos» lleva a `/pedidos` (carrito y pedidos hechos);
 * el panel lateral queda para apartar.
 * En `lg` y más no existe.
 */
export function NavInferior() {
  const ruta = usePathname();
  const { sesion } = useSesion();
  const { carrito } = useCarrito();
  const n = unidades(carrito);

  const items: Array<{
    clave: string;
    href: string;
    etiqueta: string;
    icono: NombreIcono;
    activa: boolean;
  }> = [
    { clave: "inicio", href: "/", etiqueta: "Inicio", icono: "inicio", activa: ruta === "/" },
    {
      clave: "tiendas",
      href: "/#tiendas",
      etiqueta: "Tiendas",
      icono: "tiendas",
      activa: ruta.startsWith("/tiendas"),
    },
    {
      clave: "pedidos",
      href: "/pedidos",
      etiqueta: "Pedidos",
      icono: "pedidos",
      activa: ruta.startsWith("/pedidos"),
    },
    {
      clave: "cuenta",
      href: "/cuenta",
      etiqueta: "Cuenta",
      icono: "cuenta",
      activa: ruta.startsWith("/cuenta"),
    },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-tarjeta pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-2">
        {items.map((it) => {
          const contenido = (
            <>
              <span
                className={[
                  "relative flex h-[30px] w-14 items-center justify-center rounded-pill transition-colors duration-[var(--tk-dur)]",
                  it.activa ? "bg-primario-suave" : "",
                ].join(" ")}
              >
                <Icono nombre={it.icono} tamano={22} />
                {it.clave === "pedidos" ? (
                  <ContadorPedido n={n} className="absolute -top-1 right-1.5" />
                ) : null}
              </span>
              <span className="text-[0.6875rem]">
                {it.etiqueta}
                {it.clave === "pedidos" && n > 0 ? (
                  <span className="sr-only">: {n} {n === 1 ? "unidad" : "unidades"}</span>
                ) : null}
                {it.clave === "cuenta" && sesion ? (
                  <span className="sr-only"> de {sesion.usuario.nombre.split(" ")[0]}</span>
                ) : null}
              </span>
            </>
          );
          const clases = [
            "flex min-h-14 w-full flex-col items-center justify-center gap-1",
            it.activa ? "font-bold text-enlace" : "font-semibold text-tenue",
          ].join(" ");

          return (
            <li key={it.clave}>
              <Link href={it.href} aria-current={it.activa ? "page" : undefined} className={clases}>
                {contenido}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

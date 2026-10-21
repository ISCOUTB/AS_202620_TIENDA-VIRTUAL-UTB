"use client";

import { useState } from "react";
import type { Producto } from "@/lib/catalogo";
import { formatoPrecio } from "@/lib/formato";
import { agregar } from "@/lib/carrito";
import { clasesAcento, type Acento } from "@/lib/tiendas";
import { Badge } from "@/components/ui/Badge";
import { Boton } from "@/components/ui/Boton";

/**
 * Producto como tarjeta con barra de acento a la izquierda (design/SPEC.md v3
 * §2.4): el mismo gesto con el que la app marca la clase en curso.
 *
 * Las 13 fotos todavía no están asignadas a productos, así que la tarjeta no
 * lleva foto: nombre, descripción, sabores, precio y estado. Es también el
 * patrón que menos texto oculta en móvil.
 */
export function ProductoCard({
  producto,
  acento,
}: {
  producto: Producto;
  acento: Acento;
}) {
  const [agregado, setAgregado] = useState(false);
  const agotado = producto.existencias <= 0;
  const color = clasesAcento(acento);

  function anadir() {
    if (agotado) return;
    agregar(producto.id, 1);
    setAgregado(true);
    window.setTimeout(() => setAgregado(false), 1600);
  }

  return (
    <li
      id={producto.slug}
      className={[
        "tarjeta flex flex-col gap-4 border-l-4 p-5",
        color.borde,
        agotado ? "opacity-80" : "",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
          <h3 className="font-display text-[1.1875rem] font-extrabold tracking-[-0.01em] text-superficie">
            {producto.nombre}
          </h3>
          {producto.presentacion ? (
            <span className="rotulo text-tenue">{producto.presentacion}</span>
          ) : null}
          {agotado ? <Badge tono="agotado">Agotado</Badge> : null}
          {producto.esMuestra ? <Badge tono="muestra">Referencia</Badge> : null}
        </div>

        <p className="mt-2 max-w-[58ch] font-cuerpo text-[0.9375rem] leading-relaxed text-tenue">
          {producto.descripcion}
        </p>

        {producto.sabores?.length ? (
          <p className="mt-2 font-cuerpo text-[0.8125rem] text-tenue">
            Sabores: {producto.sabores.join(" · ")}.{" "}
            <span className="text-cyan-claro">El sabor se elige al recoger.</span>
          </p>
        ) : null}

        {!agotado ? (
          <p className="mt-2 font-cuerpo text-[0.8125rem] text-tenue">
            <span className="cifra text-superficie">{producto.existencias}</span>{" "}
            {producto.existencias === 1 ? "unidad disponible" : "unidades disponibles"}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-linea pt-4">
        <span className="cifra font-display text-[1.5rem] font-extrabold leading-none text-superficie">
          {formatoPrecio(producto.precioCentavos)}
        </span>
        <Boton
          variante={agregado ? "ambar" : "contorno"}
          onClick={anadir}
          disabled={agotado}
          aria-label={
            agotado
              ? `${producto.nombre} está agotado`
              : `Añadir ${producto.nombre} al carrito`
          }
        >
          {agotado ? "Sin unidades" : agregado ? "Añadido ✓" : "Añadir"}
        </Boton>
      </div>
    </li>
  );
}

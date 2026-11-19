"use client";

import { useRef, useState } from "react";
import type { Producto } from "@/lib/catalogo";
import { agregar, cambiarCantidad, useCarrito } from "@/lib/carrito";
import { gsap, useGSAP, CONDICIONES, MOVIMIENTO } from "@/lib/movimiento";
import { useCatalogo } from "./CatalogoProvider";

/**
 * Estado y acciones de un producto frente al pedido, compartidos por la
 * tarjeta de la portada (`ProductoCard`) y la fila de la carta
 * (`ProductoFila`): cuántas unidades lleva, si se puede apartar, sumar y
 * restar con su anuncio para lectores de pantalla, y el rebote de
 * confirmación (GSAP, solo `transform`) sobre el elemento `accion`.
 *
 * Las reglas del pedido viven en `lib/carrito.ts`; aquí solo se conectan.
 */
export function useProductoEnPedido(producto: Producto) {
  const { carrito } = useCarrito();
  const cantidad = carrito.lineas.find((l) => l.productoId === producto.id)?.cantidad ?? 0;
  const agotado = producto.existencias <= 0;
  // Catálogo de respaldo: sin existencias reales no se aparta (AvisoRespaldo).
  const enPausa = useCatalogo().origen === "respaldo";
  const bloqueado = agotado || enPausa;
  const ultimas = !agotado && producto.existencias <= 3;
  const nombre = producto.presentacion
    ? `${producto.nombre} · ${producto.presentacion.toLowerCase()}`
    : producto.nombre;

  const accion = useRef<HTMLDivElement>(null);
  const [anuncio, setAnuncio] = useState("");
  const [pulsos, setPulsos] = useState(0);

  // Rebote de confirmación en la zona de acción cada vez que se agrega.
  useGSAP(
    () => {
      if (pulsos === 0 || !accion.current) return;
      const mm = gsap.matchMedia();
      mm.add(CONDICIONES.movimiento, () => {
        gsap.fromTo(
          accion.current,
          { scale: 0.9 },
          {
            scale: 1,
            duration: MOVIMIENTO.pulso.duracion,
            ease: MOVIMIENTO.pulso.ease,
            clearProps: "transform",
          },
        );
      });
    },
    { dependencies: [pulsos], scope: accion },
  );

  function sumar() {
    if (bloqueado) return;
    agregar(producto, 1);
    setPulsos((n) => n + 1);
    setAnuncio(`${nombre}: ${cantidad + 1} en tu pedido`);
  }

  function restar() {
    cambiarCantidad(producto.id, cantidad - 1, producto.existencias);
    setAnuncio(cantidad - 1 > 0 ? `${nombre}: ${cantidad - 1} en tu pedido` : `${nombre} salió del pedido`);
  }

  /** Texto de existencias: lo agotado se dice, nunca se esconde. */
  const textoExistencias = agotado
    ? "Agotado"
    : ultimas
      ? `Últimas ${producto.existencias} ${producto.existencias === 1 ? "unidad" : "unidades"}`
      : `Quedan ${producto.existencias}`;

  /** Etiqueta accesible del botón de agregar según el estado. */
  const etiquetaAgregar = agotado
    ? `${nombre} está agotado`
    : enPausa
      ? `Apartar ${nombre} está en pausa: sin conexión con la tienda`
      : `Agregar ${nombre} al pedido`;

  return {
    cantidad,
    agotado,
    enPausa,
    bloqueado,
    ultimas,
    nombre,
    accion,
    anuncio,
    sumar,
    restar,
    textoExistencias,
    etiquetaAgregar,
  };
}

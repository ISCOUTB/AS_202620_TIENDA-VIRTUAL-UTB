"use client";

/**
 * Carrito de la tienda.
 *
 * Decisión (plan §4 G6): carrito GLOBAL, no uno por tienda, porque el
 * contrato tiene un solo `POST /orders` con una sola lista de ítems. Cada
 * línea recuerda de qué tienda viene para poder agruparla en el mostrador.
 *
 * Persistencia en `localStorage` con TTL de 24 h, el mismo vencimiento que
 * la saga de pedidos (docs/idempotencia-saga-s11.md).
 */

import { useEffect, useState } from "react";
import { PRODUCTOS, productoPorId } from "@/lib/catalogo";

const CLAVE = "tvutb.carrito";
const TTL_MS = 24 * 60 * 60 * 1000;
const EVENTO = "tvutb:carrito";

/** Evento con el que cualquier pantalla pide abrir el panel del pedido. */
export const EVENTO_ABRIR_PEDIDO = "tvutb:abrir-pedido";

/** Abre el panel del pedido (lo escucha components/tienda/PanelPedido.tsx). */
export function abrirPedido(): void {
  if (disponible()) window.dispatchEvent(new Event(EVENTO_ABRIR_PEDIDO));
}

export type LineaCarrito = {
  productoId: number;
  cantidad: number;
};

export type Carrito = {
  lineas: LineaCarrito[];
  creadoEn: number;
  /** Franja de recogida elegida ("18:40"), o null si aún no se eligió. */
  horaRecogida: string | null;
};

const VACIO: Carrito = { lineas: [], creadoEn: 0, horaRecogida: null };

function disponible(): boolean {
  return typeof window !== "undefined";
}

function emitir(): void {
  if (disponible()) window.dispatchEvent(new Event(EVENTO));
}

export function leerCarrito(): Carrito {
  if (!disponible()) return VACIO;
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return VACIO;
    const carrito = JSON.parse(crudo) as Carrito;
    if (!Array.isArray(carrito.lineas)) return VACIO;
    if (carrito.creadoEn > 0 && Date.now() - carrito.creadoEn > TTL_MS) {
      window.localStorage.removeItem(CLAVE);
      return VACIO;
    }
    return carrito;
  } catch {
    return VACIO;
  }
}

function escribir(carrito: Carrito): void {
  if (!disponible()) return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(carrito));
  } catch {
    // almacenamiento bloqueado: el carrito dura la pestaña
  }
  emitir();
}

export function agregar(productoId: number, cantidad = 1): Carrito {
  const carrito = leerCarrito();
  const producto = productoPorId(productoId);
  if (!producto || producto.existencias <= 0) return carrito;

  const base: Carrito =
    carrito.creadoEn === 0
      ? { lineas: [], creadoEn: Date.now(), horaRecogida: carrito.horaRecogida }
      : carrito;

  const existente = base.lineas.find((l) => l.productoId === productoId);
  const tope = producto.existencias;

  const lineas = existente
    ? base.lineas.map((l) =>
        l.productoId === productoId
          ? { ...l, cantidad: Math.min(tope, l.cantidad + cantidad) }
          : l,
      )
    : [...base.lineas, { productoId, cantidad: Math.min(tope, cantidad) }];

  const actualizado = { ...base, lineas };
  escribir(actualizado);
  return actualizado;
}

export function cambiarCantidad(productoId: number, cantidad: number): Carrito {
  const carrito = leerCarrito();
  const producto = productoPorId(productoId);
  const tope = producto?.existencias ?? 0;
  const lineas =
    cantidad <= 0
      ? carrito.lineas.filter((l) => l.productoId !== productoId)
      : carrito.lineas.map((l) =>
          l.productoId === productoId
            ? { ...l, cantidad: Math.min(tope, cantidad) }
            : l,
        );
  const actualizado = { ...carrito, lineas };
  escribir(actualizado);
  return actualizado;
}

export function quitar(productoId: number): Carrito {
  return cambiarCantidad(productoId, 0);
}

export function vaciar(): void {
  escribir(VACIO);
}

export function elegirHora(hora: string | null): Carrito {
  const carrito = leerCarrito();
  const actualizado = { ...carrito, horaRecogida: hora };
  escribir(actualizado);
  return actualizado;
}

export function totalCentavos(carrito: Carrito): number {
  return carrito.lineas.reduce((total, linea) => {
    const producto = productoPorId(linea.productoId);
    return total + (producto ? producto.precioCentavos * linea.cantidad : 0);
  }, 0);
}

export function unidades(carrito: Carrito): number {
  return carrito.lineas.reduce((n, l) => n + l.cantidad, 0);
}

/** Agrupa las líneas por tienda para mostrarlas como en el mostrador. */
export function porTienda(
  carrito: Carrito,
): Array<{ tienda: string; items: Array<{ nombre: string; cantidad: number }> }> {
  const mapa = new Map<string, Array<{ nombre: string; cantidad: number }>>();
  for (const linea of carrito.lineas) {
    const producto = PRODUCTOS.find((p) => p.id === linea.productoId);
    if (!producto) continue;
    const lista = mapa.get(producto.tienda) ?? [];
    lista.push({ nombre: producto.nombre, cantidad: linea.cantidad });
    mapa.set(producto.tienda, lista);
  }
  return Array.from(mapa, ([tienda, items]) => ({ tienda, items }));
}

export function useCarrito(): { carrito: Carrito; cargando: boolean } {
  const [carrito, setCarrito] = useState<Carrito>(VACIO);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const sincronizar = () => setCarrito(leerCarrito());
    sincronizar();
    setCargando(false);
    window.addEventListener(EVENTO, sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(EVENTO, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  return { carrito, cargando };
}

"use client";

import { createContext, useContext, useEffect } from "react";
import type { Catalogo } from "@/lib/catalogo";
import { depurar } from "@/lib/carrito";

/**
 * Lleva a los componentes de cliente el catálogo que el servidor leyó
 * (lib/catalogo-servidor.ts). Una sola lectura por petición: el carrito, la
 * barra y el panel del pedido ven los mismos precios y existencias que la
 * carta.
 */

const ContextoCatalogo = createContext<Catalogo>({ productos: [], origen: "respaldo" });

export function CatalogoProvider({
  catalogo,
  children,
}: Readonly<{ catalogo: Catalogo; children: React.ReactNode }>) {
  useEffect(() => {
    // Con el respaldo no se depura: sus ids no son los de la base y no se
    // puede saber qué sigue a la venta.
    if (catalogo.origen === "api") depurar(catalogo.productos);
  }, [catalogo]);

  return <ContextoCatalogo.Provider value={catalogo}>{children}</ContextoCatalogo.Provider>;
}

export function useCatalogo(): Catalogo {
  return useContext(ContextoCatalogo);
}

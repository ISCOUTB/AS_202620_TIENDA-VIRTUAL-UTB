import type { Metadata } from "next";
import { PanelAdmin } from "@/components/admin/PanelAdmin";

export const metadata: Metadata = {
  title: "Inventario",
  robots: { index: false, follow: false },
};

/**
 * `/admin`: el panel es de cliente porque todo lo que muestra depende de la
 * sesión (roles por tienda, productos inactivos) y la API solo lo entrega con
 * el token del usuario. El layout ya comprobó que hay un gestor.
 */
export default function PaginaAdmin() {
  return <PanelAdmin />;
}

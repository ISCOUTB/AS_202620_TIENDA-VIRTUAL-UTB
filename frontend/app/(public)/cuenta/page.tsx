import type { Metadata } from "next";
import { RequiereSesion } from "@/components/auth/RequiereSesion";
import { PanelCuenta } from "@/components/auth/PanelCuenta";

export const metadata: Metadata = {
  title: "Mi pase",
  description:
    "Tus datos, tus pedidos y tu carrito en la Tienda Virtual de la cafetería UTB.",
  robots: { index: false, follow: false },
};

export default function PaginaCuenta() {
  return (
    <div className="min-h-svh bg-tinta text-superficie">
      <RequiereSesion>
        <PanelCuenta />
      </RequiereSesion>
    </div>
  );
}

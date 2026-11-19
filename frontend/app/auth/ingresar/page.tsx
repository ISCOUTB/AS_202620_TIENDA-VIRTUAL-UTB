import type { Metadata } from "next";
import { Suspense } from "react";
import { FormIngreso } from "@/components/auth/FormIngreso";
import { Cargador3D } from "@/components/ui/Cargador3D";

export const metadata: Metadata = {
  title: "Ingresar",
  description:
    "Entra con tu correo institucional para apartar y recoger en la cafetería de la UTB.",
  robots: { index: false, follow: false },
};

export default function PaginaIngreso() {
  return (
    // `useSearchParams` obliga a un límite de Suspense: mientras tanto, el
    // cubo de carga en su tamaño compacto.
    <Suspense fallback={<Cargador3D variante="compacto" etiqueta="Cargando el acceso" />}>
      <FormIngreso />
    </Suspense>
  );
}

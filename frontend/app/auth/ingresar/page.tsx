import type { Metadata } from "next";
import { Suspense } from "react";
import { FormIngreso } from "@/components/auth/FormIngreso";
import { EsqueletoFormulario, ZonaCargando } from "@/components/ui/Esqueleto";

export const metadata: Metadata = {
  title: "Ingresar",
  description:
    "Entra con tu correo institucional para apartar y recoger en la cafetería de la UTB.",
  robots: { index: false, follow: false },
};

export default function PaginaIngreso() {
  return (
    // `useSearchParams` obliga a un límite de Suspense: mientras tanto, el
    // esqueleto del formulario con sus mismas medidas.
    <Suspense
      fallback={
        <ZonaCargando etiqueta="Cargando el acceso…">
          <EsqueletoFormulario campos={2} />
        </ZonaCargando>
      }
    >
      <FormIngreso />
    </Suspense>
  );
}

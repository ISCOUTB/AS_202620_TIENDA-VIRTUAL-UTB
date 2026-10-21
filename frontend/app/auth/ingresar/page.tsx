import type { Metadata } from "next";
import { Suspense } from "react";
import { FormIngreso } from "@/components/auth/FormIngreso";

export const metadata: Metadata = {
  title: "Ingresar",
  description:
    "Entra con tu correo institucional para apartar y recoger en la cafetería de la UTB.",
  robots: { index: false, follow: false },
};

export default function PaginaIngreso() {
  return (
    <Suspense
      fallback={
        <div className="tarjeta p-7 sm:p-9">
          <div className="h-3 w-16 rounded-[var(--tk-radio-pill)] bg-tarjeta-alta" />
          <div className="mt-4 h-8 w-3/4 rounded-[var(--tk-radio-sm)] bg-tarjeta-alta" />
          <div className="mt-8 h-12 w-full rounded-[var(--tk-radio-sm)] bg-tarjeta-alta" />
          <div className="mt-6 h-12 w-full rounded-[var(--tk-radio-sm)] bg-tarjeta-alta" />
        </div>
      }
    >
      <FormIngreso />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { FormRegistro } from "@/components/auth/FormRegistro";

export const metadata: Metadata = {
  title: "Crear mi pase",
  description:
    "Crea tu cuenta de la Tienda Virtual UTB con el correo institucional y aparta en las cinco tiendas de la cafetería.",
  robots: { index: false, follow: false },
};

export default function PaginaRegistro() {
  return <FormRegistro />;
}

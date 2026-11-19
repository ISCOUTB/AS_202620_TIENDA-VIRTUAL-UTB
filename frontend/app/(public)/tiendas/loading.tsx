import { Cargador3D } from "@/components/ui/Cargador3D";

/**
 * Carga del módulo «Tiendas». El cubo 3D con el logo (SPEC v5 §2.10) cubre la
 * pantalla mientras se calcula qué tiendas están abiertas.
 */
export default function CargandoTiendas() {
  return <Cargador3D variante="pantalla" etiqueta="Cargando las tiendas" />;
}

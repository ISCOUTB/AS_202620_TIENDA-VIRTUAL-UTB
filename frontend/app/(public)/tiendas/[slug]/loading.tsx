import { Cargador3D } from "@/components/ui/Cargador3D";

/**
 * Carga de la página de una tienda. El cubo 3D con el logo (SPEC v5 §2.10) es
 * la única pieza de carga de las rutas: una marca al centro en vez de una
 * maqueta gris de la página.
 */
export default function CargandoTienda() {
  return <Cargador3D variante="pantalla" etiqueta="Cargando la carta" />;
}

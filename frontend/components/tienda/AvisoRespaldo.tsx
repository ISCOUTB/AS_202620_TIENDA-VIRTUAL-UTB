import { Icono } from "@/components/ui/Icono";

/**
 * Aviso del catálogo de respaldo: la API no respondió y lo que se ve es la
 * carta guardada en el frontend. Se dice siempre, y apartar queda en pausa
 * (ProductoCard y PanelPedido leen `origen`), porque esa carta no trae
 * existencias reales.
 */
export function AvisoRespaldo({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <p
      role="status"
      className={`flex items-start gap-2.5 rounded-sm bg-aviso-suave px-4 py-3 text-sm leading-snug text-aviso ${className}`}
    >
      <Icono nombre="info" tamano={18} className="mt-px shrink-0" />
      <span>
        <strong className="font-bold">No pudimos conectar con la tienda.</strong> Ves la carta
        guardada, sin existencias al día; apartar vuelve en cuanto la conexión regrese.
      </span>
    </p>
  );
}

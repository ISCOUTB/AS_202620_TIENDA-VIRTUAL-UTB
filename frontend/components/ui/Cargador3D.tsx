import Image from "next/image";
import { LOGO } from "@/lib/imagenes";

/**
 * Pantalla de carga (SPEC v5 §2.10): un cubo con el logo de la UTB que gira
 * en 3D sobre un halo de luz, con la frase de lo que se está cargando y una
 * barra de progreso indeterminada.
 *
 * Tres tamaños, uno por tipo de espera:
 * - `pantalla` — rutas (`loading.tsx`): cubre todo, barra incluida, sobre un
 *   fondo esmerilado; nada de la página anterior distrae.
 * - `bloque` — un panel grande que espera la red dentro de una página.
 * - `compacto` — una espera corta dentro de un diálogo o una lista.
 *
 * El giro es CSS puro (`.cubo` en globals.css): funciona antes de que llegue
 * el JavaScript, que es justo cuando se ve un `loading.tsx`. Aparece con un
 * fundido de 150 ms de espera (`.carga-aparece`) para no parpadear en cargas
 * instantáneas. Con movimiento reducido, cubo y barra quedan quietos.
 *
 * Las caras alternan azul con logo blanco y blanco con logo azul, para que
 * la rotación se perciba.
 */
type Variante = "pantalla" | "bloque" | "compacto";

const LADO: Record<Variante, number> = { pantalla: 96, bloque: 72, compacto: 36 };

function Cubo() {
  return (
    <div className="cubo-escena">
      <div className="cubo">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i}>
            <Image
              src={LOGO.src}
              alt=""
              width={LOGO.ancho}
              height={LOGO.alto}
              // Caras impares (azules): logo en blanco por filtro, como sobre
              // la sábana. Pares (blancas): el archivo original.
              className={`h-auto w-[72%] ${i % 2 === 0 ? "[filter:brightness(0)_invert(1)]" : ""}`}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Cargador3D({
  etiqueta = "Cargando",
  variante = "bloque",
  className = "",
}: {
  /** Texto visible y anunciado a lectores de pantalla. */
  etiqueta?: string;
  variante?: Variante;
  className?: string;
}) {
  // El lado va en el contenedor: lo heredan el cubo y su sombra.
  const estiloLado = { ["--lado" as string]: `${LADO[variante]}px` };

  if (variante === "compacto") {
    return (
      <div role="status" aria-live="polite" className={`carga-aparece flex items-center justify-center gap-4 py-8 ${className}`}>
        <span aria-hidden="true" className="relative isolate" style={estiloLado}>
          <span className="halo-carga" />
          <Cubo />
        </span>
        <span className="tipo-micro text-tenue">{etiqueta}</span>
      </div>
    );
  }

  const contenido = (
    <>
      <div aria-hidden="true" className="relative isolate flex flex-col items-center" style={estiloLado}>
        <span className="halo-carga" />
        <Cubo />
        <div className="cubo-sombra" />
      </div>
      <p className="tipo-accion mt-7 text-tinta">{etiqueta}</p>
      <div aria-hidden="true" className="barra-carga mt-4" />
      {variante === "pantalla" ? <p className="tipo-micro mt-6 text-tenue">Tienda Virtual UTB</p> : null}
    </>
  );

  if (variante === "pantalla") {
    return (
      // Por encima de todo (barra incluida, z 60), sobre el vidrio casi
      // opaco: la ruta nueva aún no existe y la anterior no debe distraer.
      <div
        role="status"
        aria-live="polite"
        className={`carga-aparece fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[color:var(--tk-vidrio-solido)] px-6 backdrop-blur-xl ${className}`}
      >
        {contenido}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={`carga-aparece flex min-h-[50svh] flex-col items-center justify-center px-6 py-16 ${className}`}>
      {contenido}
    </div>
  );
}

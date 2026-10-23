import { ImageResponse } from "next/og";
import { TIENDAS } from "@/lib/tiendas";
import { colorDeToken } from "@/lib/tokens";

export const alt =
  "Tienda Virtual UTB — la cafetería del campus en un solo pase";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * La imagen social se rasteriza fuera del documento, así que no puede usar
 * variables CSS: toma los valores reales de app/tokens.css. Sigue habiendo
 * una sola fuente de color en el proyecto.
 *
 * Reproduce la sábana azul de la app: degradado, arcos concéntricos dibujados
 * como círculos (satori no soporta `repeating-radial-gradient`) y texto blanco.
 */
export default function OpengraphImage() {
  const sabana1 = colorDeToken("p-sabana-1", "darkblue");
  const sabana2 = colorDeToken("p-sabana-2", "royalblue");
  const ambar = colorDeToken("t-antojos", "gold");
  const cyanClaro = colorDeToken("t-alm1-suave", "lightblue");
  const superficie = colorDeToken("p-blanco", "white");
  // Los dos materiales translúcidos de la sábana viven en tokens.css; se leen
  // aquí para no repetir un color literal en este archivo.
  const arco = colorDeToken("sabana-borde", "transparent");
  const halo = colorDeToken("sabana-vidrio", "transparent");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          background: `linear-gradient(165deg, ${sabana1} 0%, ${sabana2} 100%)`,
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Arcos concéntricos: círculos con borde claro, recortados fuera. */}
        {[340, 470, 600, 730].map((radio) => (
          <div
            key={radio}
            style={{
              position: "absolute",
              top: -radio / 2,
              right: -radio / 3,
              width: radio,
              height: radio,
              borderRadius: radio,
              border: `2px solid ${arco}`,
            }}
          />
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 20,
              background: ambar,
            }}
          />
          <div
            style={{
              color: cyanClaro,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Cafetería La Placita · Campus UTB
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: superficie,
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 0.92,
              letterSpacing: -4,
            }}
          >
            Cinco tiendas,
          </div>
          <div
            style={{
              color: superficie,
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 0.92,
              letterSpacing: -4,
            }}
          >
            un solo pase.
          </div>
          <div
            style={{
              color: cyanClaro,
              fontSize: 26,
              marginTop: 24,
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            Pide, aparta y recoge en las tiendas de la cafetería sin hacer fila.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {TIENDAS.map((t, i) => (
            <div
              key={t.slug}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                background: halo,
                color: superficie,
                padding: "10px 16px",
                fontSize: 20,
              }}
            >
              <span style={{ color: cyanClaro, fontSize: 15 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {t.nombre}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}

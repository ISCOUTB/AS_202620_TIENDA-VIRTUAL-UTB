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
  const sabana1 = colorDeToken("sabana-1", "darkblue");
  const sabana2 = colorDeToken("sabana-2", "royalblue");
  const ambar = colorDeToken("ambar", "gold");
  const cyanClaro = colorDeToken("cyan-claro", "lightblue");
  const superficie = colorDeToken("superficie", "white");
  // Los dos materiales translúcidos de la sábana viven en tokens.css; se leen
  // aquí para no repetir un color literal en este archivo.
  const arco = colorDeToken("arco", "transparent");
  const halo = colorDeToken("halo", "transparent");

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
          background: `linear-gradient(158deg, ${sabana1} 0%, ${sabana2} 100%)`,
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
            Cafetería UTB · Campus Cartagena
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: superficie,
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 0.92,
              letterSpacing: -4,
            }}
          >
            Cinco puntos.
          </div>
          <div
            style={{
              color: superficie,
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 0.92,
              letterSpacing: -4,
            }}
          >
            Un solo pase.
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

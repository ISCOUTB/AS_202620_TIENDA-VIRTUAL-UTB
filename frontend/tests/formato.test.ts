import { describe, expect, it } from "vitest";
import {
  estadoHorario,
  formatoFechaCorta,
  formatoHora,
  formatoPrecio,
  franjasRecogida,
} from "@/lib/formato";
import type { Horario } from "@/lib/tiendas";

const LUNES_A_VIERNES: Horario = {
  dias: [1, 2, 3, 4, 5],
  abre: "07:00",
  cierra: "20:00",
};

describe("formatoPrecio", () => {
  it("convierte centavos a pesos con separador de miles", () => {
    expect(formatoPrecio(350000)).toBe("$3.500");
    expect(formatoPrecio(4600000)).toBe("$46.000");
    expect(formatoPrecio(1960000)).toBe("$19.600");
    expect(formatoPrecio(100)).toBe("$1");
    expect(formatoPrecio(0)).toBe("$0");
  });
});

describe("formatoHora", () => {
  it("pasa de 24 h a 12 h con sufijo", () => {
    expect(formatoHora("07:00")).toBe("7:00 a. m.");
    expect(formatoHora("11:45")).toBe("11:45 a. m.");
    expect(formatoHora("12:00")).toBe("12:00 p. m.");
    expect(formatoHora("13:05")).toBe("1:05 p. m.");
    expect(formatoHora("20:00")).toBe("8:00 p. m.");
    expect(formatoHora("00:30")).toBe("12:30 a. m.");
  });
});

describe("estadoHorario", () => {
  // 2026-10-21 es miércoles; Bogotá es UTC−5 todo el año.
  it("abierto dentro de la franja", () => {
    const estado = estadoHorario(LUNES_A_VIERNES, new Date("2026-10-21T15:00:00Z"));
    expect(estado.abierta).toBe(true);
    expect(estado.texto).toBe("Abierto hasta las 8:00 p. m.");
    expect(estado.detalle).toBe("Hasta las 8:00 p. m.");
  });

  it("cerrado antes de abrir el mismo día", () => {
    const estado = estadoHorario(LUNES_A_VIERNES, new Date("2026-10-21T11:00:00Z"));
    expect(estado.abierta).toBe(false);
    expect(estado.texto).toBe("Cerrado · abre hoy a las 7:00 a. m.");
  });

  it("cerrado en domingo: anuncia mañana", () => {
    const estado = estadoHorario(LUNES_A_VIERNES, new Date("2026-10-25T15:00:00Z"));
    expect(estado.abierta).toBe(false);
    expect(estado.texto).toBe("Cerrado · abre mañana a las 7:00 a. m.");
  });

  it("cerrado en sábado: anuncia el próximo día con nombre", () => {
    const estado = estadoHorario(LUNES_A_VIERNES, new Date("2026-10-24T15:00:00Z"));
    expect(estado.abierta).toBe(false);
    expect(estado.texto).toBe("Cerrado · abre el lunes a las 7:00 a. m.");
  });
});

describe("franjasRecogida", () => {
  it("arranca en la próxima decena tras 15 minutos", () => {
    const franjas = franjasRecogida(4, new Date("2026-10-21T15:02:00Z"));
    expect(franjas).toEqual(["10:20", "10:30", "10:40", "10:50"]);
  });

  it("respeta la cantidad pedida", () => {
    expect(franjasRecogida(8, new Date("2026-10-21T15:02:00Z"))).toHaveLength(8);
  });
});

describe("formatoFechaCorta", () => {
  it("formatea en hora de Bogotá", () => {
    const texto = formatoFechaCorta("2026-10-21T20:40:00Z");
    expect(texto).toContain("21");
    expect(texto.toLowerCase()).toContain("oct");
  });

  it("devuelve un guion si la fecha no es válida", () => {
    expect(formatoFechaCorta("no-es-fecha")).toBe("—");
  });
});

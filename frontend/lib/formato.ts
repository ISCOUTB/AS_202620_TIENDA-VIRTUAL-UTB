/**
 * Formateo determinista (servidor y cliente producen el mismo string, para
 * no provocar errores de hidratación).
 */

import type { Horario } from "./tiendas";

const ZONA = "America/Bogota";

/** "$3.500" — sin decimales, separador de miles con punto. */
export function formatoPrecio(centavos: number): string {
  const pesos = Math.round(centavos / 100);
  const entero = Math.trunc(pesos);
  const agrupado = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$${agrupado}`;
}

/** "7:00 a. m." desde "07:00". */
export function formatoHora(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  return `${hora12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

type MomentoBogota = { dia: number; minutos: number };

/** Día (0=domingo) y minutos desde medianoche en America/Bogota. */
function momentoBogota(ahora: Date): MomentoBogota {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(ahora);

  const valor = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "0";

  const mapa: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const dia = mapa[valor("weekday")] ?? 0;
  const hora = Number(valor("hour")) % 24;
  const minuto = Number(valor("minute"));
  return { dia, minutos: hora * 60 + minuto };
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export type EstadoHorario = {
  abierta: boolean;
  /** Frase completa: "Abierto hasta las 8:00 p. m." */
  texto: string;
  /** Sin el estado, para acompañar un badge que ya lo dice. */
  detalle: string;
};

/**
 * Estado honesto del horario. Sin backend de horarios: la fuente es
 * lib/tiendas.ts y se calcula en la zona de Bogotá.
 */
export function estadoHorario(
  horario: Horario,
  ahora: Date = new Date(),
): EstadoHorario {
  const { dia, minutos } = momentoBogota(ahora);
  const abre = aMinutos(horario.abre);
  const cierra = aMinutos(horario.cierra);

  if (horario.dias.includes(dia) && minutos >= abre && minutos < cierra) {
    return {
      abierta: true,
      texto: `Abierto hasta las ${formatoHora(horario.cierra)}`,
      detalle: `Hasta las ${formatoHora(horario.cierra)}`,
    };
  }

  if (horario.dias.includes(dia) && minutos < abre) {
    return {
      abierta: false,
      texto: `Cerrado · abre hoy a las ${formatoHora(horario.abre)}`,
      detalle: `Abre hoy a las ${formatoHora(horario.abre)}`,
    };
  }

  return {
    abierta: false,
    texto: `Cerrado · abre ${proximoDia(horario, dia)} a las ${formatoHora(horario.abre)}`,
    detalle: `Abre ${proximoDia(horario, dia)} a las ${formatoHora(horario.abre)}`,
  };
}

const NOMBRES_DIA = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function proximoDia(horario: Horario, diaActual: number): string {
  for (let i = 1; i <= 7; i++) {
    const dia = (diaActual + i) % 7;
    if (horario.dias.includes(dia)) {
      return i === 1 ? "mañana" : `el ${NOMBRES_DIA[dia]}`;
    }
  }
  return "pronto";
}

/** Fecha corta legible: "21 oct, 3:40 p. m." */
export function formatoFechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: ZONA,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(fecha);
}

/** Franjas de recogida cada 10 minutos, de la próxima media hora en adelante. */
export function franjasRecogida(
  cantidad = 6,
  ahora: Date = new Date(),
): string[] {
  const { minutos } = momentoBogota(ahora);
  const base = Math.ceil((minutos + 15) / 10) * 10;
  const franjas: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const total = base + i * 10;
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    franjas.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return franjas;
}

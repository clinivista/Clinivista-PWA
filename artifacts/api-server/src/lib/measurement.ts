/**
 * Medir una lesión sobre una fotografía con una moneda (o una regla) de tamaño conocido al lado.
 * El cliente solo envía los puntos que la persona marcó sobre la foto; la longitud la calcula siempre
 * el servidor con el tamaño oficial de la referencia, así que un cliente no puede inventar la escala.
 */

export type MeasureShape = "round" | "decagon";
export type MeasureReference = { id: string; mm: number; shape: MeasureShape };

// Monedas de Chile en uso (Banco Central). La $50 es decagonal (10 lados), así que su "diámetro"
// depende de dónde se marque: se suma incertidumbre. La $10 nueva (18,7 mm) circula desde enero de 2027.
export const MEASURE_REFERENCES: readonly MeasureReference[] = [
  { id: "clp-500", mm: 26.0, shape: "round" },
  { id: "clp-100", mm: 23.5, shape: "round" }, // bimetálica y la del centenario: misma medida
  { id: "clp-100-old", mm: 27.0, shape: "round" }, // cobre, ya no se emite
  { id: "clp-50", mm: 25.0, shape: "decagon" },
  { id: "clp-10", mm: 21.0, shape: "round" },
  { id: "clp-10-new", mm: 18.7, shape: "round" },
];

export type Point = { x: number; y: number };

export type PhotoMeasurement = {
  referenceId: string;
  referenceMm: number;
  referencePx: number;
  /** Puntos marcados, en píxeles de la imagen original: [borde de la moneda, borde opuesto] y [extremo de la lesión, otro extremo]. */
  referencePoints: [Point, Point];
  lesionPoints: [Point, Point];
  imageWidth: number;
  imageHeight: number;
  lengthMm: number;
  /** Margen de error estimado, en porcentaje de la medida. */
  uncertaintyPct: number;
  by: "patient" | "staff";
  byName: string;
  at: string;
};

export class MeasurementError extends Error {}

const isPoint = (value: unknown): value is Point =>
  typeof value === "object" && value !== null
  && Number.isFinite((value as Point).x) && Number.isFinite((value as Point).y);

const pair = (value: unknown): [Point, Point] | null =>
  Array.isArray(value) && value.length === 2 && isPoint(value[0]) && isPoint(value[1]) ? [value[0], value[1]] : null;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const round1 = (value: number) => Math.round(value * 10) / 10;

export function computeMeasurement(body: unknown, by: "patient" | "staff", byName: string, now = new Date()): PhotoMeasurement {
  const input = (body ?? {}) as Record<string, unknown>;
  const referencePoints = pair(input.referencePoints);
  const lesionPoints = pair(input.lesionPoints);
  const imageWidth = Number(input.imageWidth);
  const imageHeight = Number(input.imageHeight);
  if (!referencePoints || !lesionPoints) throw new MeasurementError("Marca los dos bordes de la moneda y los dos extremos de la lesión.");
  if (!(imageWidth >= 50 && imageWidth <= 20_000 && imageHeight >= 50 && imageHeight <= 20_000)) throw new MeasurementError("La foto no es válida.");
  for (const point of [...referencePoints, ...lesionPoints]) {
    if (point.x < 0 || point.y < 0 || point.x > imageWidth || point.y > imageHeight) throw new MeasurementError("Un punto quedó fuera de la foto.");
  }

  let referenceMm: number;
  let shape: MeasureShape = "round";
  if (input.referenceId === "custom") {
    // Una regla o pegatina de tamaño exacto: solo el personal de la clínica.
    if (by !== "staff") throw new MeasurementError("Elige una de las monedas de la lista.");
    referenceMm = Number(input.referenceMm);
    if (!(referenceMm >= 2 && referenceMm <= 200)) throw new MeasurementError("El tamaño de la referencia debe estar entre 2 y 200 mm.");
  } else {
    const reference = MEASURE_REFERENCES.find((candidate) => candidate.id === input.referenceId);
    if (!reference) throw new MeasurementError("Elige una de las monedas de la lista.");
    referenceMm = reference.mm;
    shape = reference.shape;
  }

  const referencePx = distance(referencePoints[0], referencePoints[1]);
  const lesionPx = distance(lesionPoints[0], lesionPoints[1]);
  if (referencePx < 20) throw new MeasurementError("La moneda se ve muy pequeña: acerca la cámara y vuelve a marcar sus bordes.");
  if (lesionPx < 1) throw new MeasurementError("Marca dos puntos distintos para la lesión.");

  // Error base de marcar a mano; sube si la referencia es chica, poligonal o se ve en pocos píxeles.
  let uncertaintyPct = by === "staff" ? 5 : 7;
  if (shape === "decagon") uncertaintyPct += 5;
  if (referenceMm < 20) uncertaintyPct += 4;
  if (referencePx < 60) uncertaintyPct += 4;
  return {
    referenceId: String(input.referenceId),
    referenceMm,
    referencePx: round1(referencePx),
    referencePoints,
    lesionPoints,
    imageWidth: Math.round(imageWidth),
    imageHeight: Math.round(imageHeight),
    lengthMm: round1((lesionPx / referencePx) * referenceMm),
    uncertaintyPct,
    by,
    byName: byName.slice(0, 100),
    at: now.toISOString(),
  };
}

/** The stored measurement of a photo (its capture metadata), or null. */
export function readMeasurement(captureMetadata: unknown): PhotoMeasurement | null {
  const value = (captureMetadata as { measurement?: unknown } | null)?.measurement;
  return value && typeof value === "object" && Number.isFinite((value as PhotoMeasurement).lengthMm) ? (value as PhotoMeasurement) : null;
}

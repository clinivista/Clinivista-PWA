// Espejo de api-server/src/lib/measurement.ts: el servidor siempre recalcula la medida; esto solo
// permite mostrar el resultado en vivo mientras la persona marca los puntos.

export type MeasureReferenceId = "clp-500" | "clp-100" | "clp-100-old" | "clp-50" | "clp-10" | "clp-10-new";

export const MEASURE_REFERENCES: ReadonlyArray<{ id: MeasureReferenceId; denomination: string; mm: number; decagon: boolean; note?: "old" | "new" | "tenSides" }> = [
  { id: "clp-500", denomination: "$500", mm: 26.0, decagon: false },
  { id: "clp-100", denomination: "$100", mm: 23.5, decagon: false },
  { id: "clp-100-old", denomination: "$100", mm: 27.0, decagon: false, note: "old" },
  { id: "clp-50", denomination: "$50", mm: 25.0, decagon: true, note: "tenSides" },
  { id: "clp-10", denomination: "$10", mm: 21.0, decagon: false },
  { id: "clp-10-new", denomination: "$10", mm: 18.7, decagon: false, note: "new" },
];

export type Point = { x: number; y: number };
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Longitud y margen estimados con los mismos criterios del servidor. */
export function estimateMeasurement(input: { referenceId: string; customMm?: number; referencePoints: Point[]; lesionPoints: Point[]; by: "patient" | "staff"; axisRatio?: number }) {
  if (input.referencePoints.length < 2 || input.lesionPoints.length < 2) return null;
  const reference = MEASURE_REFERENCES.find((item) => item.id === input.referenceId);
  const referenceMm = input.referenceId === "custom" ? input.customMm : reference?.mm;
  if (!referenceMm || referenceMm <= 0) return null;
  const referencePx = distance(input.referencePoints[0], input.referencePoints[1]);
  const lesionPx = distance(input.lesionPoints[0], input.lesionPoints[1]);
  if (referencePx < 20 || lesionPx < 1) return null;
  let uncertaintyPct = input.by === "staff" ? 5 : 7;
  if (reference?.decagon) uncertaintyPct += 5;
  if (referenceMm < 20) uncertaintyPct += 4;
  if (referencePx < 60) uncertaintyPct += 4;
  const ratio = input.axisRatio;
  if (ratio !== undefined && Number.isFinite(ratio) && ratio > 0 && Math.min(1, Math.max(0.5, ratio)) < 0.97) uncertaintyPct += Math.min(15, Math.ceil((1 - Math.min(1, Math.max(0.5, ratio))) * 100));
  return { lengthMm: Math.round((lesionPx / referencePx) * referenceMm * 10) / 10, uncertaintyPct, referenceMm, referencePx };
}

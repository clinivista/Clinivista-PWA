// Diseño asistido sobre la foto frontal: a partir de las guías faciales propone la línea frontal, la zona receptora y la escala.
// Es un punto de partida que el médico corrige arrastrando los puntos; la zona donante no se ve en esta foto y se marca aparte.
import { mmPerPixel, type Pt, type Size, type Stroke } from "./annotation";
import { GRAFT_DEFAULTS, faceGeometry, graftText, parseGraft, type FaceGeometry } from "./hair-plan";

/** Distancia media entre las pupilas de un adulto (mm): sirve de escala cuando no hay una referencia real. */
export const IPD_MM = 63;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Punto a `lateral` px a un lado del eje y `height` px sobre el entrecejo, en 0–1. */
function at(g: FaceGeometry, size: Size, lateral: number, height: number): Pt {
  const x = g.glabella[0] + g.across[0] * lateral + g.up[0] * height;
  const y = g.glabella[1] + g.across[1] * lateral + g.up[1] * height;
  return [clamp01(x / size.width), clamp01(y / size.height)];
}

const STEPS = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
const heightAt = (g: FaceGeometry, t: number) => g.suggestedPx * (1 - 0.3 * t * t);

/** Línea frontal simétrica: a la altura sugerida en el centro y más baja hacia las sienes (ancho ≈ distancia entre pupilas × 2). */
export function proposedHairline(g: FaceGeometry, size: Size): Pt[] {
  const half = Math.hypot(g.eyeA[0] - g.eyeB[0], g.eyeA[1] - g.eyeB[1]);
  return STEPS.map((t) => at(g, size, t * half, heightAt(g, t)));
}

/** Zona receptora: entre la línea frontal y una línea paralela más arriba (frente y tercio medio del cuero cabelludo). */
export function proposedRecipient(g: FaceGeometry, size: Size): Pt[] {
  const half = Math.hypot(g.eyeA[0] - g.eyeB[0], g.eyeA[1] - g.eyeB[1]);
  const depth = g.suggestedPx * 0.9;
  const front = STEPS.map((t) => at(g, size, t * half, heightAt(g, t)));
  const back = [...STEPS].reverse().filter((_, i) => i % 2 === 0).map((t) => at(g, size, t * half * 0.85, heightAt(g, t) + depth));
  return [...front, ...back];
}

/** ¿La escala vigente es la estimada con las pupilas (y no una referencia real)? */
export function hasEstimatedScale(strokes: Stroke[]): boolean {
  const face = strokes.find((s) => s.type === "face");
  const scale = strokes.filter((s) => s.type === "scale").at(-1);
  if (!face || !scale || scale.text !== String(IPD_MM)) return false;
  return scale.points.length === 2 && scale.points.every((p, i) => p[0] === face.points[i][0] && p[1] === face.points[i][1]);
}

export type ProposeOptions = { recipientNames: string[]; recipientName: string; style: { color: string; width: number } };

/**
 * Trazos con el diseño propuesto: guías faciales, línea frontal, zona receptora y, si falta, la escala por pupilas.
 * Reemplaza lo anterior de esos mismos elementos y recalcula la superficie receptora de la estimación de injertos.
 */
export function proposeDesign(strokes: Stroke[], face: Pt[], size: Size, options: ProposeOptions): Stroke[] | null {
  const g = faceGeometry(face, size);
  if (!g) return null;
  const { color, width } = options.style;
  let next: Stroke[] = strokes.filter((s) => s.type !== "face" && s.type !== "hairline" && !(s.type === "area" && options.recipientNames.includes(s.text ?? "")));
  const hadRealScale = mmPerPixel(next.filter((s) => !(s.type === "scale" && s.text === String(IPD_MM))), size) !== null;
  if (!hadRealScale) next = [...next.filter((s) => s.type !== "scale"), { type: "scale", color, width, points: [face[0], face[1]], text: String(IPD_MM) }];
  next = [
    ...next,
    { type: "face", color, width: Math.min(width, 0.003), points: face },
    { type: "hairline", color, width, points: proposedHairline(g, size) },
    { type: "area", color, width, points: proposedRecipient(g, size), text: options.recipientName },
  ];
  const k = mmPerPixel(next, size);
  if (k !== null) {
    const area = proposedRecipient(g, size).map((p): Pt => [p[0] * size.width, p[1] * size.height]);
    let twice = 0;
    area.forEach((p, i) => { const q = area[(i + 1) % area.length]; twice += p[0] * q[1] - q[0] * p[1]; });
    const ra = Math.round((Math.abs(twice) / 2) * k * k / 100 * 10) / 10;
    const old = next.find((s) => s.type === "graft");
    const params = { ...parseGraft(old?.text), ra };
    next = [...next.filter((s) => s.type !== "graft"), { type: "graft", color, width, points: old?.points ?? [[0.5, 0.94]], text: graftText(old ? params : { ...GRAFT_DEFAULTS, ra }) }];
  }
  return next;
}

/** Si hay estimación de injertos y escala, la superficie receptora (ra) pasa a ser la de las zonas receptoras dibujadas. */
export function syncRecipientArea(strokes: Stroke[], size: Size, recipientNames: string[]): Stroke[] {
  const graft = strokes.find((s) => s.type === "graft");
  const k = mmPerPixel(strokes, size);
  if (!graft || k === null) return strokes;
  const zones = strokes.filter((s) => s.type === "area" && s.points.length >= 3 && recipientNames.includes(s.text ?? ""));
  if (zones.length === 0) return strokes;
  let mm2 = 0;
  for (const zone of zones) {
    const pts = zone.points.map((p): Pt => [p[0] * size.width, p[1] * size.height]);
    let twice = 0;
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; twice += p[0] * q[1] - q[0] * p[1]; });
    mm2 += (Math.abs(twice) / 2) * k * k;
  }
  const ra = Math.min(1000, Math.round((mm2 / 100) * 10) / 10);
  const params = parseGraft(graft.text);
  if (params.ra === ra) return strokes;
  return strokes.map((s) => (s === graft ? { ...s, text: graftText({ ...params, ra }) } : s));
}

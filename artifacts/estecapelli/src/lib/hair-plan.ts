// Planificación capilar sobre la foto frontal: guías faciales (eje y tercios), diseño de la línea frontal y estimación de injertos.
// Todo es geometría y aritmética sobre los trazos (vectores en 0–1); sin dependencias del navegador, para poder probarlo.
import type { Pt, Size, Stroke } from "./annotation";

/** Trazo «face»: cinco puntos de la malla facial: ojo A, ojo B, entrecejo (glabela), base de la nariz (subnasal) y mentón. */
export const FACE_POINTS = 5;
/** Trazo «hairline»: línea frontal diseñada a mano alzada, de 2 a 40 puntos. */
export const MAX_HAIRLINE_POINTS = 40;

const px = (p: Pt, size: Size): Pt => [p[0] * size.width, p[1] * size.height];
const unpx = (p: Pt, size: Size): Pt => [p[0] / size.width, p[1] / size.height];

export type FaceGeometry = {
  /** Puntos en píxeles de la foto. */
  eyeA: Pt; eyeB: Pt; glabella: Pt; subnasale: Pt; menton: Pt;
  /** Vector unitario del eje de la cara, del mentón hacia la frente. */
  up: Pt;
  /** Vector unitario perpendicular al eje. */
  across: Pt;
  /** Tercio medio (entrecejo → base de la nariz) y tercio inferior (base de la nariz → mentón), en píxeles medidos sobre el eje. */
  middlePx: number;
  lowerPx: number;
  /** Altura sugerida de la línea frontal sobre el entrecejo: la regla clásica pide un tercio superior igual al medio. */
  suggestedPx: number;
  /** Punto del eje a esa altura. */
  suggested: Pt;
};

const along = (p: Pt, origin: Pt, up: Pt) => (p[0] - origin[0]) * up[0] + (p[1] - origin[1]) * up[1];
const side = (p: Pt, origin: Pt, up: Pt) => (p[0] - origin[0]) * -up[1] + (p[1] - origin[1]) * up[0];

/** Geometría de la cara a partir del trazo «face» (null si los puntos no sirven). */
export function faceGeometry(points: Pt[], size: Size): FaceGeometry | null {
  if (points.length !== FACE_POINTS) return null;
  const [eyeA, eyeB, glabella, subnasale, menton] = points.map((p) => px(p, size));
  const dx = glabella[0] - menton[0];
  const dy = glabella[1] - menton[1];
  const length = Math.hypot(dx, dy);
  if (length < 8) return null;
  const up: Pt = [dx / length, dy / length];
  const across: Pt = [-up[1], up[0]];
  const middlePx = along(glabella, menton, up) - along(subnasale, menton, up);
  const lowerPx = along(subnasale, menton, up);
  // Un orden imposible (la nariz fuera del tramo entrecejo–mentón) significa que los puntos no son una cara.
  if (middlePx <= 0 || lowerPx <= 0) return null;
  // Y una cara agachada o levantada (un tercio casi nulo) tampoco sirve para proponer nada.
  if (lowerPx / middlePx < 0.4 || lowerPx / middlePx > 2.5) return null;
  const suggestedPx = middlePx;
  const suggested: Pt = [glabella[0] + up[0] * suggestedPx, glabella[1] + up[1] * suggestedPx];
  return { eyeA, eyeB, glabella, subnasale, menton, up, across, middlePx, lowerPx, suggestedPx, suggested };
}

/** Segmento horizontal (perpendicular al eje) que pasa por `at`, con la semianchura dada. */
export function crossSegment(g: FaceGeometry, at: Pt, halfWidth: number): [Pt, Pt] {
  return [
    [at[0] - g.across[0] * halfWidth, at[1] - g.across[1] * halfWidth],
    [at[0] + g.across[0] * halfWidth, at[1] + g.across[1] * halfWidth],
  ];
}

/** Semianchura con que se dibujan las líneas de los tercios: algo más que la distancia entre los ojos. */
export const faceHalfWidth = (g: FaceGeometry) => Math.hypot(g.eyeA[0] - g.eyeB[0], g.eyeA[1] - g.eyeB[1]) * 1.25;

/** Refleja un punto (en 0–1) respecto al eje de la cara. */
export function mirrorPoint(p: Pt, g: FaceGeometry, size: Size): Pt {
  const q = px(p, size);
  const a = along(q, g.menton, g.up);
  const s = side(q, g.menton, g.up);
  const out: Pt = [g.menton[0] + g.up[0] * a + g.across[0] * -s, g.menton[1] + g.up[1] * a + g.across[1] * -s];
  return unpx(out, size);
}

/**
 * Altura de la línea frontal sobre el entrecejo (px, sobre el eje): donde la línea cruza el eje; si no lo cruza,
 * en su punto más cercano al eje. null si no hay línea.
 */
export function hairlineHeightPx(hairline: Pt[], g: FaceGeometry, size: Size): number | null {
  if (hairline.length < 2) return null;
  const pts = hairline.map((p) => px(p, size));
  const sideOf = pts.map((p) => side(p, g.menton, g.up));
  for (let i = 1; i < pts.length; i += 1) {
    const [s1, s2] = [sideOf[i - 1], sideOf[i]];
    if (s1 === 0 || s1 * s2 < 0 || s2 === 0) {
      const t = s1 === s2 ? 0 : s1 / (s1 - s2);
      const a1 = along(pts[i - 1], g.menton, g.up);
      const a2 = along(pts[i], g.menton, g.up);
      return a1 + (a2 - a1) * t - along(g.glabella, g.menton, g.up);
    }
  }
  let best = 0;
  sideOf.forEach((s, i) => { if (Math.abs(s) < Math.abs(sideOf[best])) best = i; });
  return along(pts[best], g.menton, g.up) - along(g.glabella, g.menton, g.up);
}

/** Suaviza una línea (Chaikin) para dibujarla como curva; no cambia los puntos guardados. */
export function smoothLine(points: Pt[], rounds = 2): Pt[] {
  let out = points;
  for (let r = 0; r < rounds && out.length > 2; r += 1) {
    const next: Pt[] = [out[0]];
    for (let i = 0; i < out.length - 1; i += 1) {
      const [a, b] = [out[i], out[i + 1]];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

/** Deja la línea a mano alzada en 40 puntos o menos, endureciendo la simplificación hasta que quepa. */
export function fitHairline(points: Pt[], simplify: (points: Pt[], epsilon: number) => Pt[]): Pt[] {
  let epsilon = 0.003;
  let out = simplify(points, epsilon);
  while (out.length > MAX_HAIRLINE_POINTS && epsilon < 0.2) { epsilon *= 1.5; out = simplify(points, epsilon); }
  return out.slice(0, MAX_HAIRLINE_POINTS);
}

// ── Estimación de injertos ──────────────────────────────────────────────────
// Valores orientativos y editables; los fija el médico. El texto del trazo es «ra=41.2;id=40;da=55;dd=180;hpf=2.2;sf=25».

export type GraftParams = {
  /** Zona receptora (cm²). */ ra: number;
  /** Densidad de implante (UF/cm²). */ id: number;
  /** Zona donante (cm²). */ da: number;
  /** Densidad donante (pelos/cm²). */ dd: number;
  /** Pelos por unidad folicular. */ hpf: number;
  /** Porcentaje de la zona donante que se puede extraer con seguridad. */ sf: number;
};
export const GRAFT_KEYS = ["ra", "id", "da", "dd", "hpf", "sf"] as const;
export type GraftKey = (typeof GRAFT_KEYS)[number];
export const GRAFT_RANGES: Record<GraftKey, [number, number]> = { ra: [0, 1000], id: [1, 120], da: [0, 1000], dd: [1, 600], hpf: [1, 5], sf: [1, 100] };
export const GRAFT_DEFAULTS: GraftParams = { ra: 0, id: 40, da: 0, dd: 180, hpf: 2.2, sf: 25 };
export const MAX_GRAFT_TEXT = 120;

/** Lee «ra=41.2;id=40…»; lo que falte o no sirva queda con su valor por defecto. */
export function parseGraft(text: string | undefined): GraftParams {
  const out: GraftParams = { ...GRAFT_DEFAULTS };
  for (const part of (text ?? "").split(";")) {
    const [key, raw] = part.split("=");
    if (!(GRAFT_KEYS as readonly string[]).includes(key)) continue;
    const value = Number(raw);
    const [min, max] = GRAFT_RANGES[key as GraftKey];
    if (Number.isFinite(value) && value >= min && value <= max) out[key as GraftKey] = value;
  }
  return out;
}

export const graftText = (params: GraftParams) => GRAFT_KEYS.map((key) => `${key}=${Math.round(params[key] * 100) / 100}`).join(";");

/** ¿El texto del trazo «graft» es válido (para el servidor y para las pruebas)? */
export function isGraftText(text: unknown): text is string {
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_GRAFT_TEXT) return false;
  const seen = new Set<string>();
  for (const part of text.split(";")) {
    const [key, raw, ...extra] = part.split("=");
    if (extra.length || !(GRAFT_KEYS as readonly string[]).includes(key) || seen.has(key) || raw === undefined || raw === "") return false;
    const value = Number(raw);
    const [min, max] = GRAFT_RANGES[key as GraftKey];
    if (!Number.isFinite(value) || value < min || value > max) return false;
    seen.add(key);
  }
  return true;
}

const tens = (value: number) => Math.round(value / 10) * 10;
export type GraftEstimate = { needed: number; available: number; coveragePct: number | null };
/** Unidades foliculares necesarias (receptora × densidad) y disponibles (donante × UF/cm² × fracción segura), redondeadas a decenas. */
export function graftEstimate(p: GraftParams): GraftEstimate {
  const needed = p.ra * p.id;
  const available = p.da * (p.dd / p.hpf) * (p.sf / 100);
  return { needed: tens(needed), available: tens(available), coveragePct: needed > 0 && available > 0 ? Math.round((available / needed) * 100) : null };
}

/** Nombres con que el editor etiqueta las zonas receptora y donante (en cada idioma), para rellenar el cálculo desde lo medido. */
export function graftPrefill(strokes: Stroke[], names: { recipient: string[]; donor: string[] }, areaCm2: (points: Pt[]) => number | null): Partial<GraftParams> {
  const sum = (list: string[]) => {
    let total = 0;
    let found = false;
    for (const stroke of strokes) {
      if (stroke.type !== "area" || stroke.points.length < 3 || !list.includes(stroke.text ?? "")) continue;
      const value = areaCm2(stroke.points);
      if (value !== null) { total += value; found = true; }
    }
    return found ? Math.round(total * 10) / 10 : null;
  };
  const [ra, da] = [sum(names.recipient), sum(names.donor)];
  return { ...(ra !== null ? { ra } : {}), ...(da !== null ? { da } : {}) };
}

// ── Resumen para la leyenda ─────────────────────────────────────────────────

export type PlanSummary = {
  face: { middleMm: number | null; lowerMm: number | null; suggestedMm: number | null } | null;
  hairline: { heightMm: number | null; ratio: number | null } | null;
  graft: (GraftEstimate & { params: GraftParams }) | null;
};

export function planSummary(strokes: Stroke[], size: Size, k: number | null): PlanSummary {
  const faceStroke = strokes.find((s) => s.type === "face");
  const g = faceStroke ? faceGeometry(faceStroke.points, size) : null;
  const lineStroke = strokes.find((s) => s.type === "hairline");
  const graftStroke = strokes.find((s) => s.type === "graft");
  const mm = (value: number) => (k === null ? null : value * k);
  const heightPx = g && lineStroke ? hairlineHeightPx(lineStroke.points, g, size) : null;
  const params = graftStroke ? parseGraft(graftStroke.text) : null;
  return {
    face: g ? { middleMm: mm(g.middlePx), lowerMm: mm(g.lowerPx), suggestedMm: mm(g.suggestedPx) } : null,
    hairline: g && lineStroke && heightPx !== null ? { heightMm: mm(heightPx), ratio: Math.round((heightPx / g.middlePx) * 100) / 100 } : null,
    graft: params ? { ...graftEstimate(params), params } : null,
  };
}

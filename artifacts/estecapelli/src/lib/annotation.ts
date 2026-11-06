// Dibujo del médico sobre una foto. Los trazos se guardan como vectores en las
// coordenadas propias de la foto (0–1), de modo que se pueden seguir editando
// y se redibujan nítidos a cualquier tamaño.

export type Pt = [number, number];
export type StrokeType = "pen" | "line" | "arrow" | "ellipse" | "text" | "scale" | "ruler" | "angle" | "area" | "marker" | "guide";
/** Herramientas de medición: se dibujan como vectores y su valor se calcula al dibujar, con la escala vigente. */
export const MEASURE_TYPES: ReadonlyArray<StrokeType> = ["scale", "ruler", "angle", "area", "marker", "guide"];
/** Guías de la foto (en `text`): cuadrícula en tercios, línea media y planos horizontales. */
export const GUIDE_KINDS = ["grid", "midline", "planes"] as const;
export type GuideKind = (typeof GUIDE_KINDS)[number];
export type Stroke = {
  type: StrokeType;
  color: string;
  /** Grosor como fracción del lado mayor de la foto. */
  width: number;
  points: Pt[];
  text?: string;
};

export const PALETTE = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ffffff", "#111827"] as const;
export const WIDTHS = [
  { label: "Fino", value: 0.003 },
  { label: "Medio", value: 0.006 },
  { label: "Grueso", value: 0.012 },
] as const;
/** Tamaño del texto como fracción del lado mayor, según el grosor elegido. */
const textSize = (width: number) => Math.max(0.025, width * 5);

export function strokeToJson(strokes: Stroke[]) {
  return strokes.map((stroke) => ({
    type: stroke.type,
    color: stroke.color,
    width: stroke.width,
    points: stroke.points.map(([x, y]) => [round(x), round(y)]),
    ...(stroke.text !== undefined && ["text", "scale", "marker", "guide"].includes(stroke.type) ? { text: stroke.text } : {}),
  }));
}

const round = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10000) / 10000;
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Reduce los puntos de un trazo a mano alzada (Ramer–Douglas–Peucker) para que pese poco. */
export function simplify(points: Pt[], epsilon = 0.0015): Pt[] {
  if (points.length <= 2) return points;
  const [first, last] = [points[0], points[points.length - 1]];
  let index = 0;
  let max = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegment(points[i], first, last);
    if (distance > max) { max = distance; index = i; }
  }
  if (max <= epsilon) return [first, last];
  return [...simplify(points.slice(0, index + 1), epsilon).slice(0, -1), ...simplify(points.slice(index), epsilon)];
}

export function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** ¿El punto (en 0–1, con la proporción de la foto) cae sobre el trazo? Sirve de borrador. */
export function hitsStroke(stroke: Stroke, p: Pt, aspect: number, tolerance = 0.02): boolean {
  // Pasa todo a un plano donde x e y miden lo mismo (el lado mayor = 1).
  const scale = (pt: Pt): Pt => (aspect >= 1 ? [pt[0], pt[1] / aspect] : [pt[0] * aspect, pt[1]]);
  const q = scale(p);
  const pts = stroke.points.map(scale);
  const slack = tolerance + stroke.width / 2;
  if (stroke.type === "pen") {
    if (pts.length === 1) return Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) <= slack;
    return pts.slice(1).some((pt, i) => distanceToSegment(q, pts[i], pt) <= slack);
  }
  if (stroke.type === "guide") return false; // las guías se activan y desactivan con su botón
  if (stroke.type === "line" || stroke.type === "arrow" || stroke.type === "scale" || stroke.type === "ruler") return distanceToSegment(q, pts[0], pts[1]) <= slack;
  if (stroke.type === "angle") return pts.slice(1).some((pt, i) => distanceToSegment(q, pts[i], pt) <= slack);
  if (stroke.type === "area") return pts.some((pt, i) => distanceToSegment(q, pt, pts[(i + 1) % pts.length]) <= slack);
  if (stroke.type === "marker") return Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) <= slack + 0.02;
  if (stroke.type === "ellipse") {
    const cx = (pts[0][0] + pts[1][0]) / 2;
    const cy = (pts[0][1] + pts[1][1]) / 2;
    const rx = Math.abs(pts[1][0] - pts[0][0]) / 2;
    const ry = Math.abs(pts[1][1] - pts[0][1]) / 2;
    if (rx < 1e-6 || ry < 1e-6) return Math.hypot(q[0] - cx, q[1] - cy) <= slack;
    // Cercanía al borde de la elipse (no al interior).
    const normalized = Math.hypot((q[0] - cx) / rx, (q[1] - cy) / ry);
    return Math.abs(normalized - 1) * Math.min(rx, ry) <= slack;
  }
  // texto: su caja aproximada
  const size = textSize(stroke.width);
  const width = (stroke.text?.length ?? 1) * size * 0.6;
  return q[0] >= pts[0][0] - slack && q[0] <= pts[0][0] + width + slack && q[1] >= pts[0][1] - size - slack && q[1] <= pts[0][1] + slack;
}

type Ctx = Pick<CanvasRenderingContext2D,
  "save" | "restore" | "beginPath" | "moveTo" | "lineTo" | "stroke" | "ellipse" | "fillText" | "closePath" | "fill"
  | "strokeStyle" | "fillStyle" | "lineWidth" | "lineCap" | "lineJoin" | "font" | "textBaseline" | "shadowColor" | "shadowBlur"
  | "arc" | "strokeText" | "setLineDash" | "globalAlpha" | "textAlign">;

/** Texto con contorno para que se lea sobre cualquier fondo. */
function label(ctx: Ctx, text: string, x: number, y: number, size: number, color: string) {
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.lineWidth = Math.max(2, size * 0.28);
  ctx.strokeStyle = color === "#ffffff" || color === "#facc15" ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.95)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

const LABEL_SIZE = 0.022;

function drawMeasure(ctx: Ctx, stroke: Stroke, pts: Pt[], side: number, k: number | null, numbers: Record<"ruler" | "angle" | "area" | "marker", number>, size: Size) {
  const fontSize = Math.max(12, LABEL_SIZE * side);
  const tick = Math.max(6, stroke.width * side * 3);
  const tickAt = (a: Pt, b: Pt) => {
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(a[0] - tick * Math.cos(angle), a[1] - tick * Math.sin(angle));
    ctx.lineTo(a[0] + tick * Math.cos(angle), a[1] + tick * Math.sin(angle));
    ctx.stroke();
  };
  if (stroke.type === "guide") {
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = Math.max(1, side * 0.0018);
    ctx.setLineDash([side * 0.012, side * 0.008]);
    const [w, h] = [size.width, size.height];
    const line = (x1: number, y1: number, x2: number, y2: number) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    if (stroke.text === "grid") for (const f of [1 / 3, 2 / 3]) { line(w * f, 0, w * f, h); line(0, h * f, w, h * f); }
    else if (stroke.text === "midline") line(w / 2, 0, w / 2, h);
    else if (stroke.text === "planes") for (const f of [0.2, 0.4, 0.6, 0.8]) line(0, h * f, w, h * f);
    return;
  }
  if (stroke.type === "scale" || stroke.type === "ruler") {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.stroke();
    tickAt(pts[0], pts[1]);
    tickAt(pts[1], pts[0]);
    const mid: Pt = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
    if (stroke.type === "scale") {
      label(ctx, `${stroke.text ?? ""} mm`, mid[0], mid[1] - fontSize, fontSize, stroke.color);
    } else {
      numbers.ruler += 1;
      const mm = k === null ? null : Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) * k;
      label(ctx, `R${numbers.ruler}${mm === null ? "" : ` · ${formatLength(mm)}`}`, mid[0], mid[1] - fontSize, fontSize, stroke.color);
    }
    return;
  }
  if (stroke.type === "angle") {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const pt of pts.slice(1)) ctx.lineTo(pt[0], pt[1]);
    ctx.stroke();
    if (pts.length >= 3) {
      numbers.angle += 1;
      const degrees = angleDegrees(stroke.points[0], stroke.points[1], stroke.points[2], size);
      label(ctx, `A${numbers.angle} · ${formatAngle(degrees)}`, pts[1][0], pts[1][1] - fontSize * 1.3, fontSize, stroke.color);
    }
    return;
  }
  if (stroke.type === "area") {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const pt of pts.slice(1)) ctx.lineTo(pt[0], pt[1]);
    if (pts.length >= 3) ctx.closePath();
    ctx.stroke();
    if (pts.length >= 3) {
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;
      numbers.area += 1;
      const { areaPx } = polygonStats(stroke.points, size);
      const cx = pts.reduce((sum, pt) => sum + pt[0], 0) / pts.length;
      const cy = pts.reduce((sum, pt) => sum + pt[1], 0) / pts.length;
      label(ctx, `Z${numbers.area}${k === null ? "" : ` · ${formatArea(areaPx * k * k)}`}`, cx, cy, fontSize, stroke.color);
    }
    return;
  }
  if (stroke.type === "marker") {
    numbers.marker += 1;
    const radius = Math.max(9, side * 0.012);
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], radius, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, String(numbers.marker), pts[0][0], pts[0][1] + radius * 0.05, radius * 1.25, stroke.color === "#ffffff" || stroke.color === "#facc15" ? "#111827" : "#ffffff");
  }
}

/** Dibuja los trazos sobre un lienzo de `width` × `height` píxeles. */
export function drawStrokes(ctx: Ctx, strokes: Stroke[], width: number, height: number): void {
  const side = Math.max(width, height);
  const px = (pt: Pt): Pt => [pt[0] * width, pt[1] * height];
  const size: Size = { width, height };
  const k = mmPerPixel(strokes, size);
  const measured = describeMeasures(strokes, size).measures;
  const numbers = { ruler: 0, angle: 0, area: 0, marker: 0 };
  void measured;
  for (const stroke of strokes) {
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = Math.max(1, stroke.width * side);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pts = stroke.points.map(px);
    if (stroke.type === "pen") {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.01, pts[0][1] + 0.01);
      for (const pt of pts.slice(1)) ctx.lineTo(pt[0], pt[1]);
      ctx.stroke();
    } else if (stroke.type === "line" || stroke.type === "arrow") {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.stroke();
      if (stroke.type === "arrow") {
        const angle = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
        const head = Math.max(10, stroke.width * side * 4.5);
        ctx.beginPath();
        ctx.moveTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[1][0] - head * Math.cos(angle - Math.PI / 7), pts[1][1] - head * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(pts[1][0] - head * Math.cos(angle + Math.PI / 7), pts[1][1] - head * Math.sin(angle + Math.PI / 7));
        ctx.closePath();
        ctx.fill();
      }
    } else if (stroke.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2,
        Math.max(1, Math.abs(pts[1][0] - pts[0][0]) / 2), Math.max(1, Math.abs(pts[1][1] - pts[0][1]) / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (MEASURE_TYPES.includes(stroke.type)) {
      drawMeasure(ctx, stroke, pts, side, k, numbers, size);
    } else if (stroke.type === "text" && stroke.text) {
      const size = textSize(stroke.width) * side;
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      ctx.textBaseline = "alphabetic";
      // contorno para que se lea sobre cualquier fondo
      ctx.shadowColor = stroke.color === "#ffffff" || stroke.color === "#facc15" ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.85)";
      ctx.shadowBlur = size * 0.18;
      ctx.fillText(stroke.text, pts[0][0], pts[0][1]);
    }
    ctx.restore();
  }
}


// ── Medición ────────────────────────────────────────────────────────────────
// Los puntos están en proporciones de la foto (0–1 en cada eje); para medir hay que pasar a píxeles de la foto,
// porque x e y no miden lo mismo. La escala es el trazo «scale»: una distancia real conocida (en mm) marcada sobre la foto.

export type Size = { width: number; height: number };
const dist = (a: Pt, b: Pt, size: Size) => Math.hypot((a[0] - b[0]) * size.width, (a[1] - b[1]) * size.height);

/** Milímetros por píxel de la foto según la última escala dibujada, o null si no hay (o no sirve). */
export function mmPerPixel(strokes: Stroke[], size: Size): number | null {
  for (let i = strokes.length - 1; i >= 0; i -= 1) {
    const stroke = strokes[i];
    if (stroke.type !== "scale" || stroke.points.length < 2) continue;
    const mm = Number(stroke.text);
    const px = dist(stroke.points[0], stroke.points[1], size);
    if (Number.isFinite(mm) && mm > 0 && px >= 4) return mm / px;
  }
  return null;
}

/** Ángulo en grados en el vértice `b` entre los puntos `a` y `c` (0–180). */
export function angleDegrees(a: Pt, b: Pt, c: Pt, size: Size): number {
  const v1: Pt = [(a[0] - b[0]) * size.width, (a[1] - b[1]) * size.height];
  const v2: Pt = [(c[0] - b[0]) * size.width, (c[1] - b[1]) * size.height];
  const lengths = Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]);
  if (lengths === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (v1[0] * v2[0] + v1[1] * v2[1]) / lengths));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Área (en px²) y perímetro (en px) de un polígono cerrado. */
export function polygonStats(points: Pt[], size: Size): { areaPx: number; perimeterPx: number } {
  let twice = 0;
  let perimeterPx = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = [points[i][0] * size.width, points[i][1] * size.height];
    const next = points[(i + 1) % points.length];
    const [x2, y2] = [next[0] * size.width, next[1] * size.height];
    twice += x1 * y2 - x2 * y1;
    perimeterPx += Math.hypot(x2 - x1, y2 - y1);
  }
  return { areaPx: Math.abs(twice) / 2, perimeterPx };
}

const trim = (value: number, decimals: number) => String(Math.round(value * 10 ** decimals) / 10 ** decimals);
/** «8,5 mm» o «2,4 cm» (con punto decimal; la pantalla muestra lo mismo en todos los idiomas). */
export const formatLength = (mm: number) => (mm < 20 ? `${trim(mm, 1)} mm` : `${trim(mm / 10, 1)} cm`);
export const formatArea = (mm2: number) => (mm2 < 100 ? `${trim(mm2, 1)} mm²` : `${trim(mm2 / 100, 2)} cm²`);
export const formatAngle = (degrees: number) => `${trim(degrees, 1)}°`;

export type Measure =
  | { kind: "ruler"; index: number; mm: number | null }
  | { kind: "angle"; index: number; degrees: number }
  | { kind: "area"; index: number; mm2: number | null; perimeterMm: number | null }
  | { kind: "marker"; index: number; note: string; strokeIndex: number };

/** Todas las mediciones de la foto, numeradas en el orden en que se dibujaron (para la leyenda y las etiquetas). */
export function describeMeasures(strokes: Stroke[], size: Size): { scaleMm: number | null; measures: Measure[] } {
  const k = mmPerPixel(strokes, size);
  const counts = { ruler: 0, angle: 0, area: 0, marker: 0 };
  const measures: Measure[] = [];
  strokes.forEach((stroke, strokeIndex) => {
    if (stroke.type === "ruler" && stroke.points.length >= 2) {
      counts.ruler += 1;
      measures.push({ kind: "ruler", index: counts.ruler, mm: k === null ? null : dist(stroke.points[0], stroke.points[1], size) * k });
    } else if (stroke.type === "angle" && stroke.points.length >= 3) {
      counts.angle += 1;
      measures.push({ kind: "angle", index: counts.angle, degrees: angleDegrees(stroke.points[0], stroke.points[1], stroke.points[2], size) });
    } else if (stroke.type === "area" && stroke.points.length >= 3) {
      counts.area += 1;
      const { areaPx, perimeterPx } = polygonStats(stroke.points, size);
      measures.push({ kind: "area", index: counts.area, mm2: k === null ? null : areaPx * k * k, perimeterMm: k === null ? null : perimeterPx * k });
    } else if (stroke.type === "marker") {
      counts.marker += 1;
      measures.push({ kind: "marker", index: counts.marker, note: stroke.text ?? "", strokeIndex });
    }
  });
  return { scaleMm: k, measures };
}

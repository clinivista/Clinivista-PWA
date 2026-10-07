// Dibujo del médico sobre una foto. Los trazos se guardan como vectores en las
// coordenadas propias de la foto (0–1), de modo que se pueden seguir editando
// y se redibujan nítidos a cualquier tamaño.

export type Pt = [number, number];
export type StrokeType = "pen" | "line" | "arrow" | "ellipse" | "text";
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
    ...(stroke.type === "text" ? { text: stroke.text } : {}),
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
  if (stroke.type === "line" || stroke.type === "arrow") return distanceToSegment(q, pts[0], pts[1]) <= slack;
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
  | "strokeStyle" | "fillStyle" | "lineWidth" | "lineCap" | "lineJoin" | "font" | "textBaseline" | "shadowColor" | "shadowBlur">;

/** Dibuja los trazos sobre un lienzo de `width` × `height` píxeles. */
export function drawStrokes(ctx: Ctx, strokes: Stroke[], width: number, height: number): void {
  const side = Math.max(width, height);
  const px = (pt: Pt): Pt => [pt[0] * width, pt[1] * height];
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

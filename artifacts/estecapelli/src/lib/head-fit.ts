// Guía de la cámara: ¿la cabeza de la persona encaja en el óvalo? Trabaja sobre la máscara de silueta que entrega el segmentador
// (0–255 por píxel; la persona es lo que supera el umbral). Sirve para cualquier ángulo (de frente, de lado, de arriba, de atrás),
// porque mide la silueta de la cabeza y no la cara.

export type Oval = { cx: number; cy: number; rx: number; ry: number };

/** Óvalo de referencia dentro del cuadro de la foto (todo en proporciones 0–1 del cuadro). */
export const GUIDE_OVAL: Oval = { cx: 0.5, cy: 0.45, rx: 0.33, ry: 0.33 };

/** Óvalo para un cuadro de ese tamaño: siempre con forma de cabeza (más alto que ancho), centrado un poco arriba. */
export function ovalForFrame(width: number, height: number): Oval {
  if (width <= 0 || height <= 0) return GUIDE_OVAL;
  const ry = 0.33;
  const rx = Math.min(0.46, (ry * height * 0.78) / width);
  return { cx: 0.5, cy: 0.45, rx, ry };
}

/** Qué le falta a la persona (ya traducido a lo que debe hacer con el celular). */
export type FitStatus = "none" | "closer" | "farther" | "left" | "right" | "up" | "down" | "ok";

export type FitResult = {
  status: FitStatus;
  /** Cabeza detectada, en proporciones 0–1 del cuadro (null si no se ve a nadie). */
  head: { cx: number; cy: number; w: number; h: number } | null;
  /** Alto de la cabeza dividido por el alto del óvalo (1 = justo). */
  sizeRatio: number;
};

const PERSON_THRESHOLD = 128;
const MIN_PERSON_SHARE = 0.015;
/** La cabeza debe llenar entre estos límites del alto del óvalo. */
export const SIZE_OK_MIN = 0.74;
export const SIZE_OK_MAX = 1.1;
/** Desvío tolerado (proporción del ancho/alto del óvalo) para dar el encuadre por bueno. */
export const OFFSET_OK = 0.14;
/** Desvío grande: se corrige primero, antes del tamaño. */
const OFFSET_BIG = 0.28;

type Row = { count: number; min: number; max: number };

function rowsOf(mask: ArrayLike<number>, w: number, h: number): Row[] {
  const rows: Row[] = [];
  for (let y = 0; y < h; y += 1) {
    let count = 0;
    let min = w;
    let max = -1;
    for (let x = 0; x < w; x += 1) {
      if (mask[y * w + x] >= PERSON_THRESHOLD) {
        count += 1;
        if (x < min) min = x;
        if (x > max) max = x;
      }
    }
    rows.push({ count, min, max });
  }
  return rows;
}

/**
 * Cabeza dentro de la silueta: desde la fila más alta baja hasta el cuello (la fila más angosta antes de los hombros).
 * Si no se ven hombros (primer plano, vista de arriba o de atrás) usa la proporción de una cabeza (alto ≈ 1,45 × ancho).
 */
export function findHead(mask: ArrayLike<number>, w: number, h: number): { x0: number; x1: number; y0: number; y1: number } | null {
  const rows = rowsOf(mask, w, h);
  const minCount = Math.max(3, Math.round(w * 0.02));
  const top = rows.findIndex((row) => row.count >= minCount);
  if (top < 0) return null;
  let bottom = top;
  for (let y = h - 1; y >= top; y -= 1) if (rows[y].count >= minCount) { bottom = y; break; }
  const height = bottom - top + 1;

  // Ancho suavizado de cada fila.
  const width = rows.map((row, y) => {
    let sum = 0;
    let n = 0;
    for (let k = -2; k <= 2; k += 1) {
      const r = rows[y + k];
      if (r) { sum += r.count; n += 1; }
    }
    return sum / n;
  });

  // Fila de mayor ancho en el primer tramo (la cabeza) y cuello = mínimo después de ella, si luego vuelve a ensancharse (hombros).
  const headScan = Math.min(bottom, top + Math.round(height * 0.7));
  let peakRow = top;
  let narrowed = false;
  for (let y = top; y <= headScan; y += 1) {
    // Una vez que la silueta se estrecha (mentón y cuello), el ancho máximo de la cabeza ya quedó atrás: lo que venga después son hombros.
    if (width[y] < width[peakRow] * 0.85) narrowed = true;
    if (!narrowed && width[y] > width[peakRow]) peakRow = y;
  }
  const headWidth = width[peakRow];
  let neckRow = -1;
  for (let y = peakRow + 1; y <= headScan; y += 1) {
    if (width[y] < headWidth * 0.82 && (neckRow < 0 || width[y] < width[neckRow])) neckRow = y;
  }
  let headBottom = Math.min(bottom, top + Math.round(headWidth * 1.45));
  if (neckRow >= 0) {
    // Se confirma el cuello solo si después se ensancha (hombros); si no, es el contorno de una cabeza que se angosta (mentón).
    let shoulders = false;
    for (let y = neckRow + 1; y <= bottom; y += 1) if (width[y] > width[neckRow] * 1.3) { shoulders = true; break; }
    if (shoulders) headBottom = neckRow;
  }
  let x0 = w;
  let x1 = -1;
  for (let y = top; y <= headBottom; y += 1) {
    if (rows[y].count < minCount) continue;
    if (rows[y].min < x0) x0 = rows[y].min;
    if (rows[y].max > x1) x1 = rows[y].max;
  }
  if (x1 < x0) return null;
  return { x0, x1, y0: top, y1: headBottom };
}

export function analyzeHeadFit(mask: ArrayLike<number>, w: number, h: number, oval: Oval = GUIDE_OVAL, mirrored = false): FitResult {
  let person = 0;
  for (let i = 0; i < w * h; i += 1) if (mask[i] >= PERSON_THRESHOLD) person += 1;
  if (person / (w * h) < MIN_PERSON_SHARE) return { status: "none", head: null, sizeRatio: 0 };
  const box = findHead(mask, w, h);
  if (!box) return { status: "none", head: null, sizeRatio: 0 };

  const head = { cx: (box.x0 + box.x1 + 1) / 2 / w, cy: (box.y0 + box.y1 + 1) / 2 / h, w: (box.x1 - box.x0 + 1) / w, h: (box.y1 - box.y0 + 1) / h };
  const sizeRatio = head.h / (2 * oval.ry);
  // Desvío respecto del óvalo, tal como lo ve la persona en pantalla (con la cámara frontal la imagen se muestra como espejo).
  const dx = ((head.cx - oval.cx) / (2 * oval.rx)) * (mirrored ? -1 : 1);
  const dy = (head.cy - oval.cy) / (2 * oval.ry);
  const result = (status: FitStatus): FitResult => ({ status, head, sizeRatio });

  const move = (): FitStatus | null => {
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  };
  // El celular se mueve hacia donde se ve la cabeza: si la cabeza se ve a la derecha del óvalo, el celular va a la derecha.
  const offset = Math.max(Math.abs(dx), Math.abs(dy));
  if (offset >= OFFSET_BIG) return result(move()!);
  if (sizeRatio > SIZE_OK_MAX) return result("farther");
  if (sizeRatio < SIZE_OK_MIN) return result("closer");
  if (offset >= OFFSET_OK) return result(move()!);
  return result("ok");
}

// Propuesta automática de los extremos de una lesión, en el dispositivo. La persona toca un punto dentro de la
// lesión; se crece la región de color parecido (en Lab) y se devuelve su mayor diámetro. Es solo una propuesta:
// la persona puede arrastrar los puntos, y el servidor calcula siempre la medida con lo que se guarde.

import type { Pixels, Point, Sampler } from "./coin-detect";

export type LesionFit = {
  /** Extremos del mayor diámetro de la región, en píxeles de la imagen original. */
  points: [Point, Point];
  /** Fracción de la ventana analizada que ocupa la lesión. */
  areaFraction: number;
};

const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

/** sRGB → CIE Lab (D65), para medir diferencias de color parecidas a las que ve el ojo. */
function lab(r: number, g: number, b: number): [number, number, number] {
  const R = lin(r); const G = lin(g); const B = lin(b);
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function labImage(pixels: Pixels): Float32Array {
  const { data, width, height } = pixels;
  const out = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const [l, a, b] = lab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    out[i * 3] = l; out[i * 3 + 1] = a; out[i * 3 + 2] = b;
  }
  // Desenfoque 3×3: calma el grano de la cámara y los vellos finos.
  const blur = new Float32Array(out.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    for (let ch = 0; ch < 3; ch++) {
      let sum = 0; let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx; const yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < width && yy < height) { sum += out[(yy * width + xx) * 3 + ch]; n++; }
      }
      blur[(y * width + x) * 3 + ch] = sum / n;
    }
  }
  return blur;
}

/** Umbral de Otsu sobre las distancias de color (0–100) para separar "parecido a la lesión" de "el resto". */
function otsu(values: Float32Array): number {
  const BINS = 100;
  const hist = new Float64Array(BINS);
  for (const v of values) hist[Math.min(BINS - 1, Math.max(0, Math.floor(v)))]++;
  const total = values.length;
  let sumAll = 0;
  for (let i = 0; i < BINS; i++) sumAll += i * hist[i];
  let wB = 0; let sumB = 0; let best = 0; let threshold = 10;
  for (let i = 0; i < BINS; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const between = wB * wF * ((sumB / wB) - ((sumAll - sumB) / wF)) ** 2;
    if (between > best) { best = between; threshold = i + 1; }
  }
  return threshold;
}

export function findLesionExtremes(
  width: number, height: number, sample: Sampler, seed: Point, coin?: { center: Point; radius: number },
): LesionFit | null {
  // Ventana alrededor del punto: la mitad del lado corto de la foto, o ~6 monedas si se conoce su tamaño.
  const side = Math.min(Math.min(width, height) * 0.6, coin ? coin.radius * 14 : Infinity);
  const box = {
    x: Math.round(Math.min(Math.max(0, seed.x - side / 2), Math.max(0, width - side))),
    y: Math.round(Math.min(Math.max(0, seed.y - side / 2), Math.max(0, height - side))),
    w: Math.round(Math.min(side, width)), h: Math.round(Math.min(side, height)),
  };
  const px = sample(box, 320);
  if (!px) return null;
  const k = box.w / px.width;
  const { width: w, height: h } = px;
  const image = labImage(px);
  const sx = Math.min(w - 1, Math.max(0, Math.round((seed.x - box.x) / k)));
  const sy = Math.min(h - 1, Math.max(0, Math.round((seed.y - box.y) / k)));

  // Color de la lesión: mediana de un parche pequeño alrededor del punto tocado.
  const patch: number[][] = [[], [], []];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = sx + dx; const yy = sy + dy;
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    for (let ch = 0; ch < 3; ch++) patch[ch].push(image[(yy * w + xx) * 3 + ch]);
  }
  const med = patch.map((values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]);

  // La moneda no puede formar parte de la lesión: se descarta su círculo (con un pequeño margen).
  const inCoin = (x: number, y: number) => !!coin && Math.hypot(box.x + x * k - coin.center.x, box.y + y * k - coin.center.y) < coin.radius * 1.12;
  const dist = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) dist[i] = Math.hypot(image[i * 3] - med[0], image[i * 3 + 1] - med[1], image[i * 3 + 2] - med[2]);
  const threshold = Math.min(32, Math.max(7, otsu(dist)));

  const inside = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0; let tail = 0;
  queue[tail++] = sy * w + sx; inside[sy * w + sx] = 1;
  let touchesBorder = 0;
  while (head < tail) {
    const i = queue[head++];
    const x = i % w; const y = (i - x) / w;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesBorder++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx; const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if (inside[j] || dist[j] > threshold || inCoin(xx, yy)) continue;
      inside[j] = 1; queue[tail++] = j;
    }
  }
  const area = tail;
  const fraction = area / (w * h);
  // Una región enorme o pegada al borde de la ventana es piel que se "escapó", no una lesión.
  if (area < 12 || fraction > 0.5 || touchesBorder > 0.03 * (w + h)) return null;

  const boundary: Point[] = [];
  for (let n = 0; n < tail; n++) {
    const i = queue[n];
    const x = i % w; const y = (i - x) / w;
    if ((x > 0 && !inside[i - 1]) || (x < w - 1 && !inside[i + 1]) || (y > 0 && !inside[i - w]) || (y < h - 1 && !inside[i + w])) boundary.push({ x, y });
  }
  const stride = Math.max(1, Math.ceil(boundary.length / 700));
  const sampled = boundary.filter((_, index) => index % stride === 0);
  let best = 0; let pair: [Point, Point] = [sampled[0], sampled[0]];
  for (let a = 0; a < sampled.length; a++) for (let b = a + 1; b < sampled.length; b++) {
    const d = (sampled[a].x - sampled[b].x) ** 2 + (sampled[a].y - sampled[b].y) ** 2;
    if (d > best) { best = d; pair = [sampled[a], sampled[b]]; }
  }
  if (best === 0) return null;
  const back = (p: Point): Point => ({ x: box.x + (p.x + 0.5) * k, y: box.y + (p.y + 0.5) * k });
  return { points: [back(pair[0]), back(pair[1])], areaFraction: fraction };
}

// Detección de la moneda de referencia en el propio dispositivo (sin enviar la foto a nadie).
// Transformada de Hough circular guiada por el gradiente, en dos pasadas: una gruesa sobre toda la foto
// reducida y otra fina sobre el recorte de la moneda. Con los bordes de la moneda se estima además qué tan
// ovalada se ve, que delata una foto tomada con el teléfono inclinado.

export type Pixels = { data: ArrayLike<number>; width: number; height: number };
export type Point = { x: number; y: number };

export type CoinFit = {
  center: Point;
  /** Radio en píxeles de la imagen original. */
  radius: number;
  /** Puntos extremos del diámetro mayor, en píxeles de la imagen original. */
  diameterPoints: [Point, Point];
  /** Semieje menor / semieje mayor (1 = círculo perfecto). */
  axisRatio: number;
  /** Proporción del contorno que se ve (0–1). */
  coverage: number;
  /** Qué tan nítido es el círculo (0–1). */
  score: number;
};

type Edges = { x: Int16Array; y: Int16Array; gx: Float32Array; gy: Float32Array; mag: Float32Array; count: number };

function gray(pixels: Pixels): Float32Array {
  const { data, width, height } = pixels;
  const out = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) out[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  return out;
}

/** Bordes fuertes (Sobel): se queda con el percentil indicado de mayor magnitud. */
function edgesOf(pixels: Pixels, keepFraction: number): Edges {
  const { width, height } = pixels;
  const g = gray(pixels);
  const mags = new Float32Array(width * height);
  const gxs = new Float32Array(width * height);
  const gys = new Float32Array(width * height);
  const sample: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = -g[i - width - 1] - 2 * g[i - 1] - g[i + width - 1] + g[i - width + 1] + 2 * g[i + 1] + g[i + width + 1];
      const gy = -g[i - width - 1] - 2 * g[i - width] - g[i - width + 1] + g[i + width - 1] + 2 * g[i + width] + g[i + width + 1];
      const m = Math.hypot(gx, gy);
      mags[i] = m; gxs[i] = gx; gys[i] = gy;
      if (m > 0) sample.push(m);
    }
  }
  const empty: Edges = { x: new Int16Array(0), y: new Int16Array(0), gx: new Float32Array(0), gy: new Float32Array(0), mag: new Float32Array(0), count: 0 };
  if (sample.length === 0) return empty;
  sample.sort((a, b) => a - b);
  const threshold = Math.max(sample[Math.floor(sample.length * (1 - keepFraction))], 24);
  const xs: number[] = []; const ys: number[] = []; const fx: number[] = []; const fy: number[] = []; const fm: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (mags[i] >= threshold) { xs.push(x); ys.push(y); fx.push(gxs[i]); fy.push(gys[i]); fm.push(mags[i]); }
    }
  }
  return { x: Int16Array.from(xs), y: Int16Array.from(ys), gx: Float32Array.from(fx), gy: Float32Array.from(fy), mag: Float32Array.from(fm), count: xs.length };
}

type Candidate = { cx: number; cy: number; r: number; score: number };

/** Hough circular grueso: devuelve los mejores círculos (separados entre sí) como puntos de partida. */
function houghCircles(pixels: Pixels, rMin: number, rMax: number, keepFraction: number, top: number): Candidate[] {
  const { width, height } = pixels;
  const edges = edgesOf(pixels, keepFraction);
  if (edges.count < 30) return [];
  const radii = Math.max(1, Math.floor(rMax - rMin) + 1);
  const plane = width * height;
  const acc = new Uint16Array(plane * radii);
  for (let k = 0; k < edges.count; k++) {
    const m = edges.mag[k];
    const ux = edges.gx[k] / m; const uy = edges.gy[k] / m;
    for (const sign of [1, -1]) {
      for (let ri = 0; ri < radii; ri++) {
        const r = rMin + ri;
        const cx = Math.round(edges.x[k] + sign * ux * r);
        const cy = Math.round(edges.y[k] + sign * uy * r);
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
        acc[ri * plane + cy * width + cx]++;
      }
    }
  }
  const found: Candidate[] = [];
  for (let ri = 0; ri < radii; ri++) {
    const r = rMin + ri;
    const expected = 2 * Math.PI * r;
    const offset = ri * plane;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const v = acc[offset + y * width + x];
        if (v < 6) continue;
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += acc[offset + (y + dy) * width + x + dx];
        const score = sum / expected;
        if (score >= 0.15) found.push({ cx: x, cy: y, r, score });
      }
    }
  }
  found.sort((a, b) => b.score - a.score);
  const picked: Candidate[] = [];
  for (const candidate of found) {
    if (picked.every((other) => Math.hypot(other.cx - candidate.cx, other.cy - candidate.cy) > Math.max(other.r, candidate.r) * 0.6)) picked.push(candidate);
    if (picked.length >= top) break;
  }
  return picked;
}

function blurred(pixels: Pixels): Float32Array {
  const { width, height } = pixels;
  const g = gray(pixels);
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0; let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx; const yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < width && yy < height) { sum += g[yy * width + xx]; n++; }
      }
      out[y * width + x] = sum / n;
    }
  }
  return out;
}

const bilinear = (g: Float32Array, width: number, height: number, x: number, y: number): number => {
  const x0 = Math.min(width - 2, Math.max(0, Math.floor(x))); const y0 = Math.min(height - 2, Math.max(0, Math.floor(y)));
  const fx = Math.min(1, Math.max(0, x - x0)); const fy = Math.min(1, Math.max(0, y - y0));
  const i = y0 * width + x0;
  return g[i] * (1 - fx) * (1 - fy) + g[i + 1] * fx * (1 - fy) + g[i + width] * (1 - fx) * fy + g[i + width + 1] * fx * fy;
};

/** Resuelve A·x = b (n pequeña) por eliminación gaussiana con pivoteo; null si es singular. */
function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let row = col + 1; row < n; row++) {
      const factor = m[row][col] / m[col][col];
      for (let k = col; k <= n; k++) m[row][k] -= factor * m[col][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = m[row][n];
    for (let k = row + 1; k < n; k++) sum -= m[row][k] * x[k];
    x[row] = sum / m[row][row];
  }
  return x;
}

type Ellipse = { cx: number; cy: number; a: number; b: number; angle: number; f0: number; q: number[] };

/** Elipse por mínimos cuadrados: A x² + B xy + C y² + D x + E y = 1 (puntos centrados en el origen aproximado). */
function fitEllipse(points: Point[]): Ellipse | null {
  const rows = points.map((p) => [p.x * p.x, p.x * p.y, p.y * p.y, p.x, p.y]);
  const normal = Array.from({ length: 5 }, () => new Array<number>(5).fill(0));
  const rhs = new Array<number>(5).fill(0);
  for (const row of rows) for (let i = 0; i < 5; i++) { rhs[i] += row[i]; for (let j = 0; j < 5; j++) normal[i][j] += row[i] * row[j]; }
  const sol = solve(normal, rhs);
  if (!sol) return null;
  const [A, B, C, D, E] = sol;
  const det = 4 * A * C - B * B;
  if (!(det > 0)) return null;
  const cx = (B * E - 2 * C * D) / det;
  const cy = (B * D - 2 * A * E) / det;
  const f0 = 1 + (D * cx + E * cy) / 2;
  if (!(f0 > 0)) return null;
  const t = (A + C) / 2; const d = Math.sqrt(((A - C) / 2) ** 2 + (B / 2) ** 2);
  const l1 = t + d; const l2 = t - d; // l2 ≤ l1: l2 pertenece al eje mayor
  if (!(l2 > 0)) return null;
  const angle = 0.5 * Math.atan2(B, A - C); // dirección del autovector de l1 (eje menor)
  return { cx, cy, a: Math.sqrt(f0 / l2), b: Math.sqrt(f0 / l1), angle: angle + Math.PI / 2, f0, q: sol };
}

const normalized = (e: Ellipse, p: Point): number => {
  const [A, B, C, D, E] = e.q;
  const x = p.x; const y = p.y;
  const value = A * x * x + B * x * y + C * y * y + D * x + E * y;
  return Math.sqrt(Math.max(0, value / 1)) ; // 1 sobre la elipse
};

/**
 * Busca el borde de la moneda en rayos que salen del centro aproximado y ajusta una elipse a esos bordes.
 * Rechaza el candidato si se ve menos de ~60 % del contorno o si no se parece a una elipse.
 */
function refineWithRays(pixels: Pixels, c: Candidate): { ellipse: Ellipse; coverage: number } | null {
  const { width, height } = pixels;
  const g = blurred(pixels);
  const RAYS = 90;
  const found: Point[] = [];
  const raw: Array<{ p: Point; s: number; sign: number } | null> = [];
  for (let k = 0; k < RAYS; k++) {
    const angle = (k / RAYS) * 2 * Math.PI;
    const ux = Math.cos(angle); const uy = Math.sin(angle);
    let bestDelta = 0; let bestT = 0; let bestSign = 0;
    for (let t = c.r * 0.7; t <= c.r * 1.3; t += 0.5) {
      const x1 = c.cx + ux * (t - 1.5); const y1 = c.cy + uy * (t - 1.5);
      const x2 = c.cx + ux * (t + 1.5); const y2 = c.cy + uy * (t + 1.5);
      if (x1 < 0 || y1 < 0 || x2 < 0 || y2 < 0 || x1 > width - 1 || x2 > width - 1 || y1 > height - 1 || y2 > height - 1) continue;
      const delta = bilinear(g, width, height, x2, y2) - bilinear(g, width, height, x1, y1);
      if (Math.abs(delta) > Math.abs(bestDelta)) { bestDelta = delta; bestT = t; bestSign = Math.sign(delta); }
    }
    if (Math.abs(bestDelta) >= 14) raw.push({ p: { x: c.cx + Math.cos(angle) * bestT, y: c.cy + Math.sin(angle) * bestT }, s: Math.abs(bestDelta), sign: bestSign });
    else raw.push(null);
  }
  const positive = raw.filter((item) => item && item.sign > 0).length;
  const negative = raw.filter((item) => item && item.sign < 0).length;
  const majority = positive >= negative ? 1 : -1;
  for (const item of raw) if (item && item.sign === majority) found.push(item.p);
  if (found.length < RAYS * 0.5) return null;

  // Ajuste con descarte de valores atípicos (reflejos, la sombra de la lesión, el borde de la foto).
  let points = found;
  let ellipse: Ellipse | null = null;
  for (let pass = 0; pass < 3; pass++) {
    const local = points.map((p) => ({ x: p.x - c.cx, y: p.y - c.cy }));
    ellipse = fitEllipse(local);
    if (!ellipse) return null;
    const e = ellipse;
    const keep = points.filter((p) => Math.abs(normalized(e, { x: p.x - c.cx, y: p.y - c.cy }) - 1) < 0.08);
    // normalized() mide la forma cuadrática; sobre la elipse vale 1.
    if (keep.length === points.length || keep.length < RAYS * 0.5) break;
    points = keep;
  }
  if (!ellipse) return null;
  const local = points.map((p) => ({ x: p.x - c.cx, y: p.y - c.cy }));
  const final = fitEllipse(local);
  if (!final) return null;
  const rms = Math.sqrt(local.reduce((sum, p) => sum + (normalized(final, p) - 1) ** 2, 0) / local.length);
  const coverage = points.length / RAYS;
  if (coverage < 0.6 || rms > 0.04) return null;
  if (final.a < c.r * 0.6 || final.a > c.r * 1.5 || final.b / final.a < 0.55) return null;
  return { ellipse: { ...final, cx: final.cx + c.cx, cy: final.cy + c.cy }, coverage };
}

export type Sampler = (box: { x: number; y: number; w: number; h: number }, maxSide: number) => Pixels | null;

/**
 * Busca la moneda en una foto de `width`×`height`. `sample` entrega los píxeles de una región reducida
 * (en el navegador, dibujándola en un canvas pequeño).
 */
export function findCoin(width: number, height: number, sample: Sampler): CoinFit | null {
  const COARSE = 300;
  const whole = sample({ x: 0, y: 0, w: width, h: height }, COARSE);
  if (!whole) return null;
  const k1 = Math.max(width, height) / Math.max(whole.width, whole.height);
  const smallShort = Math.min(whole.width, whole.height);
  const candidates = houghCircles(whole, Math.max(5, Math.round(smallShort * 0.03)), Math.round(smallShort * 0.3), 0.08, 4);
  for (const candidate of candidates) {
    const center = { x: candidate.cx * k1, y: candidate.cy * k1 };
    const radiusGuess = candidate.r * k1;
    const half = radiusGuess * 1.6;
    const box = { x: Math.max(0, Math.round(center.x - half)), y: Math.max(0, Math.round(center.y - half)), w: 0, h: 0 };
    box.w = Math.min(width - box.x, Math.round(half * 2));
    box.h = Math.min(height - box.y, Math.round(half * 2));
    const crop = sample(box, 480);
    if (!crop) continue;
    const k2 = box.w / crop.width;
    const start: Candidate = { cx: (center.x - box.x) / k2, cy: (center.y - box.y) / k2, r: radiusGuess / k2, score: candidate.score };
    const fit = refineWithRays(crop, start);
    if (!fit) continue;
    const e = fit.ellipse;
    const ux = Math.cos(e.angle); const uy = Math.sin(e.angle);
    const c = { x: box.x + e.cx * k2, y: box.y + e.cy * k2 };
    const radius = e.a * k2;
    return {
      center: c,
      radius,
      diameterPoints: [{ x: c.x - ux * radius, y: c.y - uy * radius }, { x: c.x + ux * radius, y: c.y + uy * radius }],
      axisRatio: Math.min(1, e.b / e.a),
      coverage: fit.coverage,
      score: Math.min(1, candidate.score),
    };
  }
  return null;
}

/** Pasada de la foto de pantalla a píxeles: dibuja la región en un canvas pequeño y lee sus píxeles. */
export function imageSampler(img: HTMLImageElement): Sampler {
  return (box, maxSide) => {
    const scale = Math.min(1, maxSide / Math.max(box.w, box.h));
    const w = Math.max(1, Math.round(box.w * scale));
    const h = Math.max(1, Math.round(box.h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    try {
      context.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, w, h);
      const data = context.getImageData(0, 0, w, h);
      return { data: data.data, width: w, height: h };
    } catch {
      return null;
    }
  };
}

/** Por debajo de este cociente la moneda se ve claramente ovalada: la foto está inclinada. */
export const TILT_WARNING_RATIO = 0.93;

import { describe, it, expect } from "vitest";
import { findCoin, type Sampler } from "./coin-detect";

// Foto sintética: piel con ruido suave, una moneda (elipse) y una mancha oscura que hace de lesión.
function scene(width: number, height: number, coin: { cx: number; cy: number; a: number; b: number; angle?: number } | null): Sampler {
  const cos = Math.cos(coin?.angle ?? 0); const sin = Math.sin(coin?.angle ?? 0);
  return (box, maxSide) => {
    const scale = Math.min(1, maxSide / Math.max(box.w, box.h));
    const w = Math.max(1, Math.round(box.w * scale)); const h = Math.max(1, Math.round(box.h * scale));
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = box.x + (x + 0.5) / scale; const py = box.y + (y + 0.5) / scale;
        let v = 200 + 8 * Math.sin(px * 0.011) + 6 * Math.cos(py * 0.017) + ((x * 7 + y * 13) % 5);
        let r = v; let g = v * 0.8; let b = v * 0.7;
        if (coin) {
          const dx = px - coin.cx; const dy = py - coin.cy;
          const u = (dx * cos + dy * sin) / coin.a; const t = (-dx * sin + dy * cos) / coin.b;
          if (u * u + t * t <= 1) { r = g = b = 120; }
        }
        const lx = px - width * 0.3; const ly = py - height * 0.6;
        if (lx * lx / 3600 + ly * ly / 1600 <= 1) { r = 120; g = 70; b = 60; }
        const i = (y * w + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
      }
    }
    return { data, width: w, height: h };
  };
}

describe("findCoin", () => {
  it("encuentra una moneda de frente con su centro y su diámetro", () => {
    const fit = findCoin(3000, 4000, scene(3000, 4000, { cx: 1900, cy: 1500, a: 330, b: 330 }));
    expect(fit).not.toBeNull();
    expect(Math.hypot(fit!.center.x - 1900, fit!.center.y - 1500)).toBeLessThan(15);
    expect(Math.abs(fit!.radius - 330) / 330).toBeLessThan(0.02);
    expect(fit!.axisRatio).toBeGreaterThan(0.97);
    const [p, q] = fit!.diameterPoints;
    expect(Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - 660) / 660).toBeLessThan(0.02);
  });

  it("detecta que la moneda está ovalada (foto inclinada) y usa el eje mayor", () => {
    const fit = findCoin(3000, 4000, scene(3000, 4000, { cx: 1900, cy: 1500, a: 330, b: 280, angle: 0.5 }));
    expect(fit).not.toBeNull();
    expect(fit!.axisRatio).toBeGreaterThan(0.8);
    expect(fit!.axisRatio).toBeLessThan(0.9);
    expect(Math.abs(fit!.radius - 330) / 330).toBeLessThan(0.04);
    // el diámetro devuelto va por el eje mayor (a 0,5 rad)
    const [p, q] = fit!.diameterPoints;
    expect(Math.abs(Math.atan2(q.y - p.y, q.x - p.x) - 0.5) % Math.PI).toBeLessThan(0.1);
  });

  it("sigue encontrándola con ruido de la cámara", () => {
    const base = scene(3000, 4000, { cx: 1500, cy: 2200, a: 280, b: 280 });
    let seed = 7;
    const noisy: Sampler = (box, maxSide) => {
      const out = base(box, maxSide);
      if (!out) return out;
      const data = out.data as Uint8ClampedArray;
      for (let i = 0; i < data.length; i += 4) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const n = ((seed >> 8) % 21) - 10;
        data[i] += n; data[i + 1] += n; data[i + 2] += n;
      }
      return out;
    };
    const fit = findCoin(3000, 4000, noisy);
    expect(fit).not.toBeNull();
    expect(Math.abs(fit!.radius - 280) / 280).toBeLessThan(0.03);
  });

  it("no inventa una moneda cuando no hay ninguna", () => {
    expect(findCoin(3000, 4000, scene(3000, 4000, null))).toBeNull();
  });
});

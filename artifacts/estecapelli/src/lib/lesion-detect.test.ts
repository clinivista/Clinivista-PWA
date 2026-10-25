import { describe, it, expect } from "vitest";
import { findLesionExtremes } from "./lesion-detect";
import type { Sampler } from "./coin-detect";

// Piel con grano, una lesión elíptica más oscura y rojiza (eje mayor 2·a) y, opcionalmente, una moneda.
function scene(lesion: { cx: number; cy: number; a: number; b: number; angle: number }, withCoin = false): Sampler {
  const cos = Math.cos(lesion.angle); const sin = Math.sin(lesion.angle);
  return (box, maxSide) => {
    const scale = Math.min(1, maxSide / Math.max(box.w, box.h));
    const w = Math.max(1, Math.round(box.w * scale)); const h = Math.max(1, Math.round(box.h * scale));
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = box.x + (x + 0.5) / scale; const py = box.y + (y + 0.5) / scale;
      const grain = ((x * 7 + y * 13) % 7) - 3;
      let r = 224 + grain, g = 180 + grain, b = 160 + grain;
      const dx = px - lesion.cx; const dy = py - lesion.cy;
      const u = (dx * cos + dy * sin) / lesion.a; const t = (-dx * sin + dy * cos) / lesion.b;
      if (u * u + t * t <= 1) { r = 150 + grain; g = 90 + grain; b = 80 + grain; }
      if (withCoin && Math.hypot(px - (lesion.cx + lesion.a + 140), py - lesion.cy) < 100) { r = g = b = 120; }
      const i = (y * w + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
    return { data, width: w, height: h };
  };
}

describe("findLesionExtremes", () => {
  const lesion = { cx: 1500, cy: 2000, a: 260, b: 120, angle: 0.4 };

  it("propone los extremos del eje mayor de la lesión a partir de un punto dentro de ella", () => {
    const fit = findLesionExtremes(3000, 4000, scene(lesion), { x: 1520, y: 1990 });
    expect(fit).not.toBeNull();
    const [p, q] = fit!.points;
    expect(Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - 520) / 520).toBeLessThan(0.05);
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    expect(Math.abs(Math.sin(angle - 0.4))).toBeLessThan(0.1);
  });

  it("no incluye la moneda que está pegada a la lesión", () => {
    const fit = findLesionExtremes(3000, 4000, scene(lesion, true), { x: 1500, y: 2000 }, { center: { x: 1500 + 260 + 140, y: 2000 }, radius: 100 });
    expect(fit).not.toBeNull();
    const [p, q] = fit!.points;
    expect(Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - 520) / 520).toBeLessThan(0.06);
  });

  it("devuelve null si el punto está en piel sin una lesión que destaque", () => {
    expect(findLesionExtremes(3000, 4000, scene(lesion), { x: 400, y: 600 })).toBeNull();
  });
});

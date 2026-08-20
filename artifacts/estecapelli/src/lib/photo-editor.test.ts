import { describe, expect, it } from "vitest";
import {
  TECHNICAL_LIMITS,
  createDefaultTechnicalParams,
  cropFromReframe,
  normalizeTechnicalParams,
} from "./photo-editor";

describe("technical photo editor parameters", () => {
  it("starts neutral and preserves the full original frame", () => {
    const params = createDefaultTechnicalParams(2400, 1800);
    expect(params.crop).toEqual({ x: 0, y: 0, width: 2400, height: 1800, aspectRatio: 2400 / 1800 });
    expect(params.rotation).toBe(0);
    expect(params.brightness).toBe(0);
    expect(params.noiseReduction).toBe(0);
  });

  it("normalizes untrusted values into conservative limits", () => {
    const params = normalizeTechnicalParams({
      version: 99,
      crop: { x: -50, y: 5000, width: 99999, height: -1, aspectRatio: 20 },
      rotation: 30, exposure: -9, brightness: 90, contrast: -90, highlights: 90, shadows: -90,
      temperature: 60, saturation: -60, clarity: 90, sharpness: 90, noiseReduction: 90,
    }, 1200, 800);

    expect(params.version).toBe(1);
    expect(params.crop.x).toBeGreaterThanOrEqual(0);
    expect(params.crop.y).toBeGreaterThanOrEqual(0);
    expect(params.crop.width).toBeLessThanOrEqual(1200);
    expect(params.crop.height).toBeLessThanOrEqual(800);
    for (const [key, [min, max]] of Object.entries(TECHNICAL_LIMITS)) {
      const value = params[key as keyof typeof TECHNICAL_LIMITS];
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
  });

  it("reframes by reducing output dimensions instead of enlarging pixels", () => {
    const next = cropFromReframe(createDefaultTechnicalParams(2000, 1200), 2000, 1200, 1.25, 100, 100);
    expect(next.crop.width).toBeLessThan(2000);
    expect(next.crop.height).toBeLessThan(1200);
    expect(next.crop.x + next.crop.width).toBeLessThanOrEqual(2000);
    expect(next.crop.y + next.crop.height).toBeLessThanOrEqual(1200);
  });
});
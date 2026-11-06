import { describe, it, expect, vi } from "vitest";
import { angleDegrees, describeMeasures, drawStrokes, formatArea, formatAngle, formatLength, hitsStroke, mmPerPixel, polygonStats, simplify, strokeToJson, type Stroke } from "./annotation";

const pen = (points: Array<[number, number]>): Stroke => ({ type: "pen", color: "#ef4444", width: 0.006, points });

describe("simplify", () => {
  it("collapses a straight run of points but keeps the corners", () => {
    const straight = Array.from({ length: 50 }, (_, i): [number, number] => [i / 49, 0.5]);
    expect(simplify(straight)).toEqual([[0, 0.5], [1, 0.5]]);
    const corner = [[0, 0], [0.25, 0], [0.5, 0], [0.5, 0.25], [0.5, 0.5]] as Array<[number, number]>;
    expect(simplify(corner)).toEqual([[0, 0], [0.5, 0], [0.5, 0.5]]);
  });
  it("leaves tiny strokes alone", () => {
    expect(simplify([[0.1, 0.1]])).toEqual([[0.1, 0.1]]);
  });
});

describe("hitsStroke (the eraser)", () => {
  it("hits a pen stroke near its path and misses far from it", () => {
    const stroke = pen([[0.1, 0.1], [0.5, 0.1]]);
    expect(hitsStroke(stroke, [0.3, 0.105], 1)).toBe(true);
    expect(hitsStroke(stroke, [0.3, 0.4], 1)).toBe(false);
  });
  it("hits an ellipse on its outline, not in its middle", () => {
    const stroke: Stroke = { type: "ellipse", color: "#fff", width: 0.006, points: [[0.2, 0.2], [0.6, 0.6]] };
    expect(hitsStroke(stroke, [0.6, 0.4], 1)).toBe(true);
    expect(hitsStroke(stroke, [0.4, 0.4], 1)).toBe(false);
  });
  it("hits lines, arrows and text", () => {
    expect(hitsStroke({ type: "line", color: "#fff", width: 0.006, points: [[0, 0], [1, 1]] }, [0.5, 0.5], 1)).toBe(true);
    expect(hitsStroke({ type: "arrow", color: "#fff", width: 0.006, points: [[0, 0], [1, 0]] }, [0.5, 0.3], 1)).toBe(false);
    const text: Stroke = { type: "text", color: "#fff", width: 0.006, points: [[0.2, 0.5]], text: "Zona" };
    expect(hitsStroke(text, [0.22, 0.49], 1)).toBe(true);
    expect(hitsStroke(text, [0.8, 0.9], 1)).toBe(false);
  });
});

describe("strokeToJson", () => {
  it("rounds coordinates and keeps the text only for text strokes", () => {
    const out = strokeToJson([
      pen([[0.123456, 1.4]]),
      { type: "text", color: "#fff", width: 0.006, points: [[0.5, 0.5]], text: "Hola" },
    ]);
    expect(out[0]).toEqual({ type: "pen", color: "#ef4444", width: 0.006, points: [[0.1235, 1]] });
    expect(out[1]).toMatchObject({ type: "text", text: "Hola" });
  });
});

describe("drawStrokes", () => {
  it("draws every stroke kind scaled to the canvas", () => {
    const ctx = {
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      ellipse: vi.fn(), fillText: vi.fn(), closePath: vi.fn(), fill: vi.fn(),
      strokeStyle: "", fillStyle: "", lineWidth: 0, lineCap: "", lineJoin: "", font: "", textBaseline: "", shadowColor: "", shadowBlur: 0,
    };
    drawStrokes(ctx as never, [
      pen([[0, 0], [1, 1]]),
      { type: "line", color: "#fff", width: 0.006, points: [[0, 0], [1, 0]] },
      { type: "arrow", color: "#fff", width: 0.006, points: [[0, 0], [0, 1]] },
      { type: "ellipse", color: "#fff", width: 0.006, points: [[0.25, 0.25], [0.75, 0.75]] },
      { type: "text", color: "#fff", width: 0.006, points: [[0.1, 0.9]], text: "Nota" },
    ], 200, 100);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(200, 100);
    expect(ctx.ellipse).toHaveBeenCalledWith(100, 50, 50, 25, 0, 0, Math.PI * 2);
    expect(ctx.fillText).toHaveBeenCalledWith("Nota", 20, 90);
    expect(ctx.fill).toHaveBeenCalledTimes(1); // the arrow head
  });
});

describe("medición sobre la foto", () => {
  const size = { width: 1000, height: 500 };
  const scale: Stroke = { type: "scale", color: "#fff", width: 0.003, points: [[0, 0.5], [0.2, 0.5]], text: "20" }; // 200 px = 20 mm → 0,1 mm/px

  it("calcula los milímetros por píxel con la escala (y usa la última)", () => {
    expect(mmPerPixel([], size)).toBeNull();
    expect(mmPerPixel([scale], size)).toBeCloseTo(0.1);
    expect(mmPerPixel([scale, { ...scale, points: [[0, 0], [0.1, 0]], text: "30" }], size)).toBeCloseTo(0.3); // 100 px = 30 mm
    expect(mmPerPixel([{ ...scale, text: "abc" }], size)).toBeNull();
  });

  it("mide con los ejes de la foto, no con las proporciones: horizontal y vertical valen distinto", () => {
    const { measures } = describeMeasures([scale, { type: "ruler", color: "#fff", width: 0.003, points: [[0, 0], [1, 0]] }, { type: "ruler", color: "#fff", width: 0.003, points: [[0, 0], [0, 1]] }], size);
    expect(measures).toEqual([{ kind: "ruler", index: 1, mm: 100 }, { kind: "ruler", index: 2, mm: 50 }]);
  });

  it("sin escala no inventa medidas en mm, pero el ángulo sí se calcula", () => {
    const { scaleMm, measures } = describeMeasures([
      { type: "ruler", color: "#fff", width: 0.003, points: [[0, 0], [1, 0]] },
      { type: "angle", color: "#fff", width: 0.003, points: [[0.5, 0], [0, 0], [0, 0.5]] },
    ], { width: 100, height: 100 });
    expect(scaleMm).toBeNull();
    expect(measures[0]).toEqual({ kind: "ruler", index: 1, mm: null });
    expect(measures[1]).toMatchObject({ kind: "angle", degrees: 90 });
  });

  it("ángulo en grados, área y perímetro de un polígono", () => {
    expect(angleDegrees([1, 0], [0, 0], [1, 1], { width: 1, height: 1 })).toBeCloseTo(45);
    expect(angleDegrees([1, 0], [0, 0], [-1, 0], { width: 1, height: 1 })).toBeCloseTo(180);
    const square = polygonStats([[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]], { width: 100, height: 100 });
    expect(square.areaPx).toBeCloseTo(2500);
    expect(square.perimeterPx).toBeCloseTo(200);
    const area = describeMeasures([{ type: "scale", color: "#fff", width: 0.003, points: [[0, 0], [0.1, 0]], text: "10" }, { type: "area", color: "#fff", width: 0.003, points: [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]] }], { width: 100, height: 100 }).measures[0];
    expect(area).toMatchObject({ kind: "area", index: 1 });
    expect((area as { mm2: number }).mm2).toBeCloseTo(2500, 0); // 1 mm por px
  });

  it("da formato corto: mm, cm, cm² y grados", () => {
    expect(formatLength(8.46)).toBe("8.5 mm");
    expect(formatLength(24)).toBe("2.4 cm");
    expect(formatArea(42)).toBe("42 mm²");
    expect(formatArea(250)).toBe("2.5 cm²");
    expect(formatAngle(34.56)).toBe("34.6°");
  });

  it("numera los marcadores en el orden en que se pusieron y deja su nota", () => {
    const { measures } = describeMeasures([
      { type: "marker", color: "#fff", width: 0.003, points: [[0.1, 0.1]], text: "línea frontal" },
      { type: "marker", color: "#fff", width: 0.003, points: [[0.2, 0.2]], text: "" },
    ], size);
    expect(measures).toEqual([{ kind: "marker", index: 1, note: "línea frontal", strokeIndex: 0 }, { kind: "marker", index: 2, note: "", strokeIndex: 1 }]);
  });

  it("el borrador alcanza las mediciones pero no las guías", () => {
    expect(hitsStroke({ type: "ruler", color: "#fff", width: 0.003, points: [[0, 0], [1, 0]] }, [0.5, 0.005], 1)).toBe(true);
    expect(hitsStroke({ type: "area", color: "#fff", width: 0.003, points: [[0.2, 0.2], [0.6, 0.2], [0.6, 0.6]] }, [0.4, 0.2], 1)).toBe(true);
    expect(hitsStroke({ type: "marker", color: "#fff", width: 0.003, points: [[0.3, 0.3]] }, [0.31, 0.3], 1)).toBe(true);
    expect(hitsStroke({ type: "guide", color: "#fff", width: 0.003, points: [[0.5, 0.5]], text: "grid" }, [0.333, 0.5], 1)).toBe(false);
  });

  it("dibuja regla, ángulo, área, marcador y guías con sus etiquetas", () => {
    const labels: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (target, key: string) => key === "fillText" ? (text: string) => labels.push(text) : (target[key] ?? (() => undefined)),
      set: (target, key: string, value) => { target[key] = value; return true; },
    });
    drawStrokes(ctx as never, [
      scale,
      { type: "ruler", color: "#ef4444", width: 0.003, points: [[0, 0], [0.5, 0]] },
      { type: "angle", color: "#ef4444", width: 0.003, points: [[0.5, 0], [0, 0], [0, 0.5]] },
      { type: "area", color: "#ef4444", width: 0.003, points: [[0, 0], [0.2, 0], [0.2, 0.4]] },
      { type: "marker", color: "#ef4444", width: 0.003, points: [[0.5, 0.5]], text: "" },
      { type: "guide", color: "#fff", width: 0.003, points: [[0.5, 0.5]], text: "grid" },
    ], 1000, 500);
    expect(labels).toEqual(expect.arrayContaining(["20 mm", "R1 · 5 cm", "1"]));
    expect(labels.some((text) => text.startsWith("A1 · "))).toBe(true);
    expect(labels.some((text) => text.startsWith("Z1 · "))).toBe(true);
  });

  it("guarda la nota de los marcadores y de la escala al exportar", () => {
    const json = strokeToJson([scale, { type: "marker", color: "#fff", width: 0.003, points: [[0.1, 0.1]], text: "a" }, { type: "ruler", color: "#fff", width: 0.003, points: [[0, 0], [1, 1]] }]);
    expect(json.map((stroke) => ("text" in stroke ? stroke.text : undefined))).toEqual(["20", "a", undefined]);
  });
});

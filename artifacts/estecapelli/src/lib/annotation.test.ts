import { describe, it, expect, vi } from "vitest";
import { drawStrokes, hitsStroke, simplify, strokeToJson, type Stroke } from "./annotation";

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

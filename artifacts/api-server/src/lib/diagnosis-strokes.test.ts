import { describe, it, expect, vi } from "vitest";

// parseStrokes es una función pura; se evita abrir la base de datos al importar el módulo.
vi.mock("@workspace/db", () => new Proxy({}, { get: () => ({}) }));
import { parseStrokes } from "./diagnosis";

const base = { color: "#ef4444", width: 0.003 };

describe("parseStrokes: mediciones y guías", () => {
  it("acepta escala, regla, ángulo, área, marcador y guías", () => {
    const raw = [
      { type: "scale", ...base, points: [[0.1, 0.1], [0.3, 0.1]], text: "26" },
      { type: "ruler", ...base, points: [[0, 0], [1, 1]] },
      { type: "angle", ...base, points: [[0.1, 0.1], [0.5, 0.5], [0.9, 0.1]] },
      { type: "area", ...base, points: [[0, 0], [0.5, 0], [0.5, 0.5]] },
      { type: "marker", ...base, points: [[0.2, 0.2]], text: "línea frontal" },
      { type: "marker", ...base, points: [[0.3, 0.3]] },
      { type: "guide", ...base, points: [[0.5, 0.5]], text: "grid" },
    ];
    const parsed = parseStrokes(raw);
    expect(parsed).toHaveLength(7);
    expect(parsed![5]).toMatchObject({ type: "marker", text: "" });
  });

  it("rechaza lo mal formado: escala sin medida válida, ángulos incompletos, áreas enormes, guías desconocidas y texto largo", () => {
    expect(parseStrokes([{ type: "scale", ...base, points: [[0, 0], [1, 0]] }])).toBeNull();
    expect(parseStrokes([{ type: "scale", ...base, points: [[0, 0], [1, 0]], text: "-5" }])).toBeNull();
    expect(parseStrokes([{ type: "scale", ...base, points: [[0, 0], [1, 0]], text: "999999" }])).toBeNull();
    expect(parseStrokes([{ type: "ruler", ...base, points: [[0, 0]] }])).toBeNull();
    expect(parseStrokes([{ type: "angle", ...base, points: [[0, 0], [1, 1]] }])).toBeNull();
    expect(parseStrokes([{ type: "area", ...base, points: [[0, 0], [1, 1]] }])).toBeNull();
    expect(parseStrokes([{ type: "area", ...base, points: Array.from({ length: 61 }, (_, i) => [i / 61, 0.5]) }])).toBeNull();
    expect(parseStrokes([{ type: "guide", ...base, points: [[0.5, 0.5]], text: "diagonal" }])).toBeNull();
    expect(parseStrokes([{ type: "marker", ...base, points: [[0.5, 0.5]], text: "x".repeat(201) }])).toBeNull();
    expect(parseStrokes([{ type: "marker", ...base, points: [[1.5, 0.5]], text: "x" }])).toBeNull();
  });

  it("sigue aceptando los trazos de siempre", () => {
    expect(parseStrokes([{ type: "pen", ...base, points: [[0, 0], [0.5, 0.5]] }, { type: "text", ...base, points: [[0.1, 0.1]], text: "nota" }])).toHaveLength(2);
  });
});

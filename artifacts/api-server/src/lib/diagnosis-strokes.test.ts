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

  it("acepta lo capilar: zonas y líneas con nombre, cuadro de densidad con puntos y clasificación", () => {
    const parsed = parseStrokes([
      { type: "area", ...base, points: [[0.1, 0.1], [0.4, 0.1], [0.4, 0.4]], text: "Zona donante" },
      { type: "ruler", ...base, points: [[0.1, 0.1], [0.4, 0.1]], text: "Línea frontal" },
      { type: "density", ...base, points: [[0.5, 0.5], [0.5, 0.5], [0.51, 0.5]] },
      { type: "class", ...base, points: [[0.14, 0.05]], text: "norwood:IIIv" },
    ]);
    expect(parsed).toHaveLength(4);
    expect(parsed![0]).toMatchObject({ type: "area", text: "Zona donante" });
  });

  it("rechaza lo capilar mal formado: nombre largo, demasiados puntos, grados que no existen", () => {
    expect(parseStrokes([{ type: "area", ...base, points: [[0, 0], [1, 0], [1, 1]], text: "x".repeat(41) }])).toBeNull();
    expect(parseStrokes([{ type: "ruler", ...base, points: [[0, 0], [1, 0]], text: "x".repeat(41) }])).toBeNull();
    expect(parseStrokes([{ type: "density", ...base, points: Array.from({ length: 302 }, () => [0.5, 0.5]) }])).toBeNull();
    expect(parseStrokes([{ type: "density", ...base, points: [] }])).toBeNull();
    expect(parseStrokes([{ type: "class", ...base, points: [[0.1, 0.1]], text: "norwood:IX" }])).toBeNull();
    expect(parseStrokes([{ type: "class", ...base, points: [[0.1, 0.1]] }])).toBeNull();
  });

  it("acepta la planificación: guías faciales, línea frontal y estimación de injertos", () => {
    const parsed = parseStrokes([
      { type: "face", ...base, points: [[0.4, 0.4], [0.6, 0.4], [0.5, 0.42], [0.5, 0.6], [0.5, 0.8]] },
      { type: "hairline", ...base, points: [[0.3, 0.25], [0.5, 0.2], [0.7, 0.25]] },
      { type: "graft", ...base, points: [[0.5, 0.94]], text: "ra=41.2;id=40;da=55;dd=180;hpf=2.2;sf=25" },
    ]);
    expect(parsed).toHaveLength(3);
  });

  it("rechaza la planificación mal formada", () => {
    expect(parseStrokes([{ type: "face", ...base, points: [[0.4, 0.4], [0.6, 0.4]] }])).toBeNull();
    expect(parseStrokes([{ type: "hairline", ...base, points: [[0.3, 0.25]] }])).toBeNull();
    expect(parseStrokes([{ type: "hairline", ...base, points: Array.from({ length: 41 }, () => [0.5, 0.5]) }])).toBeNull();
    for (const text of [undefined, "", "ra=abc", "ra=2000", "xx=1", "ra=1;ra=2", "sf=0", "id=40;" + "a=1;".repeat(40)]) {
      expect(parseStrokes([{ type: "graft", ...base, points: [[0.5, 0.9]], ...(text === undefined ? {} : { text }) }])).toBeNull();
    }
  });
});

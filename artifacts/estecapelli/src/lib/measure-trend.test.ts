import { describe, it, expect } from "vitest";
import { buildMeasureTrends, type TrendInput } from "./measure-trend";

const m = (lengthMm: number, uncertaintyPct = 7) => ({ lengthMm, uncertaintyPct, at: "2026-01-01T00:00:00Z", by: "patient" as const }) as never;
const phase = (id: string, name: string, label: string, measurement?: unknown): TrendInput => ({
  phaseId: id, phaseName: name, views: [{ id: `${id}-v`, label, photo: measurement === undefined ? null : { id: `${id}-p`, measurement: measurement as never } }],
});

describe("buildMeasureTrends", () => {
  it("agrupa por fotografía, compara con la medida anterior y descarta cambios dentro del margen de error", () => {
    const [series] = buildMeasureTrends([
      phase("a", "Pre-evaluación", "Lesión", m(10)),
      phase("b", "Control 1", "lesión ", m(10.8)), // +8 %, pero el error combinado (~1,2 mm) es mayor
      phase("c", "Control 2", "Lesión", m(15)),
      phase("d", "Control 3", "Lesión", m(7)),
    ]);
    expect(series.rows.map((row) => row.change?.verdict ?? null)).toEqual([null, "same", "up", "down"]);
    expect(series.rows[2].change).toMatchObject({ deltaMm: 4.2, pct: 39 });
    expect(series.rows[3].change).toMatchObject({ deltaMm: -8, pct: 53 });
  });

  it("separa las fotografías distintas y ignora las que no tienen medida", () => {
    const series = buildMeasureTrends([
      phase("a", "Pre", "Lesión", m(10)),
      phase("b", "Control", "Cicatriz", m(30)),
      phase("c", "Control 2", "Lesión"),
      phase("d", "Control 3", "Lesión", null),
    ]);
    expect(series.map((item) => [item.label, item.rows.length])).toEqual([["Lesión", 1], ["Cicatriz", 1]]);
  });
});

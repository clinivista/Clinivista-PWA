import { describe, it, expect } from "vitest";
import { mmPerPixel, type Pt, type Stroke } from "./annotation";
import { IPD_MM, hasEstimatedScale, proposeDesign, proposedHairline, proposedRecipient, syncRecipientArea } from "./hair-design";
import { faceGeometry, graftText, parseGraft, GRAFT_DEFAULTS, hairlineHeightPx } from "./hair-plan";

const size = { width: 1000, height: 1000 };
// Cara de frente: ojos a 0,2 de distancia (200 px), entrecejo y = 0,4; nariz 0,55; mentón 0,7.
const FACE: Pt[] = [[0.4, 0.38], [0.6, 0.38], [0.5, 0.4], [0.5, 0.55], [0.5, 0.7]];
const options = { recipientNames: ["Zona receptora", "Recipient zone"], recipientName: "Zona receptora", style: { color: "#ef4444", width: 0.006 } };

describe("diseño asistido", () => {
  const g = faceGeometry(FACE, size)!;

  it("la línea frontal propuesta es simétrica, cruza el eje a la altura sugerida y baja hacia las sienes", () => {
    const line = proposedHairline(g, size);
    expect(line).toHaveLength(9);
    expect(hairlineHeightPx(line, g, size)).toBeCloseTo(g.suggestedPx, 0);
    expect(line[0][1]).toBeGreaterThan(line[4][1]); // sien más baja que el centro (y crece hacia abajo)
    expect(line[0][1]).toBeCloseTo(line[8][1]);
    expect(line[0][0] + line[8][0]).toBeCloseTo(1);
  });

  it("la zona receptora queda sobre la línea frontal y dentro de la foto", () => {
    const zone = proposedRecipient(g, size);
    expect(zone.length).toBeGreaterThanOrEqual(12);
    for (const [x, y] of zone) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1); expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(1); }
    expect(Math.min(...zone.map((p) => p[1]))).toBeLessThan(Math.min(...proposedHairline(g, size).map((p) => p[1])));
  });

  it("propone guías, línea, zona, escala por pupilas e injertos, y reemplaza lo propuesto antes", () => {
    const first = proposeDesign([], FACE, size, options)!;
    expect(first.map((s) => s.type).sort()).toEqual(["area", "face", "graft", "hairline", "scale"]);
    expect(hasEstimatedScale(first)).toBe(true);
    expect(mmPerPixel(first, size)).toBeCloseTo(IPD_MM / 200);
    expect(parseGraft(first.find((s) => s.type === "graft")!.text).ra).toBeGreaterThan(10);
    const again = proposeDesign(first, FACE, size, options)!;
    expect(again.filter((s) => s.type === "hairline")).toHaveLength(1);
    expect(again.filter((s) => s.type === "area")).toHaveLength(1);
  });

  it("respeta una escala real y los parámetros de injertos ya editados", () => {
    const real: Stroke = { type: "scale", color: "#fff", width: 0.003, points: [[0, 0], [0.5, 0]], text: "100" };
    const graft: Stroke = { type: "graft", color: "#fff", width: 0.003, points: [[0.4, 0.9]], text: graftText({ ...GRAFT_DEFAULTS, id: 55, da: 70 }) };
    const next = proposeDesign([real, graft], FACE, size, options)!;
    expect(next.filter((s) => s.type === "scale")).toEqual([real]);
    expect(hasEstimatedScale(next)).toBe(false);
    const params = parseGraft(next.find((s) => s.type === "graft")!.text);
    expect(params).toMatchObject({ id: 55, da: 70 });
    expect(next.find((s) => s.type === "graft")!.points).toEqual([[0.4, 0.9]]);
  });

  it("no hace nada con puntos que no son una cara, y sin escala no crea injertos", () => {
    expect(proposeDesign([], FACE.slice(0, 3), size, options)).toBeNull();
  });

  it("al corregir la zona receptora, la superficie de los injertos la sigue", () => {
    const next = proposeDesign([], FACE, size, options)!;
    const before = parseGraft(next.find((s) => s.type === "graft")!.text).ra;
    const smaller = next.map((s) => (s.type === "area" ? { ...s, points: s.points.map((p): Pt => [0.5 + (p[0] - 0.5) / 2, p[1]]) } : s));
    const synced = syncRecipientArea(smaller, size, options.recipientNames);
    expect(parseGraft(synced.find((s) => s.type === "graft")!.text).ra).toBeLessThan(before);
    expect(syncRecipientArea([], size, options.recipientNames)).toEqual([]);
  });
});

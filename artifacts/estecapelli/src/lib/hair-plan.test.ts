import { describe, it, expect } from "vitest";
import { HAIR_PLAN_TEXT } from "./hair-plan-i18n";
import { drawStrokes, hitsStroke, simplify, strokeToJson, type Pt, type Stroke } from "./annotation";
import { faceGuideFromLandmarks } from "./face-turn";
import {
  faceGeometry, fitHairline, graftEstimate, graftText, hairlineHeightPx, isGraftText, mirrorPoint, parseGraft, planSummary, smoothLine, GRAFT_DEFAULTS,
} from "./hair-plan";

const size = { width: 1000, height: 1000 };
// Cara de frente: eje vertical en x = 0,5; entrecejo y = 0,4; base de la nariz y = 0,55; mentón y = 0,7.
const FACE: Pt[] = [[0.4, 0.38], [0.6, 0.38], [0.5, 0.4], [0.5, 0.55], [0.5, 0.7]];
const face: Stroke = { type: "face", color: "#fff", width: 0.003, points: FACE };

describe("geometría de la cara", () => {
  it("saca el eje, los tercios y la altura sugerida (tercio superior = tercio medio)", () => {
    const g = faceGeometry(FACE, size)!;
    expect(g.middlePx).toBeCloseTo(150);
    expect(g.lowerPx).toBeCloseTo(150);
    expect(g.suggested[1]).toBeCloseTo(250);
    expect(g.up[1]).toBeCloseTo(-1);
  });

  it("rechaza puntos que no forman una cara", () => {
    expect(faceGeometry(FACE.slice(0, 4), size)).toBeNull();
    expect(faceGeometry([FACE[0], FACE[1], [0.5, 0.4], [0.5, 0.85], [0.5, 0.7]], size)).toBeNull();
  });

  it("mide la altura de la línea frontal donde cruza el eje y refleja respecto a él", () => {
    const g = faceGeometry(FACE, size)!;
    expect(hairlineHeightPx([[0.3, 0.3], [0.5, 0.25], [0.7, 0.3]], g, size)).toBeCloseTo(150);
    // Sin cruzar el eje, usa su punto más cercano.
    expect(hairlineHeightPx([[0.3, 0.3], [0.4, 0.2]], g, size)).toBeCloseTo(200);
    expect(hairlineHeightPx([[0.3, 0.3]], g, size)).toBeNull();
    const mirrored = mirrorPoint([0.3, 0.3], g, size);
    expect(mirrored[0]).toBeCloseTo(0.7);
    expect(mirrored[1]).toBeCloseTo(0.3);
  });

  it("la altura se mide sobre el eje aunque la cabeza esté inclinada", () => {
    const tilted: Pt[] = [[0.4, 0.4], [0.6, 0.4], [0.55, 0.4], [0.5, 0.55], [0.45, 0.7]];
    const g = faceGeometry(tilted, size)!;
    expect(g.middlePx).toBeGreaterThan(0);
    expect(g.up[0]).toBeGreaterThan(0);
  });

  it("suaviza la línea y la deja en 40 puntos o menos", () => {
    expect(smoothLine([[0, 0], [1, 1]])).toHaveLength(2);
    expect(smoothLine([[0, 0], [0.5, 1], [1, 0]]).length).toBeGreaterThan(3);
    const wavy: Pt[] = Array.from({ length: 400 }, (_, i) => [i / 400, 0.5 + 0.1 * Math.sin(i / 3)]);
    expect(fitHairline(wavy, simplify).length).toBeLessThanOrEqual(40);
  });
});

describe("estimación de injertos", () => {
  it("calcula necesarias, disponibles y cobertura redondeando a decenas", () => {
    const e = graftEstimate({ ra: 40, id: 40, da: 60, dd: 180, hpf: 2.2, sf: 25 });
    expect(e.needed).toBe(1600);
    expect(e.available).toBe(1230); // 60 × 81,8 × 0,25
    expect(e.coveragePct).toBe(77);
    expect(graftEstimate({ ...GRAFT_DEFAULTS, ra: 0 }).coveragePct).toBeNull();
  });

  it("lee y escribe el texto, ignora lo inválido y valida con los mismos rangos que el servidor", () => {
    const text = graftText({ ra: 41.2, id: 40, da: 55, dd: 180, hpf: 2.2, sf: 25 });
    expect(text).toBe("ra=41.2;id=40;da=55;dd=180;hpf=2.2;sf=25");
    expect(parseGraft(text).da).toBe(55);
    expect(parseGraft("ra=abc;id=9999").id).toBe(GRAFT_DEFAULTS.id);
    expect(isGraftText(text)).toBe(true);
    for (const bad of ["", "ra=2000", "xx=1", "ra=1;ra=2", "sf=0", "ra="]) expect(isGraftText(bad)).toBe(false);
  });

  it("resume la planificación con la escala", () => {
    const line: Stroke = { type: "hairline", color: "#fff", width: 0.003, points: [[0.3, 0.3], [0.5, 0.25], [0.7, 0.3]] };
    const graft: Stroke = { type: "graft", color: "#fff", width: 0.003, points: [[0.5, 0.9]], text: graftText({ ...GRAFT_DEFAULTS, ra: 40, da: 60 }) };
    const plan = planSummary([face, line, graft], size, 0.2);
    expect(plan.face?.middleMm).toBeCloseTo(30);
    expect(plan.hairline).toEqual({ heightMm: expect.closeTo(30), ratio: 1 });
    expect(plan.graft?.needed).toBe(1600);
    expect(planSummary([line], size, null).hairline).toBeNull();
  });
});

describe("guías faciales desde la malla", () => {
  const mesh = (noseX = 0.5) => {
    const points = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    const set = (i: number, x: number, y: number) => { points[i] = { x, y, z: 0 }; };
    set(33, 0.38, 0.4); set(133, 0.46, 0.4); set(362, 0.54, 0.4); set(263, 0.62, 0.4);
    set(9, 0.5, 0.42); set(2, 0.5, 0.55); set(152, 0.5, 0.75); set(1, noseX, 0.52); set(234, 0.3, 0.5); set(454, 0.7, 0.5);
    return points;
  };
  it("devuelve los cinco puntos si la cara está de frente", () => {
    const guide = faceGuideFromLandmarks(mesh());
    expect(guide.ok && guide.points).toHaveLength(5);
    expect(guide.ok && guide.points[0][0]).toBeCloseTo(0.42);
    expect(guide.ok && guide.points[2]).toEqual([0.5, 0.42]);
  });
  it("rechaza la cara de lado y la falta de cara", () => {
    expect(faceGuideFromLandmarks(mesh(0.6))).toEqual({ ok: false, reason: "turned" });
    expect(faceGuideFromLandmarks(null)).toEqual({ ok: false, reason: "none" });
    expect(faceGuideFromLandmarks(mesh().slice(0, 100))).toEqual({ ok: false, reason: "none" });
  });
});

describe("dibujo y exportación de la planificación", () => {
  it("dibuja tercios, línea frontal con su reflejo y la estimación; guarda el texto del graft", () => {
    const labels: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (target, key: string) => (key === "fillText" ? (text: string) => labels.push(text) : target[key] ?? (() => undefined)),
      set: (target, key: string, value) => { target[key] = value; return true; },
    });
    const line: Stroke = { type: "hairline", color: "#ef4444", width: 0.003, points: [[0.3, 0.3], [0.5, 0.25], [0.7, 0.3]] };
    const graft: Stroke = { type: "graft", color: "#ef4444", width: 0.003, points: [[0.5, 0.94]], text: graftText({ ...GRAFT_DEFAULTS, ra: 40, da: 60 }) };
    drawStrokes(ctx as never, [{ type: "scale", color: "#fff", width: 0.003, points: [[0, 0], [0.2, 0]], text: "26" }, face, line, graft], 1000, 1000);
    expect(labels).toEqual(expect.arrayContaining(["≈ 1600 FU · 77%"]));
    expect(labels.filter((text) => /^[123] · /.test(text))).toHaveLength(3);
    expect(strokeToJson([graft])[0]).toMatchObject({ type: "graft", text: graft.text });
    expect(strokeToJson([face])[0]).not.toHaveProperty("text");
  });

  it("el borrador alcanza la línea frontal pero no las guías ni la estimación", () => {
    const line: Stroke = { type: "hairline", color: "#fff", width: 0.003, points: [[0.3, 0.3], [0.7, 0.3]] };
    expect(hitsStroke(line, [0.5, 0.302], 1)).toBe(true);
    expect(hitsStroke(face, [0.5, 0.5], 1)).toBe(false);
  });
});

describe("textos de la planificación", () => {
  it("los nueve idiomas tienen las mismas claves y la razón conserva su {x}", () => {
    const keys = Object.keys(HAIR_PLAN_TEXT.es);
    for (const [lang, text] of Object.entries(HAIR_PLAN_TEXT)) {
      expect(Object.keys(text), lang).toEqual(keys);
      expect(text.ratio, lang).toContain("{x}");
    }
  });
});

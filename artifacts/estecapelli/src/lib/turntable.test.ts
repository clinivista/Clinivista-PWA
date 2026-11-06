import { describe, expect, it } from "vitest";
import { stepsForDrag, turntableViews, wrapIndex } from "./turntable";

const photo = (id: string, key: string, mimeType = "image/jpeg") => ({ id, key, label: key, mimeType });

describe("visor giratorio", () => {
  it("ordena el anillo izquierda → frente → derecha → nuca y deja la vista superior aparte", () => {
    const { ring, top } = turntableViews([photo("1", "donor"), photo("2", "frontal"), photo("3", "vertex"), photo("4", "temporalRight"), photo("5", "temporalLeft")]);
    expect(ring.map((item) => item.key)).toEqual(["temporalLeft", "frontal", "temporalRight", "donor"]);
    expect(top?.id).toBe("3");
  });

  it("usa la foto más reciente de cada vista, ignora videos y las vistas que faltan", () => {
    const { ring } = turntableViews([photo("a", "frontal"), photo("b", "frontal"), photo("c", "temporalLeft", "video/mp4"), photo("d", "otra")]);
    expect(ring.map((item) => item.id)).toEqual(["b"]);
  });

  it("gira por pasos al arrastrar y da la vuelta completa", () => {
    expect(stepsForDrag(-200)).toBe(2); // arrastrar a la izquierda avanza
    expect(stepsForDrag(100)).toBe(-1);
    expect(stepsForDrag(30)).toBe(0);
    expect(wrapIndex(3, 1, 4)).toBe(0);
    expect(wrapIndex(0, -1, 4)).toBe(3);
  });
});

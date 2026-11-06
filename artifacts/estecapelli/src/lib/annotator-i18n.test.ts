import { describe, it, expect } from "vitest";
import { LANGS } from "./language";
import { ANNOTATOR_TEXT } from "./annotator-i18n";
import { WIDTHS } from "./annotation";

describe("herramienta de dibujo en los nueve idiomas", () => {
  it("no deja textos vacíos y los grosores coinciden con los de la herramienta", () => {
    expect(WIDTHS).toHaveLength(3);
    for (const { code } of LANGS) {
      for (const [key, value] of Object.entries(ANNOTATOR_TEXT[code])) {
        const shown = typeof value === "function" ? value("x") : value;
        expect(shown.trim().length, `${code}.${key}`).toBeGreaterThan(0);
      }
    }
    expect(ANNOTATOR_TEXT.en.arrow).toBe("Arrow");
    expect(ANNOTATOR_TEXT.fr.title("Vue de face")).toBe("Annoter : Vue de face");
  });
});

import { MEASURE_TOOLS_TEXT } from "./measure-tools-i18n";
describe("textos de las herramientas de medición en 9 idiomas", () => {
  it("todos los idiomas tienen cada texto, y la escala lleva su marcador {mm}", () => {
    expect(Object.keys(MEASURE_TOOLS_TEXT)).toHaveLength(9);
    for (const [lang, text] of Object.entries(MEASURE_TOOLS_TEXT)) {
      for (const [key, value] of Object.entries(text)) expect(value, `${lang}.${key}`).toBeTruthy();
      expect(text.legendScale, lang).toContain("{mm}");
    }
  });
});

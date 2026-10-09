import { describe, it, expect } from "vitest";
import { LANGS } from "./language";
import { EVOLUTION_UI } from "./evolution-i18n";

describe("Evolución en los nueve idiomas", () => {
  it("no deja textos vacíos y todos los idiomas tienen las mismas claves", () => {
    const keys = Object.keys(EVOLUTION_UI.es);
    for (const { code } of LANGS) {
      expect(Object.keys(EVOLUTION_UI[code]), code).toEqual(keys);
      for (const [key, value] of Object.entries(EVOLUTION_UI[code])) expect(value.trim().length, `${code}.${key}`).toBeGreaterThan(0);
    }
    expect(EVOLUTION_UI.en.title).toBe("Progress");
  });
});

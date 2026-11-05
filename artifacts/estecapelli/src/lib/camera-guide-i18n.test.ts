import { describe, expect, it } from "vitest";
import { LANGS } from "./language";
import { CAMERA_GUIDE_TEXT, guideTextFor, type GuideKind } from "./camera-guide-i18n";

describe("camera guide texts", () => {
  it("exist in every language", () => {
    for (const { code } of LANGS) for (const [key, value] of Object.entries(CAMERA_GUIDE_TEXT[code])) expect(value, `${code}.${key}`).toBeTruthy();
  });

  it("builds the texts of every view in every language, with an extra intro step for all but the frontal one", () => {
    const kinds: GuideKind[] = ["front", "top", "right", "left", "back"];
    for (const { code } of LANGS) for (const kind of kinds) {
      const { text, introStep } = guideTextFor(code, kind);
      for (const [key, value] of Object.entries(text)) expect(value, `${code}.${kind}.${key}`).toBeTruthy();
      if (kind === "front") expect(introStep).toBeNull(); else expect(introStep, `${code}.${kind}`).toBeTruthy();
    }
  });

  it("asks the patient to turn the head toward the opposite side of the one being photographed", () => {
    expect(guideTextFor("es", "right").introStep).toMatch(/hacia tu izquierda para mostrar tu lado derecho/);
    expect(guideTextFor("es", "left").introStep).toMatch(/hacia tu derecha para mostrar tu lado izquierdo/);
    expect(guideTextFor("es", "back").text.closer).toMatch(/celular/); // en la zona donante se mueve el celular
    expect(guideTextFor("es", "back").text.getReady).toMatch(/hacia atrás/);
  });
});

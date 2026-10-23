import { describe, it, expect } from "vitest";
import { LANGS, type AppTranslations } from "./language";
import { DERM_CHANGES_KEYS, DERM_DURATION_KEYS, DERM_REASON_KEYS, DERM_SKIN_KEYS, DERM_SUN_KEYS, DERM_TEXT, DERM_VIEW_KEYS, dermSummaryRows } from "./derm-i18n";
import { getConfiguredPhotoProtocol } from "./photo-protocol";
import { viewLabel } from "./phases-i18n";
import { STATUS_TREATED } from "./staff-flow-i18n";

const t = new Proxy({}, { get: (_, key) => String(key) }) as AppTranslations;

describe("dermatología en los nueve idiomas", () => {
  it("cada idioma tiene todas las preguntas, opciones y guías de fotos", () => {
    for (const { code } of LANGS) {
      const text = DERM_TEXT[code];
      expect(text, code).toBeDefined();
      expect(text.reason[1], code).toHaveLength(DERM_REASON_KEYS.length);
      expect(text.duration[1], code).toHaveLength(DERM_DURATION_KEYS.length);
      expect(text.changes[1], code).toHaveLength(DERM_CHANGES_KEYS.length);
      expect(text.sun[1], code).toHaveLength(DERM_SUN_KEYS.length);
      expect(text.skinType[1], code).toHaveLength(DERM_SKIN_KEYS.length);
      expect(text.photos, code).toHaveLength(DERM_VIEW_KEYS.length);
      for (const value of [text.section, text.stepDetail, text.introDesc, text.consent, text.area[0], text.area[1], text.history[0], text.treatments[0], ...text.reason[1], ...text.photos.flat()]) {
        expect(value.trim().length, code).toBeGreaterThan(0);
      }
      expect(STATUS_TREATED[code].trim().length, code).toBeGreaterThan(0);
    }
  });

  it("la guía de fotos sigue el idioma del paciente, salvo que la clínica renombre la vista", () => {
    const views = DERM_VIEW_KEYS.map((key, i) => ({ key, label: DERM_TEXT.es.photos[i][0], required: i < 2 }));
    const fr = getConfiguredPhotoProtocol(t, views, "fr");
    expect(fr.map((v) => v.title)).toEqual(DERM_TEXT.fr.photos.map((p) => p[0]));
    expect(fr.map((v) => v.required)).toEqual([true, true, false]);
    const renamed = getConfiguredPhotoProtocol(t, [{ ...views[0], label: "Mi nombre" }], "fr");
    expect(renamed[0].title).toBe("Mi nombre");
    expect(renamed[0].description).toBe(DERM_TEXT.fr.photos[0][1]);
  });

  it("el panel nombra las fotos en el idioma del personal y muestra las respuestas en español", () => {
    expect(viewLabel({ key: "dermClose", label: "Primer plano con referencia" }, undefined, "en", t)).toBe("Close-up with reference");
    expect(viewLabel({ key: "tratamiento-dermClose", label: "Primer plano con referencia" }, "tratamiento", "de", t)).toBe("Nahaufnahme mit Referenz");
    const rows = dermSummaryRows({ reason: "acne", changes: "symptoms", skinType: "dark", area: "Mejilla" });
    expect(rows.find((r) => r.label === "¿Qué te preocupa?")?.value).toBe("Acné o rosácea");
    expect(rows.find((r) => r.label === "¿Ha cambiado recientemente?")?.value).toBe("Pica, duele o sangra");
    expect(rows.find((r) => r.label === "Tipo de piel")?.value).toBe("Oscura: rara vez se quema");
    expect(rows.find((r) => r.label === "¿En qué zona del cuerpo está?")?.value).toBe("Mejilla");
    expect(dermSummaryRows(undefined).every((r) => r.value === "")).toBe(true);
  });
});

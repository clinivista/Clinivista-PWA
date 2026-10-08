import { describe, it, expect } from "vitest";
import { LANGS, type AppTranslations } from "./language";
import { PLASTIC_PROCEDURE_KEYS, PLASTIC_SMOKING_KEYS, PLASTIC_TEXT, PLASTIC_TIMEFRAME_KEYS, PLASTIC_VIEW_KEYS, plasticSummaryRows } from "./specialty-i18n";
import { getConfiguredPhotoProtocol } from "./photo-protocol";

const t = new Proxy({}, { get: (_, key) => String(key) }) as AppTranslations;

describe("cirugía plástica en los nueve idiomas", () => {
  it("every language has every question, option and photo guide", () => {
    for (const { code } of LANGS) {
      const text = PLASTIC_TEXT[code];
      expect(text, code).toBeDefined();
      expect(text.procedure[1], code).toHaveLength(PLASTIC_PROCEDURE_KEYS.length);
      expect(text.timeframe[1], code).toHaveLength(PLASTIC_TIMEFRAME_KEYS.length);
      expect(text.smoking[1], code).toHaveLength(PLASTIC_SMOKING_KEYS.length);
      expect(text.photos, code).toHaveLength(PLASTIC_VIEW_KEYS.length);
      for (const value of [text.section, text.stepDetail, text.introDesc, text.consent, ...text.procedure[1], ...text.photos.flat()]) expect(value.trim().length, code).toBeGreaterThan(0);
    }
  });

  it("the photo guidance follows the patient's language, unless the clinic renamed the view", () => {
    const views = PLASTIC_VIEW_KEYS.map((key, i) => ({ key, label: PLASTIC_TEXT.es.photos[i][0], required: true }));
    const fr = getConfiguredPhotoProtocol(t, views, "fr");
    expect(fr.map((v) => v.title)).toEqual(PLASTIC_TEXT.fr.photos.map((p) => p[0]));
    const renamed = getConfiguredPhotoProtocol(t, [{ ...views[0], label: "Mi nombre" }], "fr");
    expect(renamed[0].title).toBe("Mi nombre");
    expect(renamed[0].description).toBe(PLASTIC_TEXT.fr.photos[0][1]);
  });

  it("the staff panel shows the answers in Spanish", () => {
    const rows = plasticSummaryRows({ procedure: "breastLift", timeframe: "m3to6", smoking: "former", conditions: "Diabetes" });
    expect(rows.find((r) => r.label === "¿Qué procedimiento te interesa?")?.value).toBe("Mastopexia (elevación mamaria)");
    expect(rows.find((r) => r.label === "¿Cuándo te gustaría operarte?")?.value).toBe("Entre 3 y 6 meses");
    expect(rows.find((r) => r.label === "¿Fumas?")?.value).toBe("Soy exfumador/a");
    expect(rows.find((r) => r.label === "Enfermedades o condiciones médicas")?.value).toBe("Diabetes");
    expect(plasticSummaryRows(undefined).every((r) => r.value === "")).toBe(true);
  });
});

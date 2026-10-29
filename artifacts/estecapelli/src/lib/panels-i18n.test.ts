import { describe, expect, it } from "vitest";
import { USERS_TEXT } from "./users-i18n";
import { REPORT_PANEL_TEXT } from "./report-panel-i18n";
import { PHASES_PANEL_TEXT, fillText } from "./phases-panel-i18n";
import { CAMERA_TEXT, CONSULT_TYPES_TEXT, PATIENT_EXTRA_TEXT, PHOTO_EDITOR_TEXT, fillTools } from "./tools-i18n";

const LANGS = ["es", "en", "pt", "fr", "de", "it", "tr", "ar", "zh"] as const;
const tables = { USERS_TEXT, REPORT_PANEL_TEXT, PHASES_PANEL_TEXT, PHOTO_EDITOR_TEXT, CAMERA_TEXT, PATIENT_EXTRA_TEXT, CONSULT_TYPES_TEXT } as Record<string, Record<string, Record<string, unknown>>>;

describe("textos de los paneles Usuarios, Informe y Fases", () => {
  for (const [name, table] of Object.entries(tables)) {
    it(`${name} tiene los nueve idiomas con las mismas claves y sin textos vacíos`, () => {
      const keys = Object.keys(table.es).sort();
      for (const lang of LANGS) {
        expect(Object.keys(table[lang]).sort()).toEqual(keys);
        for (const key of keys) {
          const value = table[lang][key];
          if (typeof value === "string") expect(value.trim(), `${lang}.${key}`).not.toBe("");
        }
      }
    });
  }

  it("los marcadores se conservan en todos los idiomas", () => {
    for (const lang of LANGS) {
      expect(PHASES_PANEL_TEXT[lang].phaseAria).toContain("{n}");
      expect(PHASES_PANEL_TEXT[lang].deletePhase).toContain("{name}");
      expect(PHASES_PANEL_TEXT[lang].photoAria).toContain("{i}");
      expect(PHASES_PANEL_TEXT[lang].docAria).toContain("{label}");
      expect(REPORT_PANEL_TEXT[lang].sentMany).toContain("{n}");
    }
    expect(fillText("Fase {n}", { n: 2 })).toBe("Fase 2");
    for (const lang of LANGS) {
      expect(CAMERA_TEXT[lang].denied).toContain("{upload}");
      expect(CAMERA_TEXT[lang].useUpload).toContain("{photo}");
      expect(CONSULT_TYPES_TEXT[lang].confirmDelete).toContain("{name}");
      expect(CONSULT_TYPES_TEXT[lang].cantDeleteMany).toContain("{n}");
    }
    expect(fillTools("«{upload}»", { upload: "X" })).toBe("«X»");
  });
});

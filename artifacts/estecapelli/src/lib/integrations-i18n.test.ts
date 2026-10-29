import { describe, it, expect } from "vitest";
import { INTEGRATIONS_TEXT, INTEGRATION_CATEGORIES, INTEGRATION_NAMES } from "./integrations-i18n";

describe("textos de integraciones en 9 idiomas", () => {
  it("todos los idiomas tienen cada texto y cada categoría", () => {
    expect(Object.keys(INTEGRATIONS_TEXT)).toHaveLength(9);
    for (const [lang, t] of Object.entries(INTEGRATIONS_TEXT)) {
      for (const key of ["nav", "title", "intro", "loading", "loadError", "comingSoon", "request", "requested", "cancelRequest", "requestedNote", "cantSave", "tryAgain"] as const) {
        expect(t[key], `${lang}.${key}`).toBeTruthy();
      }
      for (const category of INTEGRATION_CATEGORIES) {
        expect(t.categories[category], `${lang}.categories.${category}`).toBeTruthy();
        expect(t.categoryHints[category], `${lang}.categoryHints.${category}`).toBeTruthy();
      }
      expect(t.toastRequested("Medilink")).toContain("Medilink");
      expect(t.toastCancelled("Medilink")).toContain("Medilink");
    }
  });

  it("nombra todas las integraciones del catálogo del servidor", () => {
    for (const id of ["facebook", "instagram", "linkedin", "tiktok", "youtube", "medilink", "agendapro", "reservo", "google_calendar", "whatsapp"]) {
      expect(INTEGRATION_NAMES[id]).toBeTruthy();
    }
  });
});

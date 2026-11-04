import { describe, it, expect } from "vitest";
import { LANGS } from "./language";
import { CONSENT_FIRST_TEXT } from "./patient-consent-first-i18n";

describe("Pantalla «Autorización» del paciente", () => {
  it("tiene todos los textos en los nueve idiomas", () => {
    for (const { code } of LANGS) {
      const x = CONSENT_FIRST_TEXT[code];
      for (const key of ["stepLabel", "title", "lead", "optional", "needCheck", "accept", "noDataYet", "doneChip", "review"] as const) {
        expect(x[key], `${code}.${key}`).toBeTruthy();
      }
    }
  });
});

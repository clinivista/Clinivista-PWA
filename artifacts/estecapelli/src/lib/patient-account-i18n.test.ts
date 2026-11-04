import { describe, expect, it } from "vitest";
import { LANGS } from "./language";
import { PATIENT_ACCOUNT_TEXT } from "./patient-account-i18n";

describe("patient account texts", () => {
  it("exist in every language, and the body keeps the {email} placeholder", () => {
    for (const { code } of LANGS) {
      const text = PATIENT_ACCOUNT_TEXT[code];
      for (const [key, value] of Object.entries(text)) expect(value, `${code}.${key}`).toBeTruthy();
      expect(text.successBody, code).toContain("{email}");
    }
  });
});

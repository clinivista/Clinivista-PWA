import { describe, expect, it } from "vitest";
import { LANGS } from "./language";
import { PATIENT_CHANNEL_TEXT } from "./patient-channels-i18n";

describe("patient channel texts", () => {
  it("exist in every language", () => {
    for (const { code } of LANGS) for (const [key, value] of Object.entries(PATIENT_CHANNEL_TEXT[code])) expect(value, `${code}.${key}`).toBeTruthy();
  });
});

import { describe, expect, it } from "vitest";
import { LANGS } from "./language";
import { CAMERA_GUIDE_TEXT } from "./camera-guide-i18n";

describe("camera guide texts", () => {
  it("exist in every language", () => {
    for (const { code } of LANGS) for (const [key, value] of Object.entries(CAMERA_GUIDE_TEXT[code])) expect(value, `${code}.${key}`).toBeTruthy();
  });
});

import { describe, it, expect } from "vitest";
import { getConfiguredPhotoProtocol } from "./photo-protocol";
import type { AppTranslations } from "./language";

// Every key answers with its own name, so titles are easy to assert.
const t = new Proxy({}, { get: (_, key) => String(key) }) as AppTranslations;

describe("getConfiguredPhotoProtocol", () => {
  it("falls back to the five starting views while the clinic's list is unknown", () => {
    expect(getConfiguredPhotoProtocol(t, undefined).map((v) => v.key)).toEqual(["frontal", "vertex", "temporalRight", "temporalLeft", "donor"]);
  });

  it("follows the clinic's list: fewer, more, renamed and optional photos", () => {
    const list = getConfiguredPhotoProtocol(t, [
      { key: "frontal", label: "Vista frontal", required: true },
      { key: "donor", label: "Nuca", required: false },
      { key: "vista-ab12", label: "Coronilla", required: true },
    ]);
    expect(list.map((v) => v.key)).toEqual(["frontal", "donor", "vista-ab12"]);
    expect(list[0].title).toBe("photoFrontalTitle");
    expect(list[1].title).toBe("Nuca");
    expect(list[1].required).toBe(false);
    expect(list[2].title).toBe("Coronilla");
    expect(list[2].description.length).toBeGreaterThan(10);
  });
});

import { describe, it, expect } from "vitest";
import { LANGS, T } from "./language";
import { STAFF_FLOW_TEXT } from "./staff-flow-i18n";

describe("agregar paciente, omitir etapa y alta médica en los nueve idiomas", () => {
  it("no deja ningún texto vacío y tiene las mismas claves en todos los idiomas", () => {
    const keys = Object.keys(STAFF_FLOW_TEXT.es);
    for (const { code } of LANGS) {
      expect(Object.keys(STAFF_FLOW_TEXT[code]), code).toEqual(keys);
      for (const key of keys) expect(String((STAFF_FLOW_TEXT[code] as Record<string, string>)[key]).trim().length, `${code}.${key}`).toBeGreaterThan(0);
      expect(T[code].statusAlta.trim().length, `${code}.statusAlta`).toBeGreaterThan(0);
    }
  });
});

import { describe, it, expect } from "vitest";
import { LANGS, T } from "./language";
import { PHASES_TEXT, phaseName, viewLabel } from "./phases-i18n";

describe("fases y diagnóstico en el idioma del panel", () => {
  it("traduce los nombres iniciales de las fases en los nueve idiomas, y respeta los que la clínica renombró", () => {
    const post = { key: "postoperatorio", name: "Post-operatorio" };
    expect(phaseName(post, "es")).toBe("Post-operatorio");
    expect(phaseName(post, "en")).toBe("Post-operative");
    expect(phaseName(post, "zh")).toBe("术后");
    expect(phaseName({ key: "control-1", name: "Control médico 1" }, "fr")).toBe("Contrôle médical 1");
    expect(phaseName({ key: "preoperatorio", name: "Antes de la cirugía" }, "en")).toBe("Antes de la cirugía");
    expect(phaseName({ key: "fase-nueva", name: "Seguimiento" }, "de")).toBe("Seguimiento");
  });

  it("traduce las fotos de las fases siguientes (clave «fase-vista») y las de cirugía plástica", () => {
    const t = T.en;
    expect(viewLabel({ key: "preoperatorio-frontal", label: "Vista frontal" }, "preoperatorio", "en", t)).toBe(t.photoFrontalTitle);
    expect(viewLabel({ key: "control-1-donor", label: "Zona donante" }, "control-1", "en", t)).toBe(t.photoDonorTitle);
    expect(viewLabel({ key: "plasticFront", label: "Vista frontal" }, undefined, "pt", T.pt)).not.toBe("");
    expect(viewLabel({ key: "preoperatorio-frontal", label: "Frente con luz" }, "preoperatorio", "en", t)).toBe("Frente con luz");
    expect(viewLabel({ key: "cicatriz", label: "Cicatriz" }, "preoperatorio", "en", t)).toBe("Cicatriz");
  });

  it("no deja ningún texto vacío en ningún idioma", () => {
    for (const { code } of LANGS) {
      const text = PHASES_TEXT[code];
      for (const [key, value] of Object.entries(text)) {
        const shown = typeof value === "function" ? (value as (...a: never[]) => string)(...(["x", "y"] as never[])) : value;
        expect(String(shown).trim().length, `${code}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("los estados nuevos tienen etiqueta en los nueve idiomas", () => {
    for (const { code } of LANGS) {
      const t = T[code];
      for (const key of ["statusContactar", "statusContactado", "statusOperado", "statusCompletado"] as const) expect(t[key].trim().length, `${code}.${key}`).toBeGreaterThan(0);
    }
  });
});

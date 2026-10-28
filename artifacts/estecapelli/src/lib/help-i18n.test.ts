import { describe, it, expect } from "vitest";
import { loadManual, loadRawManual, manualFor, MANUAL_SPECIALTIES, type HelpManual, type HelpSection } from "@/lib/help-i18n";
import type { LangCode } from "@/lib/language";

const LANGS: LangCode[] = ["es", "en", "pt", "fr", "de", "it", "tr", "ar", "zh"];
const keys = (sections: HelpSection[]) => sections.map((s) => `${s.key}:${JSON.stringify(s.only ?? null)}`);
const shape = (sections: HelpSection[]) => sections.map((s) => [s.key, (s.blocks).map((b) => `${b.t}:${(b.only ?? []).join("+")}:${b.t === "table" ? b.rows.length : b.t === "ul" || b.t === "legend" ? b.items.length : 0}`)]);
const allText = (m: HelpManual) => JSON.stringify(m);

describe("manuales por especialidad", () => {
  it("los nueve idiomas tienen exactamente la misma estructura", async () => {
    const es = await loadRawManual("es");
    for (const code of LANGS.slice(1)) {
      const m = await loadRawManual(code);
      expect(keys(m.patient), code).toEqual(keys(es.patient));
      expect(keys(m.staff), code).toEqual(keys(es.staff));
      expect(shape(m.patient), code).toEqual(shape(es.patient));
      expect(shape(m.staff), code).toEqual(shape(es.staff));
    }
  });

  it("cada especialidad, en cada idioma, queda sin marcas sin resolver y con ids consecutivos", async () => {
    for (const code of LANGS) for (const sp of MANUAL_SPECIALTIES) {
      const m = await loadManual(code, sp);
      const text = allText(m);
      expect(text, `${code}/${sp}`).not.toMatch(/\{§|\{n\}|@\w+@/);
      m.staff.forEach((s, i) => expect(s.id).toBe(`2.${i + 1}`));
      m.patient.forEach((s, i) => expect(s.id).toBe(`1.${i + 1}`));
      expect(JSON.stringify(m), `${code}/${sp}`).not.toContain('"only"');
    }
  });

  it("todas las especialidades incluyen las mejoras comunes", async () => {
    for (const code of LANGS) for (const sp of MANUAL_SPECIALTIES) {
      const m = await loadManual(code, sp);
      const keysNow = (await loadRawManual(code)).staff.filter((s) => !s.only || s.only.includes(sp)).map((s) => s.key);
      for (const k of ["clinics", "addpatient", "skipdischarge", "support", "users"]) expect(keysNow, `${code}/${sp}/${k}`).toContain(k);
      expect(m.staff.length, `${code}/${sp}`).toBe(keysNow.length);
    }
  });

  it("todos los manuales explican la fecha y el ID de la atención", async () => {
    for (const code of LANGS) for (const sp of MANUAL_SPECIALTIES) {
      const phases = (await loadManual(code, sp)).staff.find((s) => s.key === "phases")!;
      expect(phases.blocks.some((b) => b.t === "h3"), `${code}/${sp}`).toBe(true);
      const tips = (await loadManual(code, sp)).staff.find((s) => s.key === "tips")!;
      const table = tips.blocks[0];
      expect(table.t === "table" && table.rows.length, `${code}/${sp}`).toBeGreaterThanOrEqual(9);
    }
    const es = JSON.stringify((await loadManual("es", "capilar")).staff.find((s) => s.key === "phases"));
    expect(es).toContain("Fecha e ID de la atención");
    expect(es).toContain("ID de la atención");
  });

  it("el manual del paciente explica la medición con moneda en los nueve idiomas, traducida", async () => {
    const es = (await loadRawManual("es")).patient.find((s) => s.key === "measure")!;
    expect(es.blocks.map((b) => b.t)).toEqual(["p", "ul", "note"]);
    for (const code of LANGS.slice(1)) for (const sp of MANUAL_SPECIALTIES) {
      const raw = (await loadRawManual(code)).patient.find((s) => s.key === "measure")!;
      expect(raw, code).toBeDefined();
      expect(JSON.stringify(raw), code).not.toBe(JSON.stringify(es));
      expect(raw.title, code).not.toBe(es.title);
      const section = (await loadManual(code, sp)).patient.find((x) => x.key === "measure")!;
      const list = section.blocks.find((b) => b.t === "ul");
      expect(list && list.t === "ul" && list.items.length, `${code}/${sp}`).toBe(5);
    }
  });

  it("solo dermatología trae los tipos de consulta y solo capilar el Norwood", async () => {
    for (const code of LANGS) {
      const raw = await loadRawManual(code);
      expect(raw.staff.find((s) => s.key === "consults")?.only).toEqual(["dermatologia"]);
      const cap = allText(await loadManual(code, "capilar"));
      const pla = allText(await loadManual(code, "plastica"));
      const der = allText(await loadManual(code, "dermatologia"));
      const word = code === "ar" ? "نوروود" : "Norwood";
      expect(cap).toContain(word);
      expect(pla).not.toContain(word);
      expect(der).not.toContain(word);
      expect((await loadManual(code, "capilar")).staff.some((s) => s.key === "consults")).toBe(false);
      expect((await loadManual(code, "plastica")).staff.some((s) => s.key === "consults")).toBe(false);
      expect((await loadManual(code, "dermatologia")).staff.some((s) => s.key === "consults")).toBe(true);
    }
  });

  it("el número de fotografías coincide con la especialidad (español)", async () => {
    const cap = await loadManual("es", "capilar");
    const der = await loadManual("es", "dermatologia");
    expect(allText(cap)).toContain("5/5");
    expect(allText(cap)).not.toContain("3/3");
    expect(allText(der)).toContain("3/3");
    expect(allText(der)).not.toContain("5/5");
    expect(der.patient.find((s) => s.key === "photos")?.title).toBe("Las tres fotografías guiadas");
    expect(allText(der)).not.toMatch(/Operado|post-operatorio|pre-operatorio/);
  });

  it("las referencias entre secciones apuntan al número vigente en cada especialidad", async () => {
    const der = await loadManual("es", "dermatologia");
    const dx = der.staff.find((s) => s.key === "diagnosis")!;
    const phases = der.staff.find((s) => s.key === "phases")!;
    expect(JSON.stringify(phases.blocks)).toContain(`sección ${dx.id}`);
    const cap = await loadManual("es", "capilar");
    expect(JSON.stringify(cap.staff.find((s) => s.key === "phases")!.blocks)).toContain(`sección ${cap.staff.find((s) => s.key === "diagnosis")!.id}`);
  });

  it("manualFor filtra bloques, filas de tabla y títulos por especialidad", () => {
    const raw: HelpManual = { patient: [], staff: [
      { id: "2.1", key: "a", title: "A {n}", titles: { dermatologia: "A derm" }, blocks: [
        { t: "p", text: "todos {n} {§b}" }, { t: "p", text: "solo capilar", only: ["capilar"] },
        { t: "table", head: ["x"], rows: [["fija"], { only: ["plastica"], cells: ["plástica"] }] },
      ] },
      { id: "2.2", key: "b", title: "B", only: ["dermatologia"], blocks: [] },
    ] };
    const cap = manualFor(raw, "capilar");
    expect(cap.staff.map((s) => s.title)).toEqual(["A 5"]);
    expect(cap.staff[0].blocks).toHaveLength(3);
    expect(cap.staff[0].blocks[0]).toMatchObject({ text: "todos 5 " });
    const pla = manualFor(raw, "plastica");
    expect(pla.staff[0].blocks).toHaveLength(2);
    expect(pla.staff[0].blocks[1]).toMatchObject({ rows: [["fija"], ["plástica"]] });
    const der = manualFor(raw, "dermatologia");
    expect(der.staff.map((s) => [s.id, s.title])).toEqual([["2.1", "A derm"], ["2.2", "B"]]);
    expect(der.staff[0].blocks[0]).toMatchObject({ text: "todos 3 2.2" });
  });
});

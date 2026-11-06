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
      for (const k of ["clinics", "addpatient", "skipdischarge", "support", "users", "plan", "integrations", "privacy", "patientupdates", "photoconsent"]) expect(keysNow, `${code}/${sp}/${k}`).toContain(k);
      expect(m.staff.length, `${code}/${sp}`).toBe(keysNow.length);
    }
  });

  it("todos los manuales explican cómo modificar la evaluación y las novedades del paciente", async () => {
    for (const code of LANGS) {
      const raw = await loadRawManual(code);
      const edit = raw.patient.find((s) => s.key === "edit");
      expect(edit, `${code}/edit`).toBeTruthy();
      expect(edit!.blocks.map((b) => b.t), `${code}/edit`).toEqual(["p", "ul", "note"]);
      const updates = raw.staff.find((s) => s.key === "patientupdates");
      expect(updates, `${code}/patientupdates`).toBeTruthy();
      expect(updates!.blocks.map((b) => b.t), `${code}/patientupdates`).toEqual(["p", "ul", "note"]);
      for (const side of [raw.patient, raw.staff]) {
        const consent = side.find((s) => s.key === "photoconsent");
        expect(consent, `${code}/photoconsent`).toBeTruthy();
        expect(consent!.blocks.map((b) => b.t), `${code}/photoconsent`).toEqual(["p", "ul", "note"]);
      }
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

  it("el manual de la clínica explica plan, contrato e integraciones, con sus nombres reales de pantalla, en los nueve idiomas", async () => {
    for (const code of LANGS) for (const sp of MANUAL_SPECIALTIES) {
      const staff = (await loadManual(code, sp)).staff;
      const plan = staff.find((s) => s.key === "plan")!;
      const integ = staff.find((s) => s.key === "integrations")!;
      expect(plan.blocks.map((b) => b.t), code).toEqual(["p", "ul", "p", "p", "note"]);
      expect(integ.blocks.map((b) => b.t), code).toEqual(["p", "ul", "note", "p", "ul"]);
      const text = JSON.stringify([plan, integ]);
      for (const brand of ["Facebook", "Instagram", "LinkedIn", "TikTok", "YouTube", "Medilink", "AgendaPro", "Reservo", "Google Calendar", "WhatsApp"]) expect(text, `${code}/${brand}`).toContain(brand);
    }
    const es = JSON.stringify((await loadManual("es", "capilar")).staff.find((s) => s.key === "plan"));
    for (const label of ["Mi plan", "Ver plan y contrato", "Mi plan y contrato", "Comparar planes", "Revisar contrato", "Aceptar contrato"]) expect(es).toContain(label);
    const users = JSON.stringify((await loadManual("es", "capilar")).staff.find((s) => s.key === "users"));
    for (const label of ["RUT", "Pasaporte", "Dirección", "especialidad"]) expect(users).toContain(label);
  });

  it("el manual explica la guía por voz con las cinco imágenes (solo capilar), la zona donante con espejo y el link de agendamiento, en los nueve idiomas", async () => {
    for (const code of LANGS) {
      const capilar = (await loadManual(code, "capilar")).patient.find((s) => s.title && s.blocks.some((b) => b.t === "img"))!;
      expect(capilar, code).toBeTruthy();
      const images = capilar.blocks.filter((b) => b.t === "img");
      expect(images, code).toHaveLength(5);
      expect(images.map((b) => b.t === "img" && b.src)).toEqual(["frontal", "superior", "lado-derecho", "lado-izquierdo", "zona-donante"].map((n, i) => `guides/manual/guia-${i + 1}-${n}.webp`));
      for (const sp of ["plastica", "dermatologia"] as const) {
        expect(JSON.stringify((await loadManual(code, sp)).patient), `${code}/${sp}`).not.toContain("guides/manual/");
      }
      const staff = JSON.stringify((await loadManual(code, "capilar")).staff.find((s) => s.key === "integrations"));
      expect(staff, code).toContain("https://");
    }
    const es = JSON.stringify((await loadManual("es", "capilar")).patient);
    expect(es).toContain("espejo");
    expect(es).toContain("Para agendar su hora puede hacerlo a través de:");
  });

  it("los manuales explican la cámara del personal, el editor por pestañas, la comparación y el visor giratorio; lo capilar solo lo ven las clínicas capilares", async () => {
    for (const code of LANGS) {
      const cap = await loadManual(code, "capilar");
      const sec = (m: typeof cap, key: string) => m.staff.find((s) => s.key === key)!;
      const bulletsOf = (section: HelpSection) => section.blocks.filter((b) => b.t === "ul").map((b) => (b.t === "ul" ? b.items.length : 0));
      // Cámara del personal (fases), editor (diagnóstico: medición + capilar), comparación (evolución).
      expect(bulletsOf(sec(cap, "phases")), code).toContain(3);
      expect(bulletsOf(sec(cap, "diagnosis")), code).toContain(4);
      expect(bulletsOf(sec(cap, "evolution")), code).toContain(4);
      const plain = await loadManual(code, "plastica");
      expect(sec(cap, "ficha").blocks.length - sec(plain, "ficha").blocks.length, code).toBe(2); // vista giratoria: solo capilar
      for (const sp of ["plastica", "dermatologia"] as const) {
        const other = await loadManual(code, sp);
        expect(bulletsOf(sec(other, "diagnosis")), `${code}/${sp}`).toContain(4);
        expect(bulletsOf(sec(other, "diagnosis")).length, `${code}/${sp}`).toBeLessThan(bulletsOf(sec(cap, "diagnosis")).length); // sin herramientas capilares
      }
    }
    const es = JSON.stringify((await loadManual("es", "capilar")).staff);
    expect(es).toContain("Densidad (1 cm²)");
    expect(es).toContain("Vista giratoria");
    expect(JSON.stringify((await loadManual("es", "dermatologia")).staff)).not.toContain("Vista giratoria");
  });

  it("el manual explica «Datos de la clínica» del representante legal en los nueve idiomas, para todas las especialidades", async () => {
    for (const code of LANGS) {
      for (const sp of ["capilar", "plastica", "dermatologia"] as const) {
        const section = (await loadManual(code, sp)).staff.find((item) => item.key === "clinicdata");
        expect(section, `${code}/${sp}`).toBeDefined();
        expect(section!.blocks.map((b) => b.t), `${code}/${sp}`).toEqual(["p", "ul", "note"]);
      }
    }
    const es = JSON.stringify((await loadManual("es", "capilar")).staff.find((item) => item.key === "clinicdata"));
    expect(es).toContain("Solo soporte puede cambiarlos");
  });

  it("el manual registra los aspectos técnicos de la planificación capilar (malla en el dispositivo, tercios, fórmula de injertos) en los nueve idiomas", async () => {
    for (const code of LANGS) {
      const diagnosis = (await loadManual(code, "capilar")).staff.find((s) => s.key === "diagnosis")!;
      const text = JSON.stringify(diagnosis);
      expect(text, code).toContain("MediaPipe Face Mesh");
      expect(text, code).toContain("180");
      expect(text, code).toMatch(/63 ?(mm|مم|毫米)/);
      const hairBullets = diagnosis.blocks.filter((b) => b.t === "ul").map((b) => (b.t === "ul" ? b.items.length : 0));
      expect(hairBullets, code).toContain(4);
      // Las clínicas no capilares solo ven la línea de guías faciales (plástica), no la calculadora de injertos.
      const plain = JSON.stringify((await loadManual(code, "plastica")).staff.find((s) => s.key === "diagnosis"));
      expect(plain, code).not.toContain("180");
      const derm = JSON.stringify((await loadManual(code, "dermatologia")).staff.find((s) => s.key === "diagnosis"));
      expect(derm, code).not.toContain("MediaPipe");
    }
    expect(JSON.stringify((await loadManual("es", "plastica")).staff.find((s) => s.key === "diagnosis"))).toContain("Guías faciales");
  });
});

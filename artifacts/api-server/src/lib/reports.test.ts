/**
 * Los cuatro informes PDF con datos de prueba (nunca de pacientes reales): se lee el texto real de cada página
 * del PDF generado para comprobar paginación propia, textos largos sin truncar, campos vacíos omitidos,
 * fotos faltantes declaradas, varias etapas, clínica sin logo y que el PDF de una clínica no lleva la otra.
 * Con PDF_OUT=<carpeta> se guardan los PDF para revisarlos a mano (pdftoppm / PyMuPDF).
 */
import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { pagesText } from "./testing/pdf-text";
import { buildResultPdf, type ResultPdfInput } from "./result-pdf";
import { buildEvolutionPdf, type EvolutionPdfInput } from "./evolution-pdf";
import { buildDischargePdf, type DischargePdfInput } from "./discharge-pdf";
import { buildPendingPdf, type PendingPdfInput } from "./pending-pdf";
import { intakeAnswers } from "./report-data";
import { PDF_LANGUAGES } from "./result-pdf-i18n";
import { REPORT_TEXT } from "./report-i18n";
import type { PendingRow } from "./pending-report";

const allText = async (pdf: Buffer) => (await pagesText(pdf)).join(" \n ");
const save = (name: string, pdf: Buffer) => { if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/${name}.pdf`, pdf); };

/** A test photo: a labelled card, portrait or landscape, so a deformed or mirrored picture would show. */
const photo = (label: string, width = 600, height = 800, color = "#8fb3d9") =>
  sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/><rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#0b2d5b" stroke-width="8"/><text x="40" y="110" font-size="64" font-family="sans-serif" fill="#0b2d5b">${label}</text><text x="40" y="${height - 50}" font-size="40" font-family="sans-serif" fill="#0b2d5b">IZQ ←</text></svg>`)).jpeg().toBuffer();
const logo = (letters: string, color: string) =>
  sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><circle cx="128" cy="128" r="120" fill="${color}"/><text x="128" y="160" text-anchor="middle" font-size="96" font-family="sans-serif" fill="#fff">${letters}</text></svg>`)).png().toBuffer().then((png) => `data:image/png;base64,${png.toString("base64")}`);

const LONG = Array.from({ length: 60 }, (_, i) => `Párrafo ${i + 1}: se observa una densidad capilar conservada en la zona occipital, con miniaturización en la región frontal; se sugiere control fotográfico y seguimiento según indicación médica.`).join("\n");

async function diagnosisInput(overrides: Partial<ResultPdfInput> = {}): Promise<ResultPdfInput> {
  return {
    clinicName: "Clínica Ñandú",
    logoDataUrl: null,
    specialty: "capilar",
    patientName: "Ana Prueba",
    documentId: "11.111.111-1",
    closedAt: new Date("2026-10-08T15:00:00Z"),
    doctorName: "Dra. Paula Pérez",
    responseText: "Alopecia androgénica en etapa inicial. Se recomienda tratamiento tópico y control en 3 meses.",
    photos: [
      { label: "Vista frontal", bytes: await photo("Frontal"), annotated: true, stage: "Pre-evaluación", date: new Date("2026-10-01T12:00:00Z"), note: "Noto más caída al peinarme." },
      { label: "Vértex / Coronilla", bytes: await photo("Vertex", 800, 600), annotated: false, stage: "Pre-evaluación", date: new Date("2026-10-01T12:00:00Z") },
      { label: "Zona donante", bytes: await photo("Donante"), annotated: false, stage: "Pre-evaluación", date: new Date("2026-10-01T12:00:00Z") },
      { label: "Temporal derecha", bytes: await photo("Temporal"), annotated: false, stage: "Pre-evaluación", date: new Date("2026-10-01T12:00:00Z") },
    ],
    intake: intakeAnswers({ clinicalData: {}, hairLossTime: "Entre 1 y 3 años", pattern: "Entradas", previousTreatment: "Minoxidil" } as never, "capilar", "es"),
    appointmentAt: new Date("2026-11-03T13:00:00Z"),
    issuedAt: new Date("2026-10-28T12:00:00Z"),
    language: "es",
    ...overrides,
  };
}

describe("Informe de diagnóstico", () => {
  it("lleva la clínica, la valoración validada, los antecedentes, la cita, las fotos con etapa y fecha, y su propia paginación", async () => {
    const pdf = await buildResultPdf(await diagnosisInput());
    save("diagnostico-es", pdf);
    const pages = await pagesText(pdf);
    const text = pages.join(" ");
    for (const expected of ["Clínica Ñandú", "Informe de diagnóstico", "Validado · emitido".toUpperCase(), "Ana Prueba", "11.111.111-1", "Dra. Paula Pérez", "Valoración del profesional", "Contenido validado por Dra. Paula Pérez", "Motivo y antecedentes", "Tiempo de pérdida: Entre 1 y 3 años", "Próximos pasos", "Registro fotográfico clínico", "Vista frontal", "con indicaciones del médico", "Nota del paciente: Noto más caída al peinarme."]) {
      expect(text).toContain(expected);
    }
    pages.forEach((page, index) => expect(page).toContain(`Página ${index + 1} de ${pages.length}`));
    // Nada de la lámina de muestra.
    expect(text).not.toMatch(/EJEMPLO|FICTICIOS|Por registrar/i);
  });

  it("un texto muy largo sigue en páginas nuevas sin cortarse", async () => {
    const pdf = await buildResultPdf(await diagnosisInput({ responseText: LONG, photos: [] }));
    save("diagnostico-largo", pdf);
    const pages = await pagesText(pdf);
    expect(pages.length).toBeGreaterThan(2);
    const text = pages.join(" ");
    for (let i = 1; i <= 60; i += 1) expect(text).toContain(`Párrafo ${i}:`);
    expect(text).toContain("miniaturización en la región frontal; se sugiere control fotográfico y seguimiento según indicación médica.");
    // Las páginas que siguen llevan el encabezado corto con la clínica.
    expect(pages[1]).toContain("Clínica Ñandú");
    expect(pages[pages.length - 1]).toContain(`Página ${pages.length} de ${pages.length}`);
  });

  it("omite los campos vacíos (sin RUT, sin médico, sin antecedentes, sin cita, sin fotos)", async () => {
    const pdf = await buildResultPdf(await diagnosisInput({ documentId: "", doctorName: null, intake: [], appointmentAt: null, photos: [] }));
    const text = await allText(pdf);
    expect(text).not.toContain("RUT");
    expect(text).not.toContain("Profesional responsable");
    expect(text).not.toContain("Motivo y antecedentes");
    expect(text).not.toContain("Próximos pasos");
    expect(text).not.toContain("Registro fotográfico");
    expect(text).toContain("Contenido validado por el equipo médico");
  });

  it("sin logo muestra las iniciales de esa clínica; con logo, no", async () => {
    expect(await allText(await buildResultPdf(await diagnosisInput({ photos: [] })))).toMatch(/(^| )CÑ( |$)/);
    expect(await allText(await buildResultPdf(await diagnosisInput({ photos: [], logoDataUrl: await logo("N", "#0b2d5b") })))).not.toMatch(/(^| )CÑ( |$)/);
  });

  it("el PDF de una clínica nunca lleva el nombre ni los datos de otra", async () => {
    const a = await allText(await buildResultPdf(await diagnosisInput({ clinicName: "Clínica Alfa", patientName: "Paciente Alfa", photos: [] })));
    const b = await allText(await buildResultPdf(await diagnosisInput({ clinicName: "Clínica Beta", patientName: "Paciente Beta", doctorName: "Dr. Beta", photos: [], logoDataUrl: await logo("B", "#0a7") })));
    expect(a).toContain("Clínica Alfa");
    expect(a).not.toMatch(/Beta/);
    expect(b).toContain("Clínica Beta");
    expect(b).not.toMatch(/Alfa/);
  });

  for (const language of PDF_LANGUAGES) {
    it(`se genera en ${language}`, async () => {
      const pdf = await buildResultPdf(await diagnosisInput({
        clinicName: language === "ar" ? "عيادة النور" : language === "zh" ? "明光诊所" : "Clínica Ñandú",
        patientName: language === "zh" ? "王小明" : language === "ar" ? "محمد علي" : "Şebnem Öztürk",
        responseText: language === "ar" ? `تساقط شعر وراثي في مرحلة مبكرة. ${"يُنصح بعلاج موضعي ومراجعة بعد ثلاثة أشهر. ".repeat(40)}` : language === "zh" ? `早期雄激素性脱发。${"建议外用治疗，三个月后复查。".repeat(60)}` : "Candidato favorable al procedimiento.\nSe recomienda control en 3 meses. 😀",
        intake: intakeAnswers({ clinicalData: {}, hairLossTime: "1-3", pattern: "x" } as never, "capilar", language),
        language,
      }));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      save(`diagnostico-${language}`, pdf);
    });
  }
});

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

async function evolutionInput(overrides: Partial<EvolutionPdfInput> = {}): Promise<EvolutionPdfInput> {
  const phases = [
    { key: "preevaluacion", name: "Pre-evaluación" },
    { key: "diagnostico", name: "Diagnóstico" },
    { key: "preoperatorio", name: "Pre-operatorio" },
    { key: "postoperatorio", name: "Post-operatorio" },
    { key: "control-1", name: "Control médico 1" },
    { key: "control-2", name: "Control médico 2" },
  ];
  const cell = async (phase: number, label: string, iso: string, edited = false) => ({ phaseKey: phases[phase].key, phaseName: phases[phase].name, date: day(iso), bytes: await photo(label), edited });
  return {
    clinicName: "Clínica Ñandú",
    logoDataUrl: null,
    specialty: "capilar",
    patientName: "Ana Prueba",
    documentId: "11.111.111-1",
    generatedAt: day("2026-10-28"),
    phases,
    zones: [
      { label: "Vista frontal", cells: [await cell(0, "F0", "2026-01-05"), await cell(1, "F1", "2026-01-20", true), await cell(2, "F2", "2026-02-10"), await cell(3, "F3", "2026-03-01"), await cell(4, "F4", "2026-06-01"), await cell(5, "F5", "2026-09-01")] },
      // Sin toma del pre-operatorio ni del control 1: la celda lo dice.
      { label: "Vértex / Coronilla", cells: [await cell(0, "V0", "2026-01-05"), await cell(3, "V3", "2026-03-01"), await cell(5, "V5", "2026-09-01")] },
      { label: "Temporal derecha", cells: [await cell(0, "TD0", "2026-01-05"), await cell(2, "TD2", "2026-02-10")] },
      { label: "Temporal izquierda", cells: [await cell(0, "TI0", "2026-01-05"), await cell(4, "TI4", "2026-06-01")] },
    ],
    language: "es",
    ...overrides,
  };
}

describe("Informe de evolución", () => {
  it("una columna por etapa en orden, una fila por posición, y «Sin toma comparable» donde falta la foto", async () => {
    const pdf = await buildEvolutionPdf(await evolutionInput());
    save("evolucion-es", pdf);
    const pages = await pagesText(pdf);
    const text = pages.join(" ");
    for (const expected of ["Informe de evolución", "Ana Prueba", "Período de seguimiento", "Comparativa fotográfica", "Vista frontal", "Vértex / Coronilla", "Temporal derecha", "Temporal izquierda", "Sin toma comparable", "editada por el equipo médico", "Cronología"]) {
      expect(text).toContain(expected);
    }
    // Seis etapas: dos franjas de columnas (cinco y una), con su encabezado en cada página.
    expect(pages.length).toBeGreaterThan(1);
    const stageOrder = ["Pre-evaluación", "Diagnóstico", "Pre-operatorio", "Post-operatorio", "Control médico 1"].map((name) => text.indexOf(name));
    expect(stageOrder).toEqual([...stageOrder].sort((a, b) => a - b));
    pages.forEach((page, index) => expect(page).toContain(`Página ${index + 1} de ${pages.length}`));
    // Ni porcentajes de mejora ni conclusiones automáticas.
    expect(text).not.toMatch(/%|mejor[ií]a/i);
  });

  it("el encabezado de etapas se repite al continuar la cuadrícula en otra página", async () => {
    const base = await evolutionInput();
    const zones = Array.from({ length: 7 }, (_, i) => ({ ...base.zones[0], label: `Zona ${i + 1}` }));
    const pages = await pagesText(await buildEvolutionPdf({ ...base, zones }));
    const withGrid = pages.filter((page) => page.includes("Zona "));
    expect(withGrid.length).toBeGreaterThan(1);
    // Cada página de la cuadrícula lleva la fila de encabezado de su franja (las cinco primeras etapas, o la sexta).
    for (const page of withGrid) {
      expect(page).toContain("POSICIÓN");
      expect(page.includes("Pre-evaluación") || page.includes("Control médico 2")).toBe(true);
    }
    expect(withGrid.filter((page) => page.includes("Control médico 2") && !page.includes("Pre-evaluación")).length).toBeGreaterThan(0);
  });

  for (const language of PDF_LANGUAGES) {
    it(`se genera en ${language}`, async () => {
      const pdf = await buildEvolutionPdf(await evolutionInput({ language, clinicName: language === "ar" ? "عيادة النور" : "Clínica Ñandú" }));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      save(`evolucion-${language}`, pdf);
    });
  }
});

async function dischargeInput(overrides: Partial<DischargePdfInput> = {}): Promise<DischargePdfInput> {
  return {
    clinicName: "Clínica Ñandú",
    logoDataUrl: await logo("Ñ", "#1d5fd8"),
    specialty: "capilar",
    patientName: "Ana Prueba",
    documentId: "11.111.111-1",
    dischargedAt: day("2026-10-20"),
    dischargedByName: "Dra. Paula Pérez",
    dischargeNote: "Evolución estable. Mantener tratamiento tópico y control anual.",
    phases: [
      { name: "Pre-evaluación", state: "done", date: day("2026-01-05") },
      { name: "Diagnóstico", state: "done", date: day("2026-01-20"), issuedBy: "Dra. Paula Pérez" },
      { name: "Pre-operatorio", state: "done", date: day("2026-02-10") },
      { name: "Post-operatorio", state: "done", date: day("2026-03-01") },
    ],
    finalPhotos: [
      { label: "Vista frontal", stage: "Post-operatorio", date: day("2026-03-01"), bytes: await photo("Final F") },
      { label: "Vértex / Coronilla", stage: "Post-operatorio", date: day("2026-03-01"), bytes: await photo("Final V", 800, 600) },
    ],
    issuedAt: day("2026-10-28"),
    language: "es",
    ...overrides,
  };
}

describe("Informe de alta médica", () => {
  it("documenta quién dio el alta, cuándo, su nota, el recorrido por las etapas y las fotos finales", async () => {
    const pdf = await buildDischargePdf(await dischargeInput());
    save("alta-es", pdf);
    const text = await allText(pdf);
    for (const expected of ["Alta médica", "Cierre del protocolo", "Alta médica registrada por Dra. Paula Pérez", "El paciente completó todas las etapas del protocolo.", "Nota del profesional al alta", "Evolución estable. Mantener tratamiento tópico y control anual.", "Resumen del proceso", "Diagnóstico: Diagnóstico emitido por Dra. Paula Pérez", "Registro fotográfico final", "Página 1 de"]) {
      expect(text).toContain(expected);
    }
    expect(text).not.toMatch(/firma|sello/i);
  });

  it("con una etapa omitida no afirma que se completó el protocolo; sin nota ni fotos los omite", async () => {
    const text = await allText(await buildDischargePdf(await dischargeInput({
      dischargeNote: "",
      finalPhotos: [],
      dischargedByName: "",
      phases: [{ name: "Pre-evaluación", state: "done", date: day("2026-01-05") }, { name: "Diagnóstico", state: "skipped", date: null, issuedBy: null }, { name: "Post-operatorio", state: "open", date: null }],
    })));
    expect(text).not.toContain("completó todas las etapas");
    expect(text).toContain("Diagnóstico: Omitida por el equipo");
    expect(text).toContain("Post-operatorio: Sin registro");
    expect(text).not.toContain("Nota del profesional");
    expect(text).not.toContain("Registro fotográfico final");
    expect(text).not.toContain("Alta registrada por");
    expect(text).toContain("Alta médica registrada el");
  });

  for (const language of PDF_LANGUAGES) {
    it(`se genera en ${language}`, async () => {
      const text = REPORT_TEXT[language];
      const pdf = await buildDischargePdf(await dischargeInput({ language, phases: [{ name: text.dischargeTitle, state: "done", date: day("2026-01-05") }] }));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      save(`alta-${language}`, pdf);
    });
  }
});

const row = (i: number, overrides: Partial<PendingRow> = {}): PendingRow => ({
  leadId: `l${i}`, name: `Paciente ${i}`, documentId: `${10 + i}.111.111-${i % 10}`, phone: "", status: i % 3 === 0 ? "agendado" : i % 2 ? "listo" : "contactar",
  createdAt: day("2026-09-01"), updatedAt: day("2026-10-01"), waitingDays: 30 - (i % 30), closedAt: null, ...overrides,
});

function pendingInput(overrides: Partial<PendingPdfInput> = {}): PendingPdfInput {
  return {
    clinicName: "Clínica Ñandú", logoDataUrl: null, specialty: "capilar", cutoff: new Date("2026-10-28T14:30:00Z"),
    evaluation: [row(1), row(2), row(3, { waitingDays: 0 })],
    undelivered: [row(4, { closedAt: day("2026-10-15") })],
    ...overrides,
  };
}

describe("Informe de pacientes pendientes (uso interno)", () => {
  it("fecha de corte, consulta, aviso interno, totales de las mismas listas y las dos categorías por separado", async () => {
    const pdf = await buildPendingPdf(pendingInput());
    save("pendientes", pdf);
    const text = await allText(pdf);
    for (const expected of ["Pacientes pendientes de diagnóstico", "USO INTERNO DEL EQUIPO", "Fecha de corte", "28 de octubre de 2026", "Excluye las fichas de demostración", "No es un registro clínico", "Evaluación pendiente", "Resultado listo, pendiente de envío", "Paciente 1", "Paciente 4", "Hoy", "Listo para revisión", "no indica urgencia clínica", "Pág. 1 de 1"]) {
      expect(text).toContain(expected);
    }
    // Totales: 3 + 1 = 4, cada paciente en una sola lista.
    expect(text).toMatch(/Evaluación pendiente 3 /);
    expect(text).toMatch(/Resultado sin enviar 1 /);
    expect(text).toMatch(/Total en la consulta 4 /);
    expect(text).not.toMatch(/Responsable|Siguiente acción/);
  });

  it("con muchas filas, la tabla continúa en otra página repitiendo su encabezado", async () => {
    const pdf = await buildPendingPdf(pendingInput({ evaluation: Array.from({ length: 70 }, (_, i) => row(i + 1)), undelivered: [] }));
    save("pendientes-largo", pdf);
    const pages = await pagesText(pdf);
    expect(pages.length).toBeGreaterThan(2);
    for (const page of pages.slice(0, -1)) expect(page).toMatch(/Paciente RUT Ingreso Espera Estado/);
    const text = pages.join(" ");
    for (let i = 1; i <= 70; i += 1) expect(text).toContain(`Paciente ${i} `);
    expect(text).toContain("No hay resultados pendientes de envío.");
    pages.forEach((page, index) => expect(page).toContain(`Pág. ${index + 1} de ${pages.length}`));
  });

  it("sin pendientes lo dice en cada lista", async () => {
    const text = await allText(await buildPendingPdf(pendingInput({ evaluation: [], undelivered: [] })));
    expect(text).toContain("No hay pacientes con evaluación pendiente.");
    expect(text).toContain("No hay resultados pendientes de envío.");
  });
});

describe("antecedentes de la preevaluación", () => {
  it("capilar conserva lo que eligió el paciente; las demás especialidades traducen sus claves", () => {
    expect(intakeAnswers({ clinicalData: {}, hairLossTime: "Más de 5 años", pattern: "" } as never, "capilar", "en")).toEqual([{ label: "Duration of loss", value: "Más de 5 años" }]);
    expect(intakeAnswers({ clinicalData: { procedure: "rhinoplasty", concern: "La punta", smoking: "zzz" } } as never, "plastica", "es")).toEqual([
      { label: expect.stringMatching(/procedimiento/i), value: "Rinoplastia" },
      { label: expect.any(String), value: "La punta" },
    ]);
    expect(intakeAnswers({ clinicalData: { reason: "mole" } } as never, "dermatologia", "de")[0].value).not.toBe("mole");
  });
});

import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import type { LeadPhase } from "./clinical-photos";
import type { DiagnosisPhoto } from "./diagnosis";
import { groupEvolutionZones } from "./evolution-zones";
import { buildEvolutionPdf } from "./evolution-pdf";
import { evolutionPhaseName, evolutionZoneName, zoneKeyOf } from "./evolution-i18n";
import { evolutionMail } from "./mailer";
import { PDF_LANGUAGES } from "./result-pdf-i18n";

const view = (key: string, label: string, photoId: string | null) => ({
  id: `v-${key}`, key, label, required: true,
  photo: photoId ? ({ id: photoId, createdAt: new Date("2026-01-05T12:00:00Z") } as never) : null,
});
const phase = (key: string, name: string, kind: "capture" | "diagnosis", views: ReturnType<typeof view>[], position: number): LeadPhase => ({
  id: key, key, name, position, kind, patientCaptured: position === 0, enabled: true, complete: true, views,
});
const diagnosisPhoto = (viewKey: string, label: string, photoId: string, hasAnnotation: boolean): DiagnosisPhoto => ({
  photoId, viewKey, label, note: null, width: 10, height: 10, hasAnnotation, annotationUpdatedAt: new Date("2026-02-01T12:00:00Z"), strokes: [],
});

const phases = [
  phase("preevaluacion", "Pre-evaluación", "capture", [view("frontal", "Vista frontal", "p1"), view("donor", "Zona donante", "p2")], 0),
  phase("diagnostico", "Diagnóstico", "diagnosis", [], 1),
  phase("preoperatorio", "Pre-operatorio", "capture", [view("preoperatorio-frontal", "Vista frontal", "p3"), view("preoperatorio-donor", "Zona donante", null)], 2),
  phase("postoperatorio", "Post-operatorio", "capture", [view("postoperatorio-frontal", "Vista frontal", "p4"), view("postoperatorio-extra-ab12", "Otra", "p5")], 3),
];

describe("Evolución: agrupar las fotos por zona", () => {
  it("la zona es la vista base: las fases posteriores repiten las vistas como <fase>-<vista>", () => {
    expect(zoneKeyOf("frontal", "preevaluacion")).toBe("frontal");
    expect(zoneKeyOf("postoperatorio-frontal", "postoperatorio")).toBe("frontal");
    expect(zoneKeyOf("control-1-donor", "control-1")).toBe("donor");
  });

  it("junta la misma zona de cada fase y usa la foto editada en el diagnóstico", () => {
    const zones = groupEvolutionZones(phases, [diagnosisPhoto("frontal", "Vista frontal", "p1", true), diagnosisPhoto("donor", "Zona donante", "p2", false)]);
    const frontal = zones.find((zone) => zone.key === "frontal")!;
    expect(frontal.cells.map((cell) => cell.phaseKey)).toEqual(["preevaluacion", "diagnostico", "preoperatorio", "postoperatorio"]);
    expect(frontal.cells.map((cell) => cell.photoId)).toEqual(["p1", "p1", "p3", "p4"]);
    expect(frontal.cells.map((cell) => cell.edited)).toEqual([false, true, false, false]);
  });

  it("sin dibujo no hay columna de diagnóstico y las fases sin foto no aparecen", () => {
    const zones = groupEvolutionZones(phases, [diagnosisPhoto("donor", "Zona donante", "p2", false)]);
    const donor = zones.find((zone) => zone.key === "donor")!;
    expect(donor.cells.map((cell) => cell.phaseKey)).toEqual(["preevaluacion"]);
    // Una vista propia de la clínica queda como zona aparte.
    expect(zones.find((zone) => zone.key === "extra-ab12")?.cells).toHaveLength(1);
  });

  it("traduce los nombres de fases y zonas de fábrica y respeta los que la clínica cambió", () => {
    expect(evolutionPhaseName({ key: "preoperatorio", name: "Pre-operatorio" }, "en")).toBe("Pre-operative");
    expect(evolutionPhaseName({ key: "preoperatorio", name: "Antes de operar" }, "en")).toBe("Antes de operar");
    expect(evolutionZoneName("donor", "Zona donante", "de")).toBe("Spenderbereich");
    expect(evolutionZoneName("donor", "Nuca", "de")).toBe("Nuca");
    expect(evolutionZoneName("custom", "Cejas", "zh")).toBe("Cejas");
  });
});

const photo = (color: string) => sharp({ create: { width: 600, height: 800, channels: 3, background: color } }).jpeg().toBuffer();

describe("PDF de Evolución en los nueve idiomas", () => {
  for (const language of PDF_LANGUAGES) {
    it(`se genera en ${language}, en horizontal`, async () => {
      const bytes = [await photo("#c0c0c0"), await photo("#a0b0c0"), await photo("#b0a0c0"), await photo("#c0b0a0")];
      const pdf = await buildEvolutionPdf({
        clinicName: language === "ar" ? "عيادة النور" : "Clínica Ñandú",
        logoDataUrl: null,
        patientName: language === "zh" ? "王小明" : language === "ar" ? "محمد علي" : "Şebnem Öztürk",
        documentId: "12.345.678-9",
        generatedAt: new Date("2026-10-08T15:00:00Z"),
        language,
        zones: [
          { label: language === "zh" ? "正面视图" : "Vista frontal", cells: bytes.map((b, i) => ({ phaseName: language === "ar" ? "ما قبل الجراحة" : `Fase ${i + 1}`, date: new Date("2026-03-01T12:00:00Z"), bytes: b, edited: i === 1 })) },
          { label: "Zona donante", cells: [{ phaseName: "Pre-evaluación", date: null, bytes: bytes[0], edited: false }, { phaseName: "Post-operatorio", date: null, bytes: null, edited: false }] },
        ],
      });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      const doc = await PDFDocument.load(pdf);
      const { width, height } = doc.getPage(0).getSize();
      expect(width).toBeGreaterThan(height);
      if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/evolucion-${language}.pdf`, pdf);
    });
  }

  it("con más de cuatro fases reparte las fotos en dos filas y no se sale de la página", async () => {
    const one = await photo("#c0c0c0");
    const cells = Array.from({ length: 7 }, (_, i) => ({ phaseName: `Fase ${i + 1}`, date: null, bytes: one, edited: false }));
    const pdf = await buildEvolutionPdf({ clinicName: "C", logoDataUrl: null, patientName: "P", documentId: "", generatedAt: new Date(), zones: [{ label: "A", cells }, { label: "B", cells }] });
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
  });
});

describe("Correo de Evolución", () => {
  const base = { clinicName: "Clínica Sol", patientName: "Ana", pdf: Buffer.from("%PDF-1.4 x"), filename: "evolucion.pdf", language: "en" };

  it("al paciente saluda por su nombre y adjunta el PDF", () => {
    const mail = evolutionMail({ ...base, to: "ana@example.com", toPatient: true });
    expect(mail.subject).toBe("Your treatment progress – Clínica Sol");
    expect(mail.text.startsWith("Hello Ana")).toBe(true);
    expect(mail.attachments?.[0]).toMatchObject({ filename: "evolucion.pdf", contentType: "application/pdf" });
  });

  it("a otra dirección nombra al paciente en vez de saludarlo", () => {
    const mail = evolutionMail({ ...base, to: "admin@clinica.cl", toPatient: false });
    expect(mail.text).toContain("Ana");
    expect(mail.text.startsWith("Hello")).toBe(false);
  });
});

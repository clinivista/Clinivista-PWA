import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { buildResultPdf } from "./result-pdf";
import { PDF_LANGUAGES } from "./result-pdf-i18n";

const photo = async () => sharp({ create: { width: 600, height: 400, channels: 3, background: "#cccccc" } }).jpeg().toBuffer();

describe("PDF de resultados en los nueve idiomas", () => {
  for (const language of PDF_LANGUAGES) {
    it(`se genera en ${language}`, async () => {
      const pdf = await buildResultPdf({
        clinicName: language === "ar" ? "عيادة النور" : "Clínica Ñandú",
        logoDataUrl: null,
        patientName: language === "zh" ? "王小明" : language === "ar" ? "محمد علي" : "Şebnem Öztürk",
        documentId: "12.345.678-9",
        closedAt: new Date("2026-10-08T15:00:00Z"),
        doctorName: "Dra. Pérez",
        responseText: "Candidato favorable al procedimiento.\nSe recomienda control en 3 meses. 😀",
        photos: [{ label: "Frontal", bytes: await photo(), annotated: true }],
        language,
      });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(2000);
      if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/${language}.pdf`, pdf);
    });
  }

  it("un idioma desconocido usa español", async () => {
    const pdf = await buildResultPdf({ clinicName: "C", logoDataUrl: null, patientName: "P", documentId: "", closedAt: new Date(), doctorName: null, responseText: "ok", photos: [], language: "xx" });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

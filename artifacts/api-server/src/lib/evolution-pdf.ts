import { rgb } from "pdf-lib";
import sharp from "sharp";
import { createPdfWriter } from "./result-pdf";
import { EVOLUTION_TEXT } from "./evolution-i18n";
import { PDF_TEXT, toPdfLanguage } from "./result-pdf-i18n";

export type EvolutionPdfCell = { phaseName: string; date: Date | null; bytes: Buffer | null; edited: boolean };
export type EvolutionPdfZone = { label: string; cells: EvolutionPdfCell[] };

export type EvolutionPdfInput = {
  clinicName: string;
  logoDataUrl: string | null;
  patientName: string;
  documentId: string;
  generatedAt: Date;
  zones: EvolutionPdfZone[];
  language?: string | null;
};

const LANDSCAPE = { width: 842, height: 595, margin: 40 };
const PER_ROW = 4;
const GAP = 12;
const formatDay = (date: Date, locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "America/Santiago" }).format(date);

/** The Evolución comparison: one section per anatomical zone, with one column per phase, side by side (landscape A4). */
export async function buildEvolutionPdf(input: EvolutionPdfInput): Promise<Buffer> {
  const language = toPdfLanguage(input.language);
  const text = EVOLUTION_TEXT[language];
  const labels = PDF_TEXT[language];
  const writer = await createPdfWriter({
    clinicName: input.clinicName,
    logoDataUrl: input.logoDataUrl,
    language,
    patientName: input.patientName,
    documentTitle: text.documentTitle,
    page: LANDSCAPE,
    fontText: [input.documentId, ...Object.values(text).filter((value): value is string => typeof value === "string"), ...input.zones.flatMap((zone) => [zone.label, ...zone.cells.map((cell) => cell.phaseName)])],
  });
  const { pdf, rtlLabels, contentWidth, PAGE, ensure, label, block } = writer;
  await writer.letterhead();
  const ltr = (value: string) => (rtlLabels ? `\u200F\u200E${value}\u200E\u200F` : value);

  await label(text.title, { size: 15, bold: true, gap: 4 });
  await label(`${labels.patient}: ${ltr(input.patientName)}${input.documentId ? `  ·  ${labels.documentId} ${ltr(input.documentId)}` : ""}`, { color: "muted" });
  await label(`${labels.date}: ${ltr(formatDay(input.generatedAt, labels.locale))}`, { color: "muted", gap: 4 });
  await label(text.intro, { size: 10, color: "muted", gap: 8 });

  for (const zone of input.zones) {
    const rows = Math.ceil(zone.cells.length / PER_ROW);
    const columns = Math.min(zone.cells.length, PER_ROW);
    const columnWidth = (contentWidth - (columns - 1) * GAP) / columns;
    // One row can be tall; two rows share the page. A zone never starts where its rows would not fit.
    const imageHeight = rows === 1 ? 300 : 170;
    const captionHeight = 40;
    ensure(24 + rows * (imageHeight + captionHeight));
    await label(zone.label, { size: 13, bold: true, gap: 4 });

    for (let row = 0; row < rows; row += 1) {
      const top = writer.getY();
      const page = writer.getPage();
      const cells = zone.cells.slice(row * PER_ROW, (row + 1) * PER_ROW);
      let rowHeight = 0;
      for (const [index, cell] of cells.entries()) {
        let shown = imageHeight;
        // Right-to-left languages read the phases from the right.
        const slot = rtlLabels ? columns - 1 - index : index;
        const left = PAGE.margin + slot * (columnWidth + GAP);
        if (cell.bytes) {
          const jpeg = await sharp(cell.bytes, { limitInputPixels: 50_000_000 })
            .rotate()
            .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#ffffff" })
            .jpeg({ quality: 80 })
            .toBuffer();
          const image = await pdf.embedJpg(jpeg);
          const scale = Math.min(columnWidth / image.width, imageHeight / image.height);
          const width = image.width * scale;
          const height = image.height * scale;
          page.drawImage(image, { x: left + (columnWidth - width) / 2, y: top - height, width, height });
          shown = height;
        } else {
          
          page.drawRectangle({ x: left, y: top - imageHeight, width: columnWidth, height: imageHeight, borderColor: rgb(0.8, 0.82, 0.85), borderWidth: 0.8 });
          await block(text.noPhoto, { size: 9, color: "muted", rtl: rtlLabels }, page, top - imageHeight / 2, left + 6, columnWidth - 12);
        }
        rowHeight = Math.max(rowHeight, shown);
        let captionTop = top - shown - 6;
        captionTop -= await block(cell.phaseName, { size: 9, bold: true, rtl: rtlLabels }, page, captionTop, left, columnWidth);
        const detail = [cell.date ? ltr(formatDay(cell.date, labels.locale)) : "", cell.edited ? text.edited : ""].filter(Boolean).join(" · ");
        if (detail) await block(detail, { size: 8, color: "muted", rtl: rtlLabels }, page, captionTop, left, columnWidth);
      }
      writer.setY(top - rowHeight - captionHeight);
    }
    writer.setY(writer.getY() - 8);
  }

  ensure(40);
  await label(text.notice, { size: 8, color: "muted" });
  return writer.finish();
}

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";

export type ResultPdfPhoto = { label: string; bytes: Buffer; annotated: boolean };

export type ResultPdfInput = {
  clinicName: string;
  logoDataUrl: string | null;
  patientName: string;
  documentId: string;
  closedAt: Date;
  doctorName: string | null;
  responseText: string;
  photos: ResultPdfPhoto[];
};

export const RESULT_NOTICE =
  "Esta respuesta se basa en las fotografías y los datos que usted envió y no reemplaza una consulta presencial. " +
  "Para confirmar el diagnóstico y definir el tratamiento, el equipo médico podrá solicitarle una evaluación en la clínica.";

const PAGE = { width: 595, height: 842, margin: 48 };
const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.4, 0.43, 0.48);

/** The standard PDF fonts only know Latin-1: anything else is replaced so a stray emoji can never break the document. */
function printable(text: string, font: PDFFont): string {
  const allowed = new Set(font.getCharacterSet());
  return [...text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ")]
    .map((char) => (char === "\n" || allowed.has(char.codePointAt(0)!) ? char : "?"))
    .join("");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of printable(text, font).split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // A single word longer than the line (a URL, say) is cut by characters.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut -= 1;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(date);

/** The patient's result: clinic header, the doctor's response and the annotated photos. */
export async function buildResultPdf(input: ResultPdfInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`Resultados - ${input.patientName}`);
  pdf.setAuthor(input.clinicName);
  pdf.setProducer("Clinivista");

  const contentWidth = PAGE.width - PAGE.margin * 2;
  let page: PDFPage = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;

  const ensure = (height: number) => {
    if (y - height >= PAGE.margin) return;
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
  };
  const text = (value: string, options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const size = options.size ?? 11;
    const font = options.font ?? regular;
    for (const line of wrap(value, font, size, contentWidth)) {
      ensure(size * 1.5);
      page.drawText(line, { x: PAGE.margin, y: y - size, size, font, color: options.color ?? INK });
      y -= size * 1.45;
    }
    y -= options.gap ?? 0;
  };

  if (input.logoDataUrl) {
    try {
      const logo = await pdf.embedPng(Buffer.from(input.logoDataUrl.split(",")[1] ?? "", "base64"));
      const scaled = logo.scale(Math.min(48 / logo.width, 48 / logo.height));
      page.drawImage(logo, { x: PAGE.margin, y: y - scaled.height, width: scaled.width, height: scaled.height });
      page.drawText(printable(input.clinicName, bold), { x: PAGE.margin + scaled.width + 12, y: y - 30, size: 18, font: bold, color: INK });
      y -= Math.max(scaled.height, 36) + 14;
    } catch {
      text(input.clinicName, { size: 18, font: bold, gap: 6 });
    }
  } else {
    text(input.clinicName, { size: 18, font: bold, gap: 6 });
  }
  page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 0.8, color: rgb(0.8, 0.82, 0.85) });
  y -= 18;

  text("Resultados de su evaluación", { size: 15, font: bold, gap: 6 });
  text(`Paciente: ${input.patientName}${input.documentId ? `  ·  RUT ${input.documentId}` : ""}`, { color: MUTED });
  text(`Fecha: ${formatDate(input.closedAt)}`, { color: MUTED });
  if (input.doctorName) text(`Médico: ${input.doctorName}`, { color: MUTED });
  y -= 10;

  text("Respuesta del equipo médico", { size: 13, font: bold, gap: 4 });
  text(input.responseText, { gap: 14 });

  if (input.photos.length > 0) {
    for (const [index, photo] of input.photos.entries()) {
      const jpeg = await sharp(photo.bytes, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 82 })
        .toBuffer();
      const image = await pdf.embedJpg(jpeg);
      const maxHeight = 360;
      const scale = Math.min(contentWidth / image.width, maxHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      // The section title never ends up alone at the bottom of a page.
      ensure(height + 34 + (index === 0 ? 30 : 0));
      if (index === 0) text("Sus fotografías", { size: 13, font: bold, gap: 6 });
      text(photo.annotated ? `${photo.label} (con indicaciones del médico)` : photo.label, { size: 10, font: bold, color: MUTED });
      page.drawImage(image, { x: PAGE.margin, y: y - height, width, height });
      y -= height + 16;
    }
  }

  ensure(60);
  y -= 6;
  text(RESULT_NOTICE, { size: 9, color: MUTED });

  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    current.drawText(`${printable(input.clinicName, regular)}  ·  Página ${index + 1} de ${pages.length}`, {
      x: PAGE.margin, y: 24, size: 8, font: regular, color: MUTED,
    });
  });
  return Buffer.from(await pdf.save());
}

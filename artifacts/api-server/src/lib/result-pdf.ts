import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import { CJK_B64, DEJAVU_B64, DEJAVU_BOLD_B64 } from "./fonts/result-fonts";
import { PDF_TEXT, toPdfLanguage, type PdfLanguage } from "./result-pdf-i18n";

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
  /** Idioma del paciente; si falta o no es válido, español. */
  language?: string | null;
};

export { RESULT_NOTICE } from "./result-pdf-notice";

export const DEFAULT_PAGE = { width: 595, height: 842, margin: 48 };
const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.4, 0.43, 0.48);
const INK_HEX = "#1a1f29";
const MUTED_HEX = "#666e7a";

// Texto con escritura árabe: se dibuja como imagen con Pango (letras unidas y sentido derecha-a-izquierda).
const ARABIC = /[\u0590-\u08FF\uFB1D-\uFEFF]/;
const SCALE = 4;

const CJK = /[\u2E80-\u9FFF\uFF00-\uFFEF]/;
const needsImage = (value: string) => ARABIC.test(value) || CJK.test(value);

const fontFiles = new Map<string, string>();
/** Pango needs the font on disk: it is written once to the temp folder. */
function ensureFontFile(kind: "latin-arabic" | "cjk"): { file: string; family: string } {
  const spec = kind === "cjk" ? { name: "NotoSansCJK-subset.otf", data: CJK_B64, family: "Noto Sans CJK SC" } : { name: "DejaVuSans-subset.ttf", data: DEJAVU_B64, family: "DejaVu Sans" };
  const cached = fontFiles.get(kind);
  if (cached) return { file: cached, family: spec.family };
  const dir = path.join(tmpdir(), "clinivista-fonts");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, spec.name);
  if (!existsSync(file)) writeFileSync(file, Buffer.from(spec.data, "base64"));
  fontFiles.set(kind, file);
  return { file, family: spec.family };
}

const escapeMarkup = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Fonts = { helv: PDFFont; helvBold: PDFFont; dejavu: PDFFont | null; dejavuBold: PDFFont | null };

/** Standard fonts first (Latin-1), then DejaVu (Latin extended, e.g. Turkish); anything else becomes "?". */
function pickFont(char: string, fonts: Fonts, bold: boolean): { font: PDFFont; char: string } {
  const code = char.codePointAt(0)!;
  const std = bold ? fonts.helvBold : fonts.helv;
  if (new Set(std.getCharacterSet()).has(code)) return { font: std, char };
  const dv = bold ? fonts.dejavuBold : fonts.dejavu;
  if (dv && new Set(dv.getCharacterSet()).has(code)) return { font: dv, char };
  return { font: std, char: "?" };
}

type Run = { font: PDFFont; text: string };

function toRuns(text: string, fonts: Fonts, bold: boolean): Run[] {
  const runs: Run[] = [];
  for (const raw of [...text]) {
    const { font, char } = pickFont(raw, fonts, bold);
    const last = runs[runs.length - 1];
    if (last && last.font === font) last.text += char;
    else runs.push({ font, text: char });
  }
  return runs;
}

const runsWidth = (runs: Run[], size: number) => runs.reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, size), 0);

function wrap(text: string, fonts: Fonts, bold: boolean, size: number, maxWidth: number): string[] {
  const width = (value: string) => runsWidth(toRuns(value, fonts, bold), size);
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (width(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // A single word longer than the line (a URL, say) is cut by characters.
      let rest = word;
      while (width(rest) > maxWidth) {
        let cut = [...rest].length - 1;
        while (cut > 1 && width([...rest].slice(0, cut).join("")) > maxWidth) cut -= 1;
        lines.push([...rest].slice(0, cut).join(""));
        rest = [...rest].slice(cut).join("");
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

const formatDate = (date: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "America/Santiago" }).format(date);

type Style = { size?: number; bold?: boolean; color?: "ink" | "muted"; gap?: number; rtl?: boolean };

export type PdfWriterOptions = {
  clinicName: string;
  logoDataUrl: string | null;
  language?: string | null;
  /** Used for the document title. */
  patientName: string;
  documentTitle?: string;
  /** Every text the document will print, so the extra fonts are embedded only when needed. */
  fontText: string[];
  page?: { width: number; height: number; margin: number };
};

/** Shared by the patient's documents: clinic header, text in any of the nine languages (Arabic and CJK shaped), pagination and footer. */
export async function createPdfWriter(input: PdfWriterOptions) {
  const PAGE = input.page ?? DEFAULT_PAGE;
  const language: PdfLanguage = toPdfLanguage(input.language);
  const labels = PDF_TEXT[language];
  const rtlLabels = language === "ar";
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  // Extra fonts are embedded only when some text needs them.
  const everything = [input.clinicName, input.patientName, ...input.fontText, ...Object.values(labels).filter((v) => typeof v === "string")].join("");
  const helvChars = new Set((await pdf.embedFont(StandardFonts.Helvetica)).getCharacterSet());
  const needsExtended = [...everything].some((c) => !helvChars.has(c.codePointAt(0)!) && !needsImage(c));
  const fonts: Fonts = {
    helv: await pdf.embedFont(StandardFonts.Helvetica),
    helvBold: await pdf.embedFont(StandardFonts.HelveticaBold),
    dejavu: needsExtended ? await pdf.embedFont(Buffer.from(DEJAVU_B64, "base64"), { subset: true }) : null,
    dejavuBold: needsExtended ? await pdf.embedFont(Buffer.from(DEJAVU_BOLD_B64, "base64"), { subset: true }) : null,
  };
  pdf.setTitle(`${input.documentTitle ?? labels.documentTitle} - ${input.patientName}`.replace(/[^\u0020-\u00FF]/g, "?"));
  pdf.setAuthor(input.clinicName.replace(/[^\u0020-\u00FF]/g, "?"));
  pdf.setProducer("Clinivista");

  const contentWidth = PAGE.width - PAGE.margin * 2;
  let page: PDFPage = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;

  const ensure = (height: number) => {
    if (y - height >= PAGE.margin) return;
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
  };

  /** Arabic and CJK text as an image: Pango shapes it (joined Arabic letters, right-to-left) with the bundled font. */
  const richImage = async (value: string, size: number, bold: boolean, hex: string, width: number, rtl: boolean) => {
    const body = escapeMarkup(value);
    const markup = `<span foreground="${hex}">${bold ? `<b>${body}</b>` : body}</span>`;
    const { file, family } = ensureFontFile(CJK.test(value) ? "cjk" : "latin-arabic");
    // `rtl` exists in libvips but not in this sharp version's typings.
    const textOptions = { text: markup, font: `${family} ${size}`, fontfile: file, width: Math.round(width * SCALE), rtl, align: rtl ? "right" : "left", dpi: 72 * SCALE, rgba: true, wrap: "word-char" };
    const png = await sharp({ text: textOptions as never }).png().toBuffer();
    const meta = await sharp(png).metadata();
    return { png, width: (meta.width ?? 0) / SCALE, height: (meta.height ?? 0) / SCALE };
  };

  /** Draws the image with its top at `top`; right-to-left blocks hang from the right edge, the others from the left. */
  const drawRich = async (value: string, style: Style, targetPage: PDFPage, top: number, maxWidth: number, left = PAGE.margin) => {
    const rtl = style.rtl ?? ARABIC.test(value);
    const rendered = await richImage(value, style.size ?? 11, style.bold ?? false, style.color === "muted" ? MUTED_HEX : INK_HEX, maxWidth, rtl);
    const image = await pdf.embedPng(rendered.png);
    const x = rtl ? left + maxWidth - rendered.width : left;
    targetPage.drawImage(image, { x, y: top - rendered.height, width: rendered.width, height: rendered.height });
    return rendered.height;
  };

  const text = async (value: string, style: Style = {}) => {
    const size = style.size ?? 11;
    const bold = style.bold ?? false;
    const color = style.color === "muted" ? MUTED : INK;
    if (needsImage(value) || style.rtl) {
      // Measure first so the block is never split from the page it starts on.
      const probe = await richImage(value, size, bold, INK_HEX, contentWidth, style.rtl ?? ARABIC.test(value));
      ensure(probe.height + 2);
      y -= await drawRich(value, style, page, y, contentWidth) + size * 0.3;
      y -= style.gap ?? 0;
      return;
    }
    for (const line of wrap(value, fonts, bold, size, contentWidth)) {
      ensure(size * 1.5);
      let x = PAGE.margin;
      for (const run of toRuns(line, fonts, bold)) {
        page.drawText(run.text, { x, y: y - size, size, font: run.font, color });
        x += run.font.widthOfTextAtSize(run.text, size);
      }
      y -= size * 1.45;
    }
    y -= style.gap ?? 0;
  };
  /** A text block inside a column (left edge, width) at a fixed top; returns the height it took. Used by grids, which place their own cells. */
  const block = async (value: string, style: Style, targetPage: PDFPage, top: number, left: number, width: number): Promise<number> => {
    const size = style.size ?? 11;
    const bold = style.bold ?? false;
    const color = style.color === "muted" ? MUTED : INK;
    if (needsImage(value) || style.rtl) return (await drawRich(value, style, targetPage, top, width, left)) + size * 0.3;
    let used = 0;
    for (const line of wrap(value, fonts, bold, size, width)) {
      let x = left;
      for (const run of toRuns(line, fonts, bold)) {
        targetPage.drawText(run.text, { x, y: top - used - size, size, font: run.font, color });
        x += run.font.widthOfTextAtSize(run.text, size);
      }
      used += size * 1.35;
    }
    return used;
  };
  /** Fixed labels follow the language's direction; the patient's own text keeps its own. */
  const label = (value: string, style: Style = {}) => text(value, { ...style, rtl: rtlLabels });

  const header = async () => {
    if (input.logoDataUrl) {
      try {
        const logo = await pdf.embedPng(Buffer.from(input.logoDataUrl.split(",")[1] ?? "", "base64"));
        const scaled = logo.scale(Math.min(48 / logo.width, 48 / logo.height));
        page.drawImage(logo, { x: PAGE.margin, y: y - scaled.height, width: scaled.width, height: scaled.height });
        if (needsImage(input.clinicName)) {
          const left = PAGE.margin + scaled.width + 12;
          await drawRich(input.clinicName, { size: 18, bold: true }, page, y - 10, PAGE.width - PAGE.margin - left, left);
        } else {
          let x = PAGE.margin + scaled.width + 12;
          for (const run of toRuns(input.clinicName, fonts, true)) {
            page.drawText(run.text, { x, y: y - 30, size: 18, font: run.font, color: INK });
            x += run.font.widthOfTextAtSize(run.text, 18);
          }
        }
        y -= Math.max(scaled.height, 36) + 14;
        return;
      } catch {
        /* fall back to the text-only header */
      }
    }
    await text(input.clinicName, { size: 18, bold: true, gap: 6 });
  };

  /** Header with the clinic's logo and name, and the divider line. */
  const letterhead = async () => {
    await header();
    page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.width - PAGE.margin, y }, thickness: 0.8, color: rgb(0.8, 0.82, 0.85) });
    y -= 18;
  };

  /** Footer with the clinic name and "page n of m" on every page, then the file. */
  const finish = async () => {
    const pages = pdf.getPages();
    for (const [index, current] of pages.entries()) {
      const footer = `${input.clinicName}  ·  ${labels.page(index + 1, pages.length)}`;
      if (needsImage(footer) || rtlLabels) {
        await drawRich(footer, { size: 8, color: "muted", rtl: rtlLabels }, current, 36, contentWidth);
      } else {
        let x = PAGE.margin;
        for (const run of toRuns(footer, fonts, false)) {
          current.drawText(run.text, { x, y: 24, size: 8, font: run.font, color: MUTED });
          x += run.font.widthOfTextAtSize(run.text, 8);
        }
      }
    }
    return Buffer.from(await pdf.save());
  };

  return {
    pdf, labels, language, rtlLabels, fonts, PAGE, contentWidth,
    getPage: () => page, getY: () => y, setY: (value: number) => { y = value; },
    ensure, text, label, block, drawRich, letterhead, finish,
  };
}

/** The patient's result: clinic header, the doctor's response and the annotated photos, in the patient's language. */
export async function buildResultPdf(input: ResultPdfInput): Promise<Buffer> {
  const writer = await createPdfWriter({
    clinicName: input.clinicName,
    logoDataUrl: input.logoDataUrl,
    language: input.language,
    patientName: input.patientName,
    fontText: [input.documentId, input.doctorName ?? "", input.responseText, ...input.photos.map((p) => p.label)],
  });
  const { pdf, labels, rtlLabels, contentWidth, PAGE, ensure, text, label } = writer;
  await writer.letterhead();

  await label(labels.title, { size: 15, bold: true, gap: 6 });
  // In right-to-left text, left-to-right values (names, numbers) are fenced so their digits and hyphens keep their order.
  const ltr = (value: string) => (rtlLabels ? `\u200E${value}\u200E` : value);
  await label(`${labels.patient}: ${ltr(input.patientName)}${input.documentId ? `  ·  ${labels.documentId} ${ltr(input.documentId)}` : ""}`, { color: "muted" });
  await label(`${labels.date}: ${ltr(formatDate(input.closedAt, labels.locale))}`, { color: "muted" });
  if (input.doctorName) await label(`${labels.doctor}: ${ltr(input.doctorName)}`, { color: "muted" });
  writer.setY(writer.getY() - 10);

  await label(labels.response, { size: 13, bold: true, gap: 4 });
  await text(input.responseText, { gap: 14 });

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
    if (index === 0) await label(labels.photos, { size: 13, bold: true, gap: 6 });
    const caption = photo.annotated ? `${photo.label} (${labels.annotated})` : photo.label;
    await text(caption, { size: 10, bold: true, color: "muted", rtl: rtlLabels });
    writer.getPage().drawImage(image, { x: PAGE.margin, y: writer.getY() - height, width, height });
    writer.setY(writer.getY() - height - 16);
  }

  ensure(60);
  writer.setY(writer.getY() - 6);
  await label(labels.notice, { size: 9, color: "muted" });
  return writer.finish();
}

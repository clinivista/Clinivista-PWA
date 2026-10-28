import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, popGraphicsState, pushGraphicsState, rgb, setCharacterSpacing, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import { CJK_B64, DEJAVU_B64, DEJAVU_BOLD_B64 } from "./fonts/result-fonts";
import { CLINIVISTA_LOGO_PNG_B64 } from "./fonts/clinivista-logo";
import { PDF_TEXT, toPdfLanguage, type PdfLanguage } from "./result-pdf-i18n";

// Escritor común de los informes de Clinivista (diagnóstico, evolución, alta médica y pendientes):
// la clínica (logo y nombre reales, o sus iniciales) encabeza cada informe; Clinivista firma el pie en pequeño.
// Blanco, azul marino y azul, líneas finas; el texto es seleccionable (salvo árabe y chino, que Pango dibuja como imagen),
// los textos largos continúan en páginas nuevas y cada informe lleva su propia numeración «Página n de m».

export const PORTRAIT = { width: 595, height: 842, margin: 42 };
export const LANDSCAPE = { width: 842, height: 595, margin: 36 };

const PALETTE = {
  navy: "#0B2D5B",
  ink: "#1A2B45",
  muted: "#55657D",
  blue: "#1D5FD8",
  line: "#D3DCE8",
  soft: "#EEF4FD",
  softLine: "#C6D6EE",
  internal: "#FCEDEF",
  internalInk: "#8A1C2B",
  white: "#FFFFFF",
} as const;
export type Tone = keyof typeof PALETTE;

const hex = (value: string) => {
  const n = parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

// Árabe y chino se dibujan como imagen con Pango (letras árabes unidas, de derecha a izquierda).
const ARABIC = /[֐-ࣿיִ-﻿]/;
const CJK = /[⺀-鿿＀-￯]/;
const needsImage = (value: string) => ARABIC.test(value) || CJK.test(value);
const SCALE = 4;
/** Un bloque árabe o chino se parte en trozos de este largo, así un texto extenso continúa en la página siguiente. */
const RICH_CHUNK = 1200;

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

const runsWidth = (runs: Run[], size: number, tracking: number) =>
  runs.reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, size) + tracking * [...run.text].length, 0);

function wrap(text: string, measure: (value: string) => number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // A single word longer than the line (a URL, say) is cut by characters.
      let rest = word;
      while (measure(rest) > maxWidth) {
        let cut = [...rest].length - 1;
        while (cut > 1 && measure([...rest].slice(0, cut).join("")) > maxWidth) cut -= 1;
        lines.push([...rest].slice(0, cut).join(""));
        rest = [...rest].slice(cut).join("");
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

/** Paragraphs, and long paragraphs cut at a space or sentence end, so each image block stays well under a page. */
function richChunks(value: string): string[] {
  const chunks: string[] = [];
  for (const paragraph of value.replace(/\r\n?/g, "\n").split("\n")) {
    let rest = paragraph;
    while ([...rest].length > RICH_CHUNK) {
      const head = [...rest].slice(0, RICH_CHUNK).join("");
      // Prefer a sentence end; otherwise a space; otherwise the plain length (Chinese has no spaces).
      const sentence = Math.max(head.lastIndexOf(". "), head.lastIndexOf("。"), head.lastIndexOf("؟ "), head.lastIndexOf("! "));
      const cut = sentence > RICH_CHUNK / 2 ? sentence + 1 : Math.max(head.lastIndexOf(" "), head.lastIndexOf("،"));
      const at = cut > RICH_CHUNK / 2 ? cut + 1 : head.length;
      chunks.push(rest.slice(0, at).trim());
      rest = rest.slice(at);
    }
    chunks.push(rest.trim());
  }
  return chunks;
}

export const formatDate = (date: Date, locale: string, style: "long" | "medium" = "long") =>
  new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: "America/Santiago" }).format(date);

/** Initials of the clinic's name, for the header when it has no logo. */
export const clinicInitials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => [...word][0]!.toLocaleUpperCase()).join("") || "?";

export type TextStyle = { size?: number; bold?: boolean; color?: Tone; tracking?: number; upper?: boolean; rtl?: boolean; lineHeight?: number };

/** A slice of content with a known height; `draw` places it with its top at `top`. */
export type Item = { height: number; draw: (page: PDFPage, top: number) => Promise<void> | void };

export type IconName = "document" | "search" | "list" | "calendar" | "camera" | "check" | "clipboard" | "chart" | "target" | "clock" | "send" | "users" | "user" | "info" | "shield" | "image" | "flag";

// Iconos de línea en una caja de 24 × 24 (coordenadas SVG, y hacia abajo).
const ICONS: Record<IconName, string> = {
  document: "M7 3 H14 L19 8 V21 H7 Z M14 3 V8 H19 M10 12 H16 M10 16 H16",
  search: "M11 4 A7 7 0 1 0 11 18 A7 7 0 1 0 11 4 Z M16 16 L21 21",
  list: "M9 6 H21 M9 12 H21 M9 18 H21 M4 6 H5.5 M4 12 H5.5 M4 18 H5.5",
  calendar: "M4 6 H20 V20 H4 Z M4 10 H20 M8 3 V7 M16 3 V7",
  camera: "M4 8 H8 L10 5 H14 L16 8 H20 V19 H4 Z M12 10 A3.5 3.5 0 1 0 12 17 A3.5 3.5 0 1 0 12 10 Z",
  check: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 Z M8 12 L11 15 L16 9",
  clipboard: "M9 3 H15 V6 H9 Z M7 4.5 H5 V21 H19 V4.5 H17 M9 11 H15 M9 15 H15",
  chart: "M5 20 V13 M10 20 V9 M15 20 V5 M20 20 V11 M3 20.5 H21",
  target: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 Z M12 7 A5 5 0 1 0 12 17 A5 5 0 1 0 12 7 Z M12 11 A1 1 0 1 0 12 13 A1 1 0 1 0 12 11 Z",
  clock: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 Z M12 7 V12 L15.5 14",
  send: "M3 11 L21 3 L13 21 L11 13 Z M11 13 L21 3",
  users: "M9 11 A3.5 3.5 0 1 0 9 4 A3.5 3.5 0 1 0 9 11 Z M3 20 C3 16.5 5.7 14 9 14 C12.3 14 15 16.5 15 20 M16 4.5 A3 3 0 0 1 16 10.5 M18 14 C20 14.6 21 16.6 21 19",
  user: "M12 11 A4 4 0 1 0 12 3 A4 4 0 1 0 12 11 Z M5 21 C5 17 8 14 12 14 C16 14 19 17 19 21",
  info: "M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 Z M12 11 V17 M12 7.5 V8",
  shield: "M12 3 L20 6 V12 C20 17 16.5 20 12 21 C7.5 20 4 17 4 12 V6 Z M12 8 V13 M12 16 V16.5",
  image: "M4 5 H20 V19 H4 Z M4 16 L9 11 L13 15 L16 12 L20 16 M15 8.5 A1.5 1.5 0 1 0 15 11.5 A1.5 1.5 0 1 0 15 8.5 Z",
  flag: "M5 21 V4 M5 4 H17 L15 8 L17 12 H5",
};

export type Badge = { text: string; tone: "ok" | "internal" };
export type Field = { label: string; value: string };
export type PhotoCell = { bytes: Buffer | null; lines: Array<{ text: string; style?: TextStyle }>; emptyText?: string };

export type ReportWriterOptions = {
  clinicName: string;
  logoDataUrl: string | null;
  /** Specialty under the clinic's name, already in the document's language. */
  clinicTagline?: string;
  language?: string | null;
  documentTitle: string;
  /** For the PDF metadata. */
  subject?: string;
  page?: { width: number; height: number; margin: number };
};

/** Creates a report: call `cover` once, then the blocks, then `finish`. */
export async function createReportWriter(input: ReportWriterOptions) {
  const PAGE = input.page ?? PORTRAIT;
  const language: PdfLanguage = toPdfLanguage(input.language);
  const labels = PDF_TEXT[language];
  const rtl = language === "ar";
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helvChars = new Set(helv.getCharacterSet());
  let extended: { dejavu: PDFFont; dejavuBold: PDFFont } | null = null;
  const fonts: Fonts = { helv, helvBold, dejavu: null, dejavuBold: null };
  /** DejaVu is embedded (subset) the first time a text needs a character Helvetica lacks. */
  const prepareFonts = async (value: string) => {
    if (extended) return;
    if (![...value].some((c) => !helvChars.has(c.codePointAt(0)!) && !needsImage(c))) return;
    extended = {
      dejavu: await pdf.embedFont(Buffer.from(DEJAVU_B64, "base64"), { subset: true }),
      dejavuBold: await pdf.embedFont(Buffer.from(DEJAVU_BOLD_B64, "base64"), { subset: true }),
    };
    fonts.dejavu = extended.dejavu;
    fonts.dejavuBold = extended.dejavuBold;
  };

  const latin1 = (value: string) => value.replace(/[^ -ÿ]/g, "?");
  pdf.setTitle(latin1(`${input.documentTitle} - ${input.clinicName}`));
  pdf.setAuthor(latin1(input.clinicName));
  if (input.subject) pdf.setSubject(latin1(input.subject));
  pdf.setProducer("Clinivista");
  pdf.setCreator("Clinivista");

  const contentWidth = PAGE.width - PAGE.margin * 2;
  const FOOTER = 34;
  const bottom = PAGE.margin + FOOTER;
  let page: PDFPage = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;
  /** Mirrors a box for right-to-left documents. */
  const mx = (left: number, width: number) => (rtl ? PAGE.width - left - width : left);

  // ---- Texto ----

  const richImage = async (value: string, size: number, bold: boolean, color: string, width: number, alignRight: boolean) => {
    const body = escapeMarkup(value);
    const markup = `<span foreground="${color}">${bold ? `<b>${body}</b>` : body}</span>`;
    const { file, family } = ensureFontFile(CJK.test(value) ? "cjk" : "latin-arabic");
    // `rtl` exists in libvips but not in this sharp version's typings.
    const textOptions = { text: markup, font: `${family} ${size}`, fontfile: file, width: Math.max(1, Math.round(width * SCALE)), rtl: alignRight, align: alignRight ? "right" : "left", dpi: 72 * SCALE, rgba: true, wrap: "word-char" };
    const png = await sharp({ text: textOptions as never }).png().toBuffer();
    const meta = await sharp(png).metadata();
    return { image: await pdf.embedPng(png), width: (meta.width ?? 0) / SCALE, height: (meta.height ?? 0) / SCALE };
  };

  const styleOf = (style: TextStyle) => ({
    size: style.size ?? 10,
    bold: style.bold ?? false,
    color: PALETTE[style.color ?? "ink"],
    tracking: style.tracking ?? 0,
    lineHeight: style.lineHeight ?? 1.4,
  });

  /** Width of a one-line Latin text. */
  const widthOf = (value: string, style: TextStyle = {}) => {
    const s = styleOf(style);
    return runsWidth(toRuns(style.upper ? value.toLocaleUpperCase() : value, fonts, s.bold), s.size, s.tracking);
  };

  const drawRuns = (target: PDFPage, value: string, x: number, baseline: number, style: TextStyle) => {
    const s = styleOf(style);
    if (s.tracking) target.pushOperators(pushGraphicsState(), setCharacterSpacing(s.tracking));
    let cursor = x;
    for (const run of toRuns(value, fonts, s.bold)) {
      target.drawText(run.text, { x: cursor, y: baseline, size: s.size, font: run.font, color: hex(s.color) });
      cursor += run.font.widthOfTextAtSize(run.text, s.size) + s.tracking * [...run.text].length;
    }
    if (s.tracking) target.pushOperators(popGraphicsState());
  };

  /**
   * Lays a text out in a column (left edge and width, before mirroring) and returns it as items, one per line
   * (or per image block for Arabic and Chinese), so the caller can break pages between them.
   * Fixed labels follow the document's direction; `rtl: false` keeps a left-to-right value as it is.
   */
  const prepare = async (raw: string, style: TextStyle, left: number, width: number, align: "start" | "end" | "center" = "start"): Promise<Item[]> => {
    const value = style.upper ? raw.toLocaleUpperCase() : raw;
    if (!value.trim()) return [];
    const s = styleOf(style);
    const boxLeft = mx(left, width);
    const toRight = (rtl && align === "start") || (!rtl && align === "end");
    if (needsImage(value) || (style.rtl ?? rtl)) {
      const items: Item[] = [];
      for (const chunk of richChunks(value)) {
        if (!chunk) {
          items.push({ height: s.size * 0.6, draw: () => undefined });
          continue;
        }
        const alignRight = style.rtl ?? (rtl || ARABIC.test(chunk));
        const rendered = await richImage(chunk, s.size, s.bold, s.color, width, alignRight && align !== "center");
        items.push({
          height: rendered.height + s.size * 0.25,
          draw: (target, top) => {
            const x = align === "center" ? boxLeft + (width - rendered.width) / 2 : alignRight ? boxLeft + width - rendered.width : boxLeft;
            target.drawImage(rendered.image, { x, y: top - rendered.height, width: rendered.width, height: rendered.height });
          },
        });
      }
      return items;
    }
    await prepareFonts(value);
    const measure = (line: string) => runsWidth(toRuns(line, fonts, s.bold), s.size, s.tracking);
    return wrap(value, measure, width).map((line) => ({
      height: s.size * s.lineHeight,
      draw: (target: PDFPage, top: number) => {
        if (!line) return;
        const lineWidth = measure(line);
        const x = align === "center" ? boxLeft + (width - lineWidth) / 2 : toRight ? boxLeft + width - lineWidth : boxLeft;
        drawRuns(target, line, x, top - s.size * 1.02, { ...style, upper: false });
      },
    }));
  };

  const heightOf = (items: Item[]) => items.reduce((sum, item) => sum + item.height, 0);

  // ---- Páginas ----

  /** Title block of the document (clinic, badge, title, subtitle). Every page repeats it with the same sizes. */
  let brand: { title: string; subtitle: string; badge?: Badge } | null = null;

  /** A new page: it repeats the cover's header (same logo, clinic name and title sizes), so every page reads as the same document. */
  const newPage = async () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
    if (brand) {
      await drawBrand(brand);
      return;
    }
    const name = await prepare(input.clinicName, { size: 9, bold: true, color: "navy" }, PAGE.margin, contentWidth / 2 - 8);
    const title = await prepare(input.documentTitle, { size: 8.5, color: "muted" }, PAGE.margin + contentWidth / 2 + 8, contentWidth / 2 - 8, "end");
    for (const item of name.slice(0, 1)) await item.draw(page, y);
    for (const item of title.slice(0, 1)) await item.draw(page, y);
    const used = Math.max(heightOf(name.slice(0, 1)), heightOf(title.slice(0, 1)));
    y -= used + 6;
    rule(page, y);
    y -= 16;
  };

  const ensure = async (height: number) => {
    if (y - height < bottom) await newPage();
  };

  const rule = (target: PDFPage, at: number, left = PAGE.margin, width = contentWidth, color: Tone = "line", thickness = 0.6) => {
    target.drawLine({ start: { x: left, y: at }, end: { x: left + width, y: at }, thickness, color: hex(PALETTE[color]) });
  };

  const roundRect = (target: PDFPage, left: number, top: number, width: number, height: number, radius: number, fill: Tone | null, border: Tone | null, borderWidth = 0.7) => {
    const r = Math.min(radius, width / 2, height / 2);
    const d = `M ${r} 0 H ${width - r} A ${r} ${r} 0 0 1 ${width} ${r} V ${height - r} A ${r} ${r} 0 0 1 ${width - r} ${height} H ${r} A ${r} ${r} 0 0 1 0 ${height - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    target.drawSvgPath(d, {
      x: left,
      y: top,
      color: fill ? hex(PALETTE[fill]) : undefined,
      borderColor: border ? hex(PALETTE[border]) : undefined,
      borderWidth: border ? borderWidth : 0,
    });
  };

  const icon = (target: PDFPage, name: IconName, left: number, top: number, size = 16, color: Tone = "blue") => {
    target.drawSvgPath(ICONS[name], { x: left, y: top, scale: size / 24, borderColor: hex(PALETTE[color]), borderWidth: 1.4 / (size / 24) });
  };

  /**
   * Places items from the current position, breaking pages between them. `background` paints each page's
   * slice before its content (cards that continue on the next page keep their frame).
   */
  const place = async (items: Item[], options: { padTop?: number; padBottom?: number; background?: (target: PDFPage, top: number, height: number) => void } = {}) => {
    const padTop = options.padTop ?? 0;
    const padBottom = options.padBottom ?? 0;
    let index = 0;
    while (index < items.length) {
      const available = y - bottom - padTop - padBottom;
      let used = 0;
      let end = index;
      while (end < items.length && used + items[end].height <= available) {
        used += items[end].height;
        end += 1;
      }
      if (end === index) {
        const freshTop = PAGE.height - PAGE.margin - 40;
        if (y < freshTop) {
          await newPage();
          continue;
        }
        // Taller than a whole page (should not happen: blocks are cut small): drawn as is.
        used = items[index].height;
        end = index + 1;
      }
      options.background?.(page, y, used + padTop + padBottom);
      let top = y - padTop;
      for (let i = index; i < end; i += 1) {
        await items[i].draw(page, top);
        top -= items[i].height;
      }
      y = top - padBottom;
      index = end;
      if (index < items.length) await newPage();
    }
  };

  // ---- Bloques ----

  /** First page: the clinic (logo or initials, name, specialty), a status badge, the title and subtitle. */
  const drawBrand = async (options: { title: string; subtitle: string; badge?: Badge }) => {
    await prepareFonts([input.clinicName, input.clinicTagline ?? "", options.badge?.text ?? ""].join(" "));
    const top = y;
    const LOGO = 50;
    const badgeWidth = options.badge ? Math.min(170, Math.max(90, widthOf(options.badge.text, { size: 7, bold: true, tracking: 0.9, upper: true }) + 26)) : 0;
    const logoLeft = PAGE.margin;
    let drewLogo = false;
    if (input.logoDataUrl) {
      try {
        const bytes = Buffer.from(input.logoDataUrl.split(",")[1] ?? "", "base64");
        const png = await sharp(bytes, { limitInputPixels: 25_000_000 }).png().toBuffer();
        const logo = await pdf.embedPng(png);
        const scale = Math.min(LOGO / logo.width, LOGO / logo.height);
        const width = logo.width * scale;
        const height = logo.height * scale;
        page.drawImage(logo, { x: mx(logoLeft + (LOGO - width) / 2, width), y: top - (LOGO + height) / 2, width, height });
        drewLogo = true;
      } catch {
        /* an unreadable logo falls back to the initials */
      }
    }
    if (!drewLogo) {
      const cx = mx(logoLeft, LOGO) + LOGO / 2;
      page.drawCircle({ x: cx, y: top - LOGO / 2, size: LOGO / 2, color: hex("#E3EEFC"), borderColor: hex(PALETTE.softLine), borderWidth: 0.6 });
      const initials = clinicInitials(input.clinicName);
      if (needsImage(initials)) {
        const items = await prepare(initials, { size: 16, bold: true, color: "navy", rtl: false }, logoLeft, LOGO, "center");
        const h = heightOf(items);
        for (const item of items) await item.draw(page, top - (LOGO - h) / 2);
      } else {
        const w = widthOf(initials, { size: 17, bold: true });
        drawRuns(page, initials, cx - w / 2, top - LOGO / 2 - 6, { size: 17, bold: true, color: "navy" });
      }
    }
    const nameLeft = logoLeft + LOGO + 14;
    const nameWidth = contentWidth - LOGO - 14 - (badgeWidth ? badgeWidth + 12 : 0);
    const nameItems = await prepare(input.clinicName, { size: 17, bold: true, color: "navy", lineHeight: 1.2 }, nameLeft, nameWidth);
    const tagItems = input.clinicTagline ? await prepare(input.clinicTagline, { size: 7.5, bold: true, color: "muted", tracking: 1.1, upper: true }, nameLeft, nameWidth) : [];
    const blockHeight = heightOf(nameItems) + (tagItems.length ? heightOf(tagItems) + 2 : 0);
    let cursor = top - Math.max(0, (LOGO - blockHeight) / 2);
    for (const item of nameItems) {
      await item.draw(page, cursor);
      cursor -= item.height;
    }
    cursor -= 2;
    for (const item of tagItems) {
      await item.draw(page, cursor);
      cursor -= item.height;
    }
    if (options.badge) {
      const fill: Tone = options.badge.tone === "internal" ? "internal" : "soft";
      const ink: Tone = options.badge.tone === "internal" ? "internalInk" : "navy";
      const left = mx(PAGE.width - PAGE.margin - badgeWidth, badgeWidth);
      roundRect(page, left, top - 8, badgeWidth, 20, 10, fill, options.badge.tone === "internal" ? "internalInk" : "softLine", 0.6);
      const items = await prepare(options.badge.text, { size: 7, bold: true, color: ink, tracking: 0.9, upper: true }, rtl ? PAGE.width - left - badgeWidth + 6 : left + 6, badgeWidth - 12, "center");
      const h = heightOf(items);
      for (const item of items) await item.draw(page, top - 8 - (20 - h) / 2 + 1);
    }
    y = Math.min(top - LOGO, cursor) - 22;

    const titleItems = await prepare(options.title, { size: 25, bold: true, color: "navy", lineHeight: 1.15 }, PAGE.margin, contentWidth);
    await place(titleItems);
    y -= 2;
    await place(await prepare(options.subtitle, { size: 8, bold: true, color: "blue", tracking: 1.6, upper: true }, PAGE.margin, contentWidth));
    y -= 8;
    rule(page, y);
    y -= 14;
  };

  const cover = async (options: { title: string; subtitle: string; badge?: Badge }) => {
    brand = options;
    await drawBrand(options);
  };

  /** Identification row: label over value, in columns divided by thin lines. Empty values are left out by the caller. */
  const fields = async (list: Field[], columns = Math.min(5, Math.max(1, list.length))) => {
    for (let start = 0; start < list.length; start += columns) {
      const row = list.slice(start, start + columns);
      const columnWidth = contentWidth / columns;
      const cells = [];
      for (const [index, field] of row.entries()) {
        const left = PAGE.margin + index * columnWidth + (index ? 10 : 0);
        const width = columnWidth - (index ? 20 : 10);
        const label = await prepare(field.label, { size: 8, bold: true, color: "navy" }, left, width);
        const value = await prepare(field.value, { size: 9.5, color: "ink" }, left, width);
        cells.push({ label, value, height: heightOf(label) + 2 + heightOf(value) });
      }
      const height = Math.max(...cells.map((cell) => cell.height));
      await ensure(height + 8);
      const top = y;
      for (const [index, cell] of cells.entries()) {
        let cursor = top;
        for (const item of cell.label) {
          await item.draw(page, cursor);
          cursor -= item.height;
        }
        cursor -= 2;
        for (const item of cell.value) {
          await item.draw(page, cursor);
          cursor -= item.height;
        }
        if (index > 0) {
          const x = mx(PAGE.margin + index * columnWidth, 0);
          page.drawLine({ start: { x, y: top + 2 }, end: { x, y: top - height - 2 }, thickness: 0.6, color: hex(PALETTE.line) });
        }
      }
      y = top - height - 10;
    }
    rule(page, y + 2);
    y -= 12;
  };

  type Paragraph = { text: string; style?: TextStyle };

  const INDENT = 30;

  /** A titled block with a line icon; the title never stays alone at the bottom of a page. */
  const section = async (options: { icon: IconName; title: string; paragraphs: Paragraph[]; gap?: number }) => {
    const left = PAGE.margin + INDENT;
    const width = contentWidth - INDENT;
    const titleItems = await prepare(options.title, { size: 11.5, bold: true, color: "navy" }, left, width);
    const body: Item[] = [];
    for (const paragraph of options.paragraphs) {
      const items = await prepare(paragraph.text, { size: 9.5, color: "ink", ...paragraph.style }, left, width);
      if (body.length && items.length) body.push({ height: 4, draw: () => undefined });
      body.push(...items);
    }
    const head: Item = {
      height: heightOf(titleItems) + 3,
      draw: async (target, top) => {
        icon(target, options.icon, mx(PAGE.margin + 2, 16), top + 1, 17);
        let cursor = top;
        for (const item of titleItems) {
          await item.draw(target, cursor);
          cursor -= item.height;
        }
      },
    };
    await ensure(head.height + heightOf(body.slice(0, 3)));
    await place([head, ...body]);
    y -= options.gap ?? 14;
  };

  /** The highlighted block (e.g. the professional's assessment): a soft blue frame that continues across pages. */
  const card = async (options: { icon: IconName; title: string; paragraphs: Paragraph[]; tone?: "soft" | "internal" }) => {
    const PAD = 14;
    const left = PAGE.margin + PAD + INDENT;
    const width = contentWidth - PAD * 2 - INDENT;
    const titleItems = await prepare(options.title, { size: 12.5, bold: true, color: options.tone === "internal" ? "internalInk" : "navy" }, left, width);
    const body: Item[] = [];
    for (const paragraph of options.paragraphs) {
      const items = await prepare(paragraph.text, { size: 10, color: "ink", ...paragraph.style }, left, width);
      if (body.length && items.length) body.push({ height: 5, draw: () => undefined });
      body.push(...items);
    }
    const head: Item = {
      height: heightOf(titleItems) + 5,
      draw: async (target, top) => {
        icon(target, options.icon, mx(PAGE.margin + PAD, 20), top + 2, 20, options.tone === "internal" ? "internalInk" : "blue");
        let cursor = top;
        for (const item of titleItems) {
          await item.draw(target, cursor);
          cursor -= item.height;
        }
      },
    };
    await ensure(head.height + heightOf(body.slice(0, 3)) + PAD * 2);
    await place([head, ...body], {
      padTop: PAD,
      padBottom: PAD,
      background: (target, top, height) => roundRect(target, PAGE.margin, top, contentWidth, height, 10, options.tone === "internal" ? "internal" : "soft", options.tone === "internal" ? "internalInk" : "softLine", 0.6),
    });
    y -= 16;
  };

  /** Small print (notices), in the muted color. */
  const note = async (value: string, options: { icon?: IconName } = {}) => {
    const left = PAGE.margin + (options.icon ? 20 : 0);
    const width = contentWidth - (options.icon ? 20 : 0);
    const items = await prepare(value, { size: 8, color: "muted" }, left, width);
    if (!items.length) return;
    if (options.icon) {
      const first = items[0];
      const draw = first.draw;
      items[0] = { height: first.height, draw: async (target, top) => { icon(target, options.icon!, mx(PAGE.margin, 12), top + 1, 12, "muted"); await draw(target, top); } };
    }
    await ensure(heightOf(items.slice(0, 2)));
    await place(items);
    y -= 8;
  };

  /** Re-encodes a photo for the PDF: upright (EXIF orientation applied), never mirrored or cropped. */
  const photoImage = async (bytes: Buffer, maxSide = 1400): Promise<PDFImage | null> => {
    try {
      const jpeg = await sharp(bytes, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 82 })
        .toBuffer();
      return await pdf.embedJpg(jpeg);
    } catch {
      return null;
    }
  };

  /** Draws an image inside a box, whole and with its own proportions, centred; returns the size drawn. */
  const fitImage = (target: PDFPage, image: PDFImage, left: number, top: number, width: number, height: number) => {
    const scale = Math.min(width / image.width, height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    target.drawImage(image, { x: left + (width - w) / 2, y: top - (height - h) / 2 - h, width: w, height: h });
    return { width: w, height: h };
  };

  /** Photos in a grid; each photo keeps its caption on the same page. A missing photo is shown as such, never replaced. */
  const photoGrid = async (cells: PhotoCell[], options: { columns?: number; imageHeight?: number } = {}) => {
    const columns = options.columns ?? 3;
    const GAP = 12;
    const columnWidth = (contentWidth - GAP * (columns - 1)) / columns;
    const imageHeight = options.imageHeight ?? Math.round(columnWidth * 0.9);
    for (let start = 0; start < cells.length; start += columns) {
      const row = cells.slice(start, start + columns);
      const prepared = [];
      for (const [index, cell] of row.entries()) {
        const left = PAGE.margin + index * (columnWidth + GAP);
        const image = cell.bytes ? await photoImage(cell.bytes) : null;
        const caption: Item[] = [];
        for (const line of cell.lines) caption.push(...(await prepare(line.text, { size: 8.5, color: "ink", ...line.style }, left + 2, columnWidth - 4)));
        const empty = image ? [] : await prepare(cell.emptyText ?? "", { size: 8.5, color: "muted" }, left + 8, columnWidth - 16, "center");
        prepared.push({ left, image, caption, empty });
      }
      const rowHeight = imageHeight + 6 + Math.max(0, ...prepared.map((cell) => heightOf(cell.caption)));
      await ensure(rowHeight + 4);
      const top = y;
      for (const cell of prepared) {
        const boxLeft = mx(cell.left, columnWidth);
        roundRect(page, boxLeft, top, columnWidth, imageHeight, 6, cell.image ? "white" : "soft", "line", 0.6);
        if (cell.image) fitImage(page, cell.image, boxLeft + 3, top - 3, columnWidth - 6, imageHeight - 6);
        else {
          let cursor = top - imageHeight / 2 + heightOf(cell.empty) / 2;
          for (const item of cell.empty) {
            await item.draw(page, cursor);
            cursor -= item.height;
          }
        }
        let cursor = top - imageHeight - 6;
        for (const item of cell.caption) {
          await item.draw(page, cursor);
          cursor -= item.height;
        }
      }
      y = top - rowHeight - 10;
    }
  };

  /** A row of counters (total boxes). */
  const stats = async (boxes: Array<{ icon: IconName; label: string; value: string; detail?: string }>) => {
    const GAP = 10;
    const width = (contentWidth - GAP * (boxes.length - 1)) / boxes.length;
    const prepared = [];
    for (const [index, box] of boxes.entries()) {
      const left = PAGE.margin + index * (width + GAP) + 38;
      const label = await prepare(box.label, { size: 9, bold: true, color: "navy" }, left, width - 46);
      const value = await prepare(box.value, { size: 20, bold: true, color: "navy", lineHeight: 1.15 }, left, width - 46);
      const detail = box.detail ? await prepare(box.detail, { size: 7.5, color: "muted" }, left, width - 46) : [];
      prepared.push({ index, box, label, value, detail, height: heightOf(label) + heightOf(value) + heightOf(detail) });
    }
    const height = Math.max(...prepared.map((p) => p.height)) + 22;
    await ensure(height + 6);
    const top = y;
    for (const p of prepared) {
      const left = mx(PAGE.margin + p.index * (width + GAP), width);
      roundRect(page, left, top, width, height, 8, "white", "softLine", 0.7);
      icon(page, p.box.icon, rtl ? left + width - 30 : left + 12, top - 12, 18);
      let cursor = top - 11;
      for (const item of [...p.label, ...p.value, ...p.detail]) {
        await item.draw(page, cursor);
        cursor -= item.height;
      }
    }
    y = top - height - 14;
  };

  /** A table whose header row is repeated whenever it continues on a new page. Left-to-right only (internal report). */
  const table = async (columns: Array<{ label: string; width: number }>, rows: string[][], options: { empty?: string } = {}) => {
    const total = columns.reduce((sum, column) => sum + column.width, 0);
    const widths = columns.map((column) => (column.width / total) * contentWidth);
    const lefts = widths.map((_, index) => PAGE.margin + widths.slice(0, index).reduce((sum, w) => sum + w, 0));
    const PAD = 6;
    const drawHeader = async () => {
      const cells = await Promise.all(columns.map((column, index) => prepare(column.label, { size: 8.5, bold: true, color: "navy" }, lefts[index] + PAD, widths[index] - PAD * 2)));
      const height = Math.max(...cells.map(heightOf)) + PAD * 2;
      const top = y;
      page.drawRectangle({ x: PAGE.margin, y: top - height, width: contentWidth, height, color: hex(PALETTE.soft), borderColor: hex(PALETTE.softLine), borderWidth: 0.6 });
      for (const cell of cells) {
        let cursor = top - PAD;
        for (const item of cell) {
          await item.draw(page, cursor);
          cursor -= item.height;
        }
      }
      y = top - height;
    };
    await ensure(60);
    await drawHeader();
    if (!rows.length && options.empty) {
      const items = await prepare(options.empty, { size: 9, color: "muted" }, PAGE.margin + PAD, contentWidth - PAD * 2);
      const top = y - PAD;
      for (const item of items) await item.draw(page, top);
      y = top - heightOf(items) - PAD;
      rule(page, y);
    }
    for (const row of rows) {
      const cells = await Promise.all(row.map((value, index) => prepare(value || "—", { size: 9, color: "ink" }, lefts[index] + PAD, widths[index] - PAD * 2)));
      const height = Math.max(...cells.map(heightOf)) + PAD * 2;
      if (y - height < bottom) {
        await newPage();
        await drawHeader();
      }
      const top = y;
      for (const cell of cells) {
        let cursor = top - PAD;
        for (const item of cell) {
          await item.draw(page, cursor);
          cursor -= item.height;
        }
      }
      y = top - height;
      rule(page, y);
    }
    y -= 14;
  };

  /** Footer on every page (Clinivista, small, and «Página n de m»), then the file. */
  const finish = async (pageLabel: (current: number, total: number) => string = labels.page) => {
    const logo = await pdf.embedPng(Buffer.from(CLINIVISTA_LOGO_PNG_B64, "base64"));
    const pages = pdf.getPages();
    const logoHeight = 13;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    const tagline = "REGISTRO FOTOGRÁFICO CLÍNICO";
    const taglineStyle: TextStyle = { size: 5.6, bold: true, color: "muted", tracking: 1 };
    for (const [index, current] of pages.entries()) {
      const lineY = PAGE.margin + 18;
      rule(current, lineY);
      const base = PAGE.margin - 2;
      current.drawImage(logo, { x: mx(PAGE.margin, logoWidth), y: base, width: logoWidth, height: logoHeight });
      const taglineWidth = widthOf(tagline, taglineStyle);
      drawRuns(current, tagline, mx(PAGE.margin + logoWidth + 12, taglineWidth), base + 4, taglineStyle);
      const label = pageLabel(index + 1, pages.length);
      const items = await prepare(label, { size: 7.5, color: "muted" }, PAGE.margin + contentWidth / 2, contentWidth / 2, "end");
      for (const item of items) await item.draw(current, base + logoHeight - 2);
    }
    return Buffer.from(await pdf.save());
  };

  return {
    pdf, labels, language, rtl, PAGE, contentWidth,
    getY: () => y, setY: (value: number) => { y = value; }, getPage: () => page,
    prepare, place, ensure, newPage, rule, roundRect, icon, mx, heightOf, photoImage, fitImage, widthOf,
    cover, fields, section, card, note, photoGrid, stats, table, finish,
  };
}

export type ReportWriter = Awaited<ReturnType<typeof createReportWriter>>;

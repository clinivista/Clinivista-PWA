import { rgb, type PDFImage } from "pdf-lib";
import { LANDSCAPE, createReportWriter, formatDate, type Item } from "./report-writer";
import { EVOLUTION_TEXT } from "./evolution-i18n";
import { REPORT_TEXT } from "./report-i18n";
import { toPdfLanguage } from "./result-pdf-i18n";
import type { SpecialtyId } from "./specialties";

export type EvolutionPdfCell = { phaseKey?: string; phaseName: string; date: Date | null; bytes: Buffer | null; edited: boolean };
export type EvolutionPdfZone = { label: string; cells: EvolutionPdfCell[] };

export type EvolutionPdfInput = {
  clinicName: string;
  logoDataUrl: string | null;
  specialty?: SpecialtyId | null;
  patientName: string;
  documentId: string;
  generatedAt: Date;
  /** The stages in the order of the process (columns). Without it, the order the cells come in. */
  phases?: Array<{ key: string; name: string }>;
  zones: EvolutionPdfZone[];
  language?: string | null;
};

const PHASES_PER_BAND = 5;
const LABEL_COLUMN = 104;
const IMAGE_HEIGHT = 112;
const HEADER_HEIGHT = 24;
const GAP = 8;
// Stage headers: the same soft blue as the cards.
const hexSoft = rgb(0xee / 255, 0xf4 / 255, 0xfd / 255);
const hexLine = rgb(0xc6 / 255, 0xd6 / 255, 0xee / 255);

/**
 * Informe de evolución (A4 apaisado): una fila por posición y una columna por etapa, en orden cronológico.
 * Cada foto se muestra entera, sin reflejar ni deformar; si a una posición le falta la toma de una etapa,
 * la celda lo dice («Sin toma comparable») en vez de rellenarla. Con muchas etapas, las columnas siguen en
 * otra franja, y el encabezado de etapas se repite en cada página.
 */
export async function buildEvolutionPdf(input: EvolutionPdfInput): Promise<Buffer> {
  const language = toPdfLanguage(input.language);
  const text = EVOLUTION_TEXT[language];
  const report = REPORT_TEXT[language];
  const writer = await createReportWriter({
    clinicName: input.clinicName,
    logoDataUrl: input.logoDataUrl,
    clinicTagline: input.specialty ? report.specialty[input.specialty] : undefined,
    language,
    documentTitle: report.evolutionTitle,
    subject: input.patientName,
    page: LANDSCAPE,
  });
  const { labels, PAGE, contentWidth, rtl } = writer;
  const day = (value: Date) => formatDate(value, labels.locale, "medium");

  // Columns: the stages in process order; a cell is matched to its stage by key (or by name in older callers).
  const keyOf = (cell: EvolutionPdfCell) => cell.phaseKey ?? cell.phaseName;
  const phases = input.phases?.length
    ? input.phases.filter((phase) => input.zones.some((zone) => zone.cells.some((cell) => keyOf(cell) === phase.key)))
    : [...new Map(input.zones.flatMap((zone) => zone.cells.map((cell) => [keyOf(cell), { key: keyOf(cell), name: cell.phaseName }] as const))).values()];

  const dates = input.zones.flatMap((zone) => zone.cells.map((cell) => cell.date)).filter((date): date is Date => date instanceof Date).sort((a, b) => a.getTime() - b.getTime());
  const period = dates.length ? (day(dates[0]) === day(dates[dates.length - 1]) ? day(dates[0]) : `${day(dates[0])} – ${day(dates[dates.length - 1])}`) : "";

  await writer.cover({ title: report.evolutionTitle, subtitle: report.evolutionSubtitle });
  await writer.fields([
    { label: labels.patient, value: input.patientName },
    ...(input.documentId ? [{ label: labels.documentId, value: input.documentId }] : []),
    ...(period ? [{ label: report.period, value: period }] : []),
    { label: report.issued, value: formatDate(input.generatedAt, labels.locale) },
  ]);
  await writer.section({ icon: "image", title: report.comparisonTitle, paragraphs: [{ text: text.intro, style: { color: "muted" } }], gap: 8 });

  const images = new Map<Buffer, PDFImage | null>();
  const imageOf = async (bytes: Buffer) => {
    if (!images.has(bytes)) images.set(bytes, await writer.photoImage(bytes, 1000));
    return images.get(bytes) ?? null;
  };
  const drawItems = async (items: Item[], top: number) => {
    let cursor = top;
    for (const item of items) {
      await item.draw(writer.getPage(), cursor);
      cursor -= item.height;
    }
  };

  for (let start = 0; start < phases.length; start += PHASES_PER_BAND) {
    const band = phases.slice(start, start + PHASES_PER_BAND);
    // Same column width in every band, so a last band with fewer stages does not stretch its photos' frames.
    const perBand = Math.min(phases.length, PHASES_PER_BAND);
    const columnWidth = (contentWidth - LABEL_COLUMN - GAP * perBand) / perBand;
    const columnLeft = (index: number) => PAGE.margin + LABEL_COLUMN + GAP + index * (columnWidth + GAP);

    /** The stage headers (arrow-shaped labels), repeated at the top of every page the grid runs onto. */
    const header = async () => {
      const top = writer.getY();
      const positionLabel = await writer.prepare(report.position, { size: 8, bold: true, color: "muted", tracking: 0.6, upper: true }, PAGE.margin, LABEL_COLUMN - 6);
      await drawItems(positionLabel, top - (HEADER_HEIGHT - writer.heightOf(positionLabel)) / 2);
      for (const [index, phase] of band.entries()) {
        const left = writer.mx(columnLeft(index), columnWidth);
        const w = columnWidth;
        const h = HEADER_HEIGHT;
        const shape = rtl ? `M 8 0 H ${w} L ${w - 8} ${h / 2} L ${w} ${h} H 8 L 0 ${h / 2} Z` : `M 0 0 H ${w - 8} L ${w} ${h / 2} L ${w - 8} ${h} H 0 L 8 ${h / 2} Z`;
        writer.getPage().drawSvgPath(shape, { x: left, y: top, color: hexSoft, borderColor: hexLine, borderWidth: 0.6 });
        const name = await writer.prepare(phase.name, { size: 8.5, bold: true, color: "navy" }, columnLeft(index) + 10, columnWidth - 20, "center");
        await drawItems(name.slice(0, 2), top - (h - writer.heightOf(name.slice(0, 2))) / 2);
      }
      writer.setY(top - HEADER_HEIGHT - 8);
    };

    await writer.ensure(HEADER_HEIGHT + 8 + IMAGE_HEIGHT + 30);
    await header();
    for (const zone of input.zones) {
      const captions = [];
      for (const [index, phase] of band.entries()) {
        const cell = zone.cells.find((candidate) => keyOf(candidate) === phase.key) ?? null;
        const detail = cell ? [cell.date ? day(cell.date) : "", cell.edited ? text.edited : ""].filter(Boolean).join(" · ") : "";
        captions.push({
          cell,
          caption: detail ? await writer.prepare(detail, { size: 7.5, color: "muted" }, columnLeft(index), columnWidth, "center") : [],
          missing: cell?.bytes ? [] : await writer.prepare(cell ? text.noPhoto : report.noComparable, { size: 8, color: "muted" }, columnLeft(index) + 6, columnWidth - 12, "center"),
        });
      }
      const zoneLabel = await writer.prepare(zone.label, { size: 9, bold: true, color: "navy" }, PAGE.margin, LABEL_COLUMN - 6);
      const rowHeight = Math.max(IMAGE_HEIGHT + 4 + Math.max(0, ...captions.map((c) => writer.heightOf(c.caption))), writer.heightOf(zoneLabel));
      if (writer.getY() - rowHeight < PAGE.margin + 34 + 4) {
        await writer.newPage();
        await header();
      }
      const top = writer.getY();
      await drawItems(zoneLabel, top - (IMAGE_HEIGHT - writer.heightOf(zoneLabel)) / 2);
      for (const [index, entry] of captions.entries()) {
        const left = writer.mx(columnLeft(index), columnWidth);
        const image = entry.cell?.bytes ? await imageOf(entry.cell.bytes) : null;
        writer.roundRect(writer.getPage(), left, top, columnWidth, IMAGE_HEIGHT, 6, image ? "white" : "soft", "line", 0.6);
        if (image) writer.fitImage(writer.getPage(), image, left + 3, top - 3, columnWidth - 6, IMAGE_HEIGHT - 6);
        else await drawItems(entry.missing, top - (IMAGE_HEIGHT - writer.heightOf(entry.missing)) / 2);
        await drawItems(entry.caption, top - IMAGE_HEIGHT - 4);
      }
      writer.setY(top - rowHeight - 12);
    }
    writer.setY(writer.getY() - 6);
  }

  // Cronología: each stage with the dates of its photos and how many there are.
  const chronology = phases.map((phase) => {
    const cells = input.zones.flatMap((zone) => zone.cells.filter((cell) => keyOf(cell) === phase.key && cell.bytes));
    const when = cells.map((cell) => cell.date).filter((date): date is Date => date instanceof Date).sort((a, b) => a.getTime() - b.getTime());
    const range = when.length ? (day(when[0]) === day(when[when.length - 1]) ? day(when[0]) : `${day(when[0])} – ${day(when[when.length - 1])}`) : "";
    return { text: [phase.name, range, report.photoCount(cells.length)].filter(Boolean).join(" · ") };
  });
  await writer.section({ icon: "calendar", title: report.chronologyTitle, paragraphs: chronology });
  await writer.note(text.notice, { icon: "info" });
  return writer.finish();
}

import { createReportWriter, formatDate } from "./report-writer";
import { REPORT_TEXT } from "./report-i18n";
import { toPdfLanguage } from "./result-pdf-i18n";
import type { SpecialtyId } from "./specialties";

export type DischargePhase = {
  name: string;
  state: "done" | "skipped" | "open";
  /** The day it was attended or photographed, or the day the diagnosis was issued. */
  date: Date | null;
  /** Diagnosis stage: who issued it. */
  issuedBy?: string | null;
};

export type DischargePdfInput = {
  clinicName: string;
  logoDataUrl: string | null;
  specialty?: SpecialtyId | null;
  patientName: string;
  documentId: string;
  dischargedAt: Date;
  dischargedByName: string;
  dischargeNote: string;
  phases: DischargePhase[];
  /** Photos of the last stage recorded after the diagnosis, when there is one. */
  finalPhotos: Array<{ label: string; stage: string; date: Date | null; bytes: Buffer }>;
  issuedAt?: Date;
  language?: string | null;
};

export class DischargeError extends Error {
  constructor(message: string, readonly status: 404 = 404) {
    super(message);
  }
}

/**
 * Alta médica: documenta el cierre registrado por el médico (quién, cuándo y su nota), el recorrido por las
 * etapas tal como quedó registrado y, si existen, las fotos de la última etapa. No infiere resultados:
 * «completó todas las etapas» solo aparece si de verdad todas quedaron completas.
 */
export async function buildDischargePdf(input: DischargePdfInput): Promise<Buffer> {
  const language = toPdfLanguage(input.language);
  const text = REPORT_TEXT[language];
  const writer = await createReportWriter({
    clinicName: input.clinicName,
    logoDataUrl: input.logoDataUrl,
    clinicTagline: input.specialty ? text.specialty[input.specialty] : undefined,
    language,
    documentTitle: text.dischargeTitle,
    subject: input.patientName,
  });
  const { labels } = writer;
  const date = (value: Date) => formatDate(value, labels.locale);
  const by = input.dischargedByName.trim();

  await writer.cover({ title: text.dischargeTitle, subtitle: text.dischargeSubtitle, badge: { text: text.dischargeBadge, tone: "ok" } });
  await writer.fields([
    { label: labels.patient, value: input.patientName },
    ...(input.documentId ? [{ label: labels.documentId, value: input.documentId }] : []),
    { label: text.dischargeDate, value: date(input.dischargedAt) },
    ...(by ? [{ label: text.dischargedBy, value: by }] : []),
    { label: text.issued, value: date(input.issuedAt ?? new Date()) },
  ]);

  const allDone = input.phases.length > 0 && input.phases.every((phase) => phase.state === "done");
  await writer.card({
    icon: "check",
    title: text.closureTitle,
    paragraphs: [
      { text: by ? text.closureBy(by, date(input.dischargedAt)) : text.closureNoName(date(input.dischargedAt)) },
      ...(allDone ? [{ text: text.allPhasesDone }] : []),
    ],
  });

  if (input.dischargeNote.trim()) {
    await writer.section({ icon: "document", title: text.noteTitle, paragraphs: [{ text: input.dischargeNote.trim() }] });
  }

  if (input.phases.length) {
    await writer.section({
      icon: "list",
      title: text.processTitle,
      paragraphs: input.phases.map((phase) => {
        const when = phase.date ? formatDate(phase.date, labels.locale, "medium") : "";
        const detail = phase.issuedBy !== undefined && phase.state === "done"
          ? (phase.issuedBy && when ? text.diagnosisIssued(phase.issuedBy, when) : [text.phaseDone, when].filter(Boolean).join(" · "))
          : phase.state === "done" ? [text.phaseDone, when].filter(Boolean).join(" · ")
          : phase.state === "skipped" ? text.phaseSkipped
          : text.phaseOpen;
        return { text: `${phase.name}: ${detail}` };
      }),
    });
  }

  if (input.finalPhotos.length) {
    await writer.ensure(230);
    await writer.section({ icon: "camera", title: text.finalPhotosTitle, paragraphs: [], gap: 6 });
    await writer.photoGrid(input.finalPhotos.map((photo) => ({
      bytes: photo.bytes,
      lines: [
        { text: photo.label, style: { bold: true, color: "navy" } },
        { text: [photo.stage, photo.date ? formatDate(photo.date, labels.locale, "medium") : ""].filter(Boolean).join(" · "), style: { size: 8, color: "muted" as const } },
      ],
    })), { columns: 3, imageHeight: 150 });
  }

  await writer.note(text.dischargeNotice, { icon: "info" });
  return writer.finish();
}

import { createReportWriter, formatDate } from "./report-writer";
import { REPORT_TEXT } from "./report-i18n";
import { toPdfLanguage } from "./result-pdf-i18n";
import type { SpecialtyId } from "./specialties";

export type ResultPdfPhoto = {
  label: string;
  bytes: Buffer;
  annotated: boolean;
  /** Etapa en la que se tomó (p. ej. «Pre-evaluación»), en el idioma del paciente. */
  stage?: string | null;
  date?: Date | null;
  /** Descripción que el propio paciente escribió para esta foto. */
  note?: string | null;
};

export type ResultPdfInput = {
  clinicName: string;
  logoDataUrl: string | null;
  specialty?: SpecialtyId | null;
  patientName: string;
  documentId: string;
  closedAt: Date;
  doctorName: string | null;
  responseText: string;
  photos: ResultPdfPhoto[];
  /** Respuestas de la preevaluación (pregunta y respuesta ya en el idioma del paciente); solo las que tienen respuesta. */
  intake?: Array<{ label: string; value: string }>;
  /** Cita registrada en la ficha, si la hay. */
  appointmentAt?: Date | null;
  issuedAt?: Date;
  /** Idioma del paciente; si falta o no es válido, español. */
  language?: string | null;
};

export { RESULT_NOTICE } from "./result-pdf-notice";

/**
 * Informe de diagnóstico: la valoración del profesional (cerrada y validada) como bloque destacado,
 * los antecedentes que el paciente informó, la cita si existe y sus fotografías, en el idioma del paciente.
 * Solo se genera con el diagnóstico cerrado: el borrador no tiene PDF.
 */
export async function buildResultPdf(input: ResultPdfInput): Promise<Buffer> {
  const language = toPdfLanguage(input.language);
  const text = REPORT_TEXT[language];
  const writer = await createReportWriter({
    clinicName: input.clinicName,
    logoDataUrl: input.logoDataUrl,
    clinicTagline: input.specialty ? text.specialty[input.specialty] : undefined,
    language,
    documentTitle: text.diagnosisTitle,
    subject: input.patientName,
  });
  const { labels } = writer;
  const date = (value: Date) => formatDate(value, labels.locale);

  await writer.cover({ title: text.diagnosisTitle, subtitle: text.diagnosisSubtitle, badge: { text: text.validatedBadge, tone: "ok" } });
  await writer.fields([
    { label: labels.patient, value: input.patientName },
    ...(input.documentId ? [{ label: labels.documentId, value: input.documentId }] : []),
    { label: text.evaluationDate, value: date(input.closedAt) },
    ...(input.doctorName ? [{ label: text.professional, value: input.doctorName }] : []),
    { label: text.issued, value: date(input.issuedAt ?? new Date()) },
  ]);

  await writer.card({
    icon: "document",
    title: text.assessmentTitle,
    paragraphs: [
      { text: input.responseText },
      { text: input.doctorName ? text.assessmentValidated(input.doctorName, date(input.closedAt)) : text.assessmentValidatedNoName(date(input.closedAt)), style: { size: 8.5, color: "muted" } },
    ],
  });

  const intake = (input.intake ?? []).filter((answer) => answer.value.trim());
  if (intake.length) {
    await writer.section({
      icon: "clipboard",
      title: text.reasonTitle,
      paragraphs: [
        ...intake.map((answer) => ({ text: `${answer.label}: ${answer.value}` })),
        { text: text.reasonSource, style: { size: 8, color: "muted" as const } },
      ],
    });
  }

  if (input.appointmentAt && !Number.isNaN(input.appointmentAt.getTime())) {
    await writer.section({ icon: "calendar", title: text.nextTitle, paragraphs: [{ text: text.appointment(date(input.appointmentAt)) }] });
  }

  if (input.photos.length) {
    await writer.ensure(230);
    await writer.section({ icon: "camera", title: text.photoTitle, paragraphs: [], gap: 6 });
    await writer.photoGrid(input.photos.map((photo) => ({
      bytes: photo.bytes,
      lines: [
        { text: photo.label, style: { bold: true, color: "navy" } },
        ...(photo.stage || photo.date ? [{ text: [photo.stage, photo.date ? formatDate(photo.date, labels.locale, "medium") : ""].filter(Boolean).join(" · "), style: { size: 8, color: "muted" as const } }] : []),
        ...(photo.annotated ? [{ text: labels.annotated, style: { size: 8, color: "blue" as const } }] : []),
        ...(photo.note ? [{ text: `${text.patientNote}: ${photo.note}`, style: { size: 8, color: "muted" as const } }] : []),
      ],
    })), { columns: 3, imageHeight: 150 });
  }

  await writer.note(labels.notice, { icon: "info" });
  return writer.finish();
}

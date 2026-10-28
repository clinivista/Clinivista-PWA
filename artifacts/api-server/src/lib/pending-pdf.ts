import { createReportWriter } from "./report-writer";
import type { PendingRow } from "./pending-report";
import type { SpecialtyId } from "./specialties";

// Informe operativo interno del panel «Informe» (en español, como el correo de pendientes): quién espera
// evaluación y a quién le falta el envío del resultado. Sin fotos ni antecedentes clínicos.

const TIME_ZONE = "America/Santiago";
const STATUS_LABEL: Record<string, string> = { listo: "Listo para revisión", contactar: "Listo para contactar", agendado: "Agendado" };
const SPECIALTY_LABEL: Record<SpecialtyId, string> = { capilar: "Medicina capilar", plastica: "Cirugía plástica", dermatologia: "Dermatología" };

export type PendingPdfInput = {
  clinicName: string;
  logoDataUrl: string | null;
  specialty?: SpecialtyId | null;
  cutoff: Date;
  evaluation: PendingRow[];
  undelivered: PendingRow[];
};

const day = (date: Date) => new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: TIME_ZONE }).format(date);
const moment = (date: Date) => new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: TIME_ZONE }).format(date);
const waiting = (days: number) => (days === 0 ? "Hoy" : days === 1 ? "1 día" : `${days} días`);

export async function buildPendingPdf(input: PendingPdfInput): Promise<Buffer> {
  const writer = await createReportWriter({
    clinicName: input.clinicName,
    logoDataUrl: input.logoDataUrl,
    clinicTagline: input.specialty ? SPECIALTY_LABEL[input.specialty] : undefined,
    language: "es",
    documentTitle: "Pacientes pendientes de diagnóstico",
    subject: "Reporte operativo",
  });

  await writer.cover({ title: "Pacientes pendientes de diagnóstico", subtitle: "Reporte operativo", badge: { text: "Uso interno del equipo", tone: "internal" } });
  await writer.fields([
    { label: "Fecha de corte", value: moment(input.cutoff) },
    { label: "Consulta", value: "Pacientes con la preevaluación completa en estado Listo para revisión, Listo para contactar o Agendado. Excluye las fichas de demostración." },
  ], 2);
  await writer.card({
    icon: "shield",
    tone: "internal",
    title: "Uso interno del equipo",
    paragraphs: [{ text: "Contiene datos personales de pacientes para el seguimiento administrativo de la clínica. No es un registro clínico: no lo entregue a pacientes ni a terceros." }],
  });

  const total = input.evaluation.length + input.undelivered.length;
  await writer.stats([
    { icon: "clock", label: "Evaluación pendiente", value: String(input.evaluation.length), detail: "Diagnóstico sin cerrar" },
    { icon: "send", label: "Resultado sin enviar", value: String(input.undelivered.length), detail: "Diagnóstico cerrado sin envío registrado" },
    { icon: "users", label: "Total en la consulta", value: String(total), detail: "Cada paciente cuenta una sola vez" },
  ]);

  await writer.section({ icon: "search", title: "Evaluación pendiente", paragraphs: [{ text: "La preevaluación está completa y el diagnóstico aún no se cierra.", style: { color: "muted", size: 8.5 } }], gap: 6 });
  await writer.table(
    [{ label: "Paciente", width: 30 }, { label: "RUT", width: 16 }, { label: "Ingreso", width: 16 }, { label: "Espera", width: 12 }, { label: "Estado", width: 20 }],
    input.evaluation.map((row) => [row.name, row.documentId, day(row.createdAt), waiting(row.waitingDays), STATUS_LABEL[row.status] ?? row.status]),
    { empty: "No hay pacientes con evaluación pendiente." },
  );

  await writer.section({ icon: "send", title: "Resultado listo, pendiente de envío", paragraphs: [{ text: "El diagnóstico está cerrado y no hay envío registrado por correo ni por WhatsApp.", style: { color: "muted", size: 8.5 } }], gap: 6 });
  await writer.table(
    [{ label: "Paciente", width: 30 }, { label: "RUT", width: 16 }, { label: "Ingreso", width: 16 }, { label: "Diagnóstico cerrado", width: 18 }, { label: "Estado", width: 20 }],
    input.undelivered.map((row) => [row.name, row.documentId, day(row.createdAt), row.closedAt ? day(row.closedAt) : "", STATUS_LABEL[row.status] ?? row.status]),
    { empty: "No hay resultados pendientes de envío." },
  );

  await writer.note("«Espera» cuenta los días desde la última actualización de la ficha; es un dato administrativo y no indica urgencia clínica. Los totales salen de la misma consulta que los listados.", { icon: "info" });
  return writer.finish((current, totalPages) => `Pág. ${current} de ${totalPages}`);
}

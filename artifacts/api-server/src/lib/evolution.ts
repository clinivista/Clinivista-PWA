import type { Lead } from "@workspace/db";
import { logger } from "./logger";
import { privatePhotoStorage } from "./clinical-photo-storage";
import { getLeadPhases, getPhotoForStaff } from "./clinical-photos";
import { clinicIdentity } from "./clinic-identity";
import { getDiagnosisState, readAnnotationFile } from "./diagnosis";
import { buildEvolutionPdf } from "./evolution-pdf";
import { evolutionPhaseName, evolutionZoneName } from "./evolution-i18n";
import { groupEvolutionZones, type EvolutionCell, type EvolutionZone } from "./evolution-zones";
import { MailNotConfiguredError, MailSendError, evolutionMail, sendMail } from "./mailer";

export type { EvolutionCell, EvolutionZone } from "./evolution-zones";

export class EvolutionError extends Error {
  constructor(message: string, readonly status: 400 | 409 | 422 | 502 | 503 = 400) {
    super(message);
  }
}

export async function getEvolution(lead: Lead): Promise<{ phases: Array<{ key: string; name: string; kind: "capture" | "diagnosis" }>; zones: EvolutionZone[] }> {
  const phases = await getLeadPhases(lead);
  const diagnosis = await getDiagnosisState(lead);
  const zones = groupEvolutionZones(phases, diagnosis.photos);
  const used = new Set(zones.flatMap((zone) => zone.cells.map((cell) => cell.phaseKey)));
  return { phases: phases.filter((phase) => used.has(phase.key)).map((phase) => ({ key: phase.key, name: phase.name, kind: phase.kind })), zones };
}

async function readCell(lead: Lead, cell: EvolutionCell): Promise<Buffer | null> {
  try {
    if (cell.edited) return (await readAnnotationFile(lead, cell.photoId))?.bytes ?? null;
    const photo = await getPhotoForStaff(lead, cell.photoId);
    if (!photo) return null;
    return (await privatePhotoStorage.read(photo.derivativeObjectPath ?? photo.originalObjectPath)).bytes;
  } catch {
    return null;
  }
}

/** The comparison as a PDF in the patient's language. `zoneKeys` limits it to some zones; by default every zone that has photos from two or more phases. */
export async function buildEvolutionForLead(lead: Lead, zoneKeys?: string[]): Promise<Buffer> {
  const { zones } = await getEvolution(lead);
  const wanted = zoneKeys?.length ? zones.filter((zone) => zoneKeys.includes(zone.key)) : zones;
  const comparable = wanted.filter((zone) => zone.cells.length >= 2);
  if (!comparable.length) throw new EvolutionError("Aún no hay fotografías de la misma zona en dos fases para comparar.", 409);
  const identity = await clinicIdentity(lead.centerId);
  const pdfZones = [];
  for (const zone of comparable) {
    const cells = [];
    for (const cell of zone.cells) {
      cells.push({
        phaseName: evolutionPhaseName({ key: cell.phaseKey, name: cell.phaseName }, lead.language),
        date: cell.createdAt,
        bytes: await readCell(lead, cell),
        edited: cell.edited,
      });
    }
    pdfZones.push({ label: evolutionZoneName(zone.key, zone.label, lead.language), cells });
  }
  return buildEvolutionPdf({
    clinicName: identity.name,
    logoDataUrl: identity.logoDataUrl,
    patientName: lead.name,
    documentId: lead.documentId ?? "",
    generatedAt: new Date(),
    zones: pdfZones,
    language: lead.language,
  });
}

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

/** Emails the comparison to the patient or to another address the staff types (administration, a referring doctor…). */
export async function sendEvolution(lead: Lead, staff: { userId: string }, input: { to?: string | null; zoneKeys?: string[] }) {
  const patientEmail = (lead.email ?? "").trim();
  const to = (input.to ?? "").trim() || patientEmail;
  if (!to) throw new EvolutionError("El paciente no registró un correo: escribe una dirección.", 422);
  if (to.length > 254 || !EMAIL.test(to)) throw new EvolutionError("El correo no es válido.", 400);
  const pdf = await buildEvolutionForLead(lead, input.zoneKeys);
  const identity = await clinicIdentity(lead.centerId);
  const toPatient = to.toLowerCase() === patientEmail.toLowerCase();
  const mail = evolutionMail({ to, clinicName: identity.name, patientName: lead.name, pdf, filename: "evolucion.pdf", toPatient, language: lead.language });
  try {
    await sendMail(mail);
  } catch (error) {
    const message = error instanceof MailNotConfiguredError || error instanceof MailSendError ? error.message : "No se pudo enviar el correo.";
    throw new EvolutionError(message, error instanceof MailNotConfiguredError ? 503 : 502);
  }
  logger.info({ leadId: lead.id, userId: staff.userId, toPatient }, "Evolution comparison emailed");
  return { status: "sent" as const, recipient: to };
}

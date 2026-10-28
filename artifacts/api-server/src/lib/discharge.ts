import type { Lead } from "@workspace/db";
import { privatePhotoStorage } from "./clinical-photo-storage";
import { getLeadPhases, getPatientPhotoFile } from "./clinical-photos";
import { clinicIdentity } from "./clinic-identity";
import { getDiagnosisState } from "./diagnosis";
import { buildDischargePdf, DischargeError, type DischargePhase } from "./discharge-pdf";
import { evolutionPhaseName, evolutionZoneName, zoneKeyOf } from "./evolution-i18n";
import { isVideoMime } from "./video-upload";

const attentionDay = (value: string | undefined) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00-03:00`) : null);

/** The discharge report of a patient with «alta» status, from what is recorded. Reading it changes nothing. */
export async function buildDischargeForLead(lead: Lead): Promise<Buffer> {
  if (lead.status !== "alta" || !lead.dischargedAt) throw new DischargeError("El paciente no tiene alta médica.");
  const identity = await clinicIdentity(lead.centerId);
  const phases = await getLeadPhases(lead);
  const diagnosis = await getDiagnosisState(lead);
  const diagnosisIndex = phases.findIndex((phase) => phase.kind === "diagnosis");

  const summary: DischargePhase[] = phases.map((phase) => {
    const name = evolutionPhaseName({ key: phase.key, name: phase.name }, lead.language);
    if (phase.kind === "diagnosis") {
      const closed = diagnosis.status === "closed" && diagnosis.closedAt;
      return { name, state: closed || phase.complete ? "done" : phase.skipped ? "skipped" : "open", date: closed ? diagnosis.closedAt : null, issuedBy: closed ? diagnosis.closedByName : null };
    }
    const photoDates = phase.views.map((view) => view.photo?.createdAt).filter((value): value is Date => value instanceof Date).sort((a, b) => b.getTime() - a.getTime());
    return {
      name,
      state: phase.complete ? "done" : phase.skipped ? "skipped" : "open",
      date: phase.complete ? attentionDay(phase.attention?.date) ?? photoDates[0] ?? null : null,
    };
  });

  // Final photos: the last stage after the diagnosis that was completed with photos.
  const finalPhase = [...phases].reverse().find((phase, reversedIndex) => {
    const index = phases.length - 1 - reversedIndex;
    return phase.kind === "capture" && index > diagnosisIndex && diagnosisIndex >= 0 && phase.complete && phase.views.some((view) => view.photo && !isVideoMime(view.photo.mimeType));
  });
  const finalPhotos = [];
  if (finalPhase) {
    const stage = evolutionPhaseName({ key: finalPhase.key, name: finalPhase.name }, lead.language);
    for (const view of finalPhase.views) {
      if (!view.photo || isVideoMime(view.photo.mimeType)) continue;
      const located = await getPatientPhotoFile(lead, view.photo.id, "original");
      if (!located) continue;
      const bytes = await privatePhotoStorage.read(located.objectPath).then((file) => file.bytes).catch(() => null);
      if (!bytes) continue;
      finalPhotos.push({ label: evolutionZoneName(zoneKeyOf(view.key, finalPhase.key), view.label, lead.language), stage, date: view.photo.createdAt ?? null, bytes });
    }
  }

  return buildDischargePdf({
    clinicName: identity.name,
    logoDataUrl: identity.logoDataUrl,
    specialty: identity.specialty,
    patientName: lead.name,
    documentId: lead.documentId ?? "",
    dischargedAt: lead.dischargedAt,
    dischargedByName: lead.dischargedByName ?? "",
    dischargeNote: lead.dischargeNote ?? "",
    phases: summary,
    finalPhotos,
    language: lead.language,
  });
}

import { desc, eq } from "drizzle-orm";
import { db, resultDeliveriesTable, type Lead } from "@workspace/db";
import { uid } from "./helpers";
import { createObjectKey, privatePhotoStorage } from "./clinical-photo-storage";
import { ensureEvaluationForLead, getPatientPhotoFile } from "./clinical-photos";
import { clinicIdentity } from "./clinic-identity";
import { getDiagnosisState, readAnnotationFile } from "./diagnosis";
import { buildResultPdf } from "./result-pdf";
import { MAIL_TEXT, toMailLanguage } from "./mail-i18n";
import { MailNotConfiguredError, MailSendError, resultsMail, sendMail } from "./mailer";

export const RESULT_LINK_DAYS = 30;
export type DeliveryChannel = "email" | "whatsapp";

export class ResultsError extends Error {
  constructor(message: string, readonly status: 400 | 409 | 422 | 502 | 503 = 400) {
    super(message);
  }
}

/** Builds the PDF from the closed diagnosis, using the doctor's annotated image when there is one. */
export async function buildResultsForLead(lead: Lead): Promise<Buffer> {
  const state = await getDiagnosisState(lead);
  if (state.status !== "closed" || !state.closedAt) {
    throw new ResultsError("Cierra el diagnóstico antes de generar los resultados.", 409);
  }
  const identity = await clinicIdentity(lead.centerId);
  const photos = [];
  for (const photo of state.photos) {
    let annotated = false;
    let bytes: Buffer | null = null;
    if (photo.hasAnnotation) {
      const file = await readAnnotationFile(lead, photo.photoId).catch(() => null);
      if (file) {
        bytes = file.bytes;
        annotated = true;
      }
    }
    if (!bytes) {
      const located = await getPatientPhotoFile(lead, photo.photoId, "original");
      if (located) bytes = (await privatePhotoStorage.read(located.objectPath)).bytes;
    }
    if (bytes) photos.push({ label: photo.label, bytes, annotated });
  }
  return buildResultPdf({
    clinicName: identity.name,
    logoDataUrl: identity.logoDataUrl,
    patientName: lead.name,
    documentId: lead.documentId ?? "",
    closedAt: state.closedAt,
    doctorName: state.closedByName,
    responseText: state.responseText,
    photos,
  });
}

/** A phone as the number wa.me expects: digits only, with Chile's 56 when the patient wrote a local number. */
export function whatsappNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length === 9 && digits.startsWith("9")) digits = `56${digits}`;
  else if (digits.length === 10 && digits.startsWith("09")) digits = `56${digits.slice(1)}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export async function deliverResults(
  lead: Lead,
  staff: { userId: string; name: string | null },
  channel: DeliveryChannel,
  baseUrl: string,
) {
  const recipientEmail = (lead.email ?? "").trim();
  const number = whatsappNumber(lead.phone);
  if (channel === "email" && !recipientEmail) throw new ResultsError("El paciente no registró un correo electrónico.", 422);
  if (channel === "whatsapp" && !number) throw new ResultsError("El teléfono del paciente no es válido para WhatsApp.", 422);

  const pdf = await buildResultsForLead(lead);
  const evaluation = await ensureEvaluationForLead(lead);
  const stored = await privatePhotoStorage.put({
    key: createObjectKey({ centerId: evaluation.centerId, evaluationId: evaluation.id, kind: "result", contentType: "application/pdf" }),
    bytes: pdf,
    contentType: "application/pdf",
  });
  const token = uid(24);
  const link = `${baseUrl.replace(/\/+$/, "")}/api/results/${token}`;
  const identity = await clinicIdentity(lead.centerId);
  const row = {
    id: uid(18),
    leadId: lead.id,
    token,
    objectPath: stored.objectPath,
    channel,
    recipient: channel === "email" ? recipientEmail : `+${number}`,
    createdByUserId: staff.userId,
    createdByName: staff.name,
    expiresAt: new Date(Date.now() + RESULT_LINK_DAYS * 24 * 3600 * 1000),
  };

  if (channel === "email") {
    try {
      await sendMail(resultsMail({ to: recipientEmail, clinicName: identity.name, patientName: lead.name, link, language: lead.language }));
    } catch (error) {
      const message = error instanceof MailNotConfiguredError || error instanceof MailSendError ? error.message : "No se pudo enviar el correo.";
      await db.insert(resultDeliveriesTable).values({ ...row, status: "failed", error: message });
      throw new ResultsError(message, error instanceof MailNotConfiguredError ? 503 : 502);
    }
    await db.insert(resultDeliveriesTable).values({ ...row, status: "sent" });
    return { channel, status: "sent" as const, recipient: row.recipient, link, whatsappUrl: null };
  }

  await db.insert(resultDeliveriesTable).values({ ...row, status: "link" });
  const message = MAIL_TEXT[toMailLanguage(lead.language)].whatsapp(lead.name, identity.name, link);
  return { channel, status: "link" as const, recipient: row.recipient, link, whatsappUrl: `https://wa.me/${number}?text=${encodeURIComponent(message)}` };
}

export async function listDeliveries(lead: Lead) {
  const rows = await db.select().from(resultDeliveriesTable)
    .where(eq(resultDeliveriesTable.leadId, lead.id)).orderBy(desc(resultDeliveriesTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    channel: row.channel,
    recipient: row.recipient,
    status: row.status,
    error: row.error,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  }));
}

/** The frozen PDF behind a public link, or null when the link is unknown or expired. */
export async function readDeliveryPdf(token: string): Promise<Buffer | null> {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const [row] = await db.select().from(resultDeliveriesTable).where(eq(resultDeliveriesTable.token, token));
  if (!row || row.status === "failed" || row.expiresAt.getTime() < Date.now()) return null;
  try {
    return (await privatePhotoStorage.read(row.objectPath)).bytes;
  } catch {
    return null;
  }
}

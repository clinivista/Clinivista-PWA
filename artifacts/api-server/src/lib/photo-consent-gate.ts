import { eq } from "drizzle-orm";
import { db, photoConsentsTable, type Lead } from "@workspace/db";

export type PhotoConsentGate = "ok" | "missing" | "pending" | "revoked" | "declined";

export const PHOTO_CONSENT_REQUIRED_MESSAGE =
  "Falta la autorización del paciente para tomar fotografías. Pídela desde su ficha: enlace por correo o WhatsApp, documento firmado o firma en pantalla.";

/**
 * ¿Puede el personal tomar fotografías de este paciente?
 * - Con una autorización aceptada y no revocada: sí.
 * - Fichas que nunca tuvieron una autorización registrada: sí si el paciente dio su consentimiento de la ficha
 *   (el que cubre «datos y fotografías»: el que él marcó al registrarse o el que el personal confirmó), para no
 *   dejar fuera a los pacientes anteriores a esta función.
 * - Si tuvo autorizaciones y ninguna está vigente (pendiente, rechazada o revocada): no.
 */
export async function photoConsentGate(lead: Pick<Lead, "id" | "consent">): Promise<PhotoConsentGate> {
  const rows = await db.select({ status: photoConsentsTable.status }).from(photoConsentsTable).where(eq(photoConsentsTable.leadId, lead.id));
  const relevant = rows.filter((row) => row.status !== "cancelled");
  if (relevant.some((row) => row.status === "granted")) return "ok";
  if (relevant.length === 0) return lead.consent ? "ok" : "missing";
  if (relevant.some((row) => row.status === "pending")) return "pending";
  return relevant.some((row) => row.status === "revoked") ? "revoked" : "declined";
}

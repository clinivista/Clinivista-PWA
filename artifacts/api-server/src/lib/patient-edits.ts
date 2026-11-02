import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  db, leadsTable, evaluationsTable, diagnosesTable, patientUpdatesTable, patientAdditionsTable, usersTable,
  type Lead, type PatientAddition, type PatientUpdate, type AdditionFile,
} from "@workspace/db";
import { privatePhotoStorage, createObjectKey } from "./clinical-photo-storage";
import { assertCanStore } from "./plan-limits";
import { ensureEvaluationForLead } from "./clinical-photos";
import { uid } from "./helpers";
import crypto from "node:crypto";

/**
 * Mientras la clínica no haya empezado a revisar la evaluación, el paciente puede modificarla.
 * Se considera "en revisión" cuando el estado pasó de «listo» (contactar, agendado, contactado,
 * operado, completado, cerrado, alta) o cuando ya existe un diagnóstico, aunque sea borrador.
 */
const OPEN_STATUSES = new Set(["nuevo", "incompleto", "listo"]);

export async function isEvaluationLocked(lead: Lead): Promise<boolean> {
  if (!OPEN_STATUSES.has(lead.status ?? "nuevo")) return true;
  const [row] = await db.select({ id: diagnosesTable.id }).from(evaluationsTable)
    .innerJoin(diagnosesTable, eq(diagnosesTable.evaluationId, evaluationsTable.id))
    .where(eq(evaluationsTable.leadId, lead.id)).limit(1);
  return Boolean(row);
}

export const LOCKED_MESSAGE = "Tu evaluación ya está en revisión. Puedes enviar información adicional o solicitar una corrección.";

const DATA_FIELDS = ["name", "phone", "documentId", "email", "age", "city", "hairLossTime", "pattern", "previousTreatment", "symptoms", "surgeryHistory", "notes", "deliveryChannel"] as const;

/** Campos que cambiaron entre lo guardado y lo nuevo (valor anterior y nuevo). */
export function changedFields(before: Lead, after: Partial<Lead>): Record<string, { from: string; to: string }> {
  const out: Record<string, { from: string; to: string }> = {};
  for (const key of DATA_FIELDS) {
    const from = String(before[key] ?? "");
    const to = String(after[key] ?? "");
    if (from !== to) out[key] = { from, to };
  }
  const fromClinical = JSON.stringify(before.clinicalData ?? {});
  const toClinical = JSON.stringify(after.clinicalData ?? before.clinicalData ?? {});
  if (fromClinical !== toClinical) out.clinicalData = { from: fromClinical, to: toClinical };
  return out;
}

/** Deja constancia de un cambio del paciente. Solo cuando la evaluación ya se había enviado («listo»). Nunca rompe la operación. */
export async function recordPatientUpdate(lead: Lead, kind: "data" | "photo" | "addition", summary: string, details: Record<string, unknown>): Promise<void> {
  if (kind !== "addition" && lead.status !== "listo") return;
  try {
    await db.insert(patientUpdatesTable).values({ id: uid(), centerId: lead.centerId ?? "default-center", leadId: lead.id, kind, summary: summary.slice(0, 300), details });
  } catch {
    // La tabla puede no existir todavía (SQL pendiente): modificar la evaluación no debe fallar por esto.
  }
}

export const MAX_ADDITIONS_PENDING = 10;
export const MAX_ADDITION_FILES = 4;

export async function createAddition(lead: Lead, note: string): Promise<PatientAddition | null> {
  const centerId = lead.centerId ?? "default-center";
  const pending = await db.select({ id: patientAdditionsTable.id }).from(patientAdditionsTable)
    .where(and(eq(patientAdditionsTable.leadId, lead.id), eq(patientAdditionsTable.status, "pending")));
  if (pending.length >= MAX_ADDITIONS_PENDING) return null;
  const [row] = await db.insert(patientAdditionsTable).values({ id: uid(), centerId, leadId: lead.id, note: note.trim().slice(0, 1000) }).returning();
  await recordPatientUpdate(lead, "addition", "addition", { additionId: row.id });
  return row;
}

export async function addAdditionFile(lead: Lead, additionId: string, image: { contentType: string; bytes: Buffer }): Promise<AdditionFile | "full" | null> {
  const [addition] = await db.select().from(patientAdditionsTable)
    .where(and(eq(patientAdditionsTable.id, additionId), eq(patientAdditionsTable.leadId, lead.id)));
  if (!addition || addition.status !== "pending") return null;
  if (addition.files.length >= MAX_ADDITION_FILES) return "full";
  const evaluation = await ensureEvaluationForLead(lead);
  await assertCanStore(evaluation.centerId);
  const stored = await privatePhotoStorage.put({
    key: createObjectKey({ centerId: evaluation.centerId, evaluationId: evaluation.id, kind: "original", contentType: image.contentType }),
    bytes: image.bytes,
    contentType: image.contentType,
  });
  const file: AdditionFile = { objectPath: stored.objectPath, mimeType: image.contentType, bytes: image.bytes.length, sha256: crypto.createHash("sha256").update(image.bytes).digest("hex") };
  await db.update(patientAdditionsTable).set({ files: [...addition.files, file] }).where(eq(patientAdditionsTable.id, addition.id));
  return file;
}

const publicAddition = (row: PatientAddition) => ({
  id: row.id, note: row.note, status: row.status, createdAt: row.createdAt, resolvedAt: row.resolvedAt, resolvedByName: row.resolvedByName,
  files: row.files.map((file, index) => ({ index, mimeType: file.mimeType, bytes: file.bytes })),
});

/** Lo que el paciente ve de lo que envió: nota, cantidad de archivos y si la clínica ya lo revisó. */
export async function additionsForPatient(lead: Lead) {
  const rows = await db.select().from(patientAdditionsTable).where(eq(patientAdditionsTable.leadId, lead.id)).orderBy(desc(patientAdditionsTable.createdAt));
  return rows.map((row) => ({ id: row.id, note: row.note, status: row.status, createdAt: row.createdAt, fileCount: row.files.length }));
}

export async function updatesForLead(centerId: string, leadId: string) {
  const [updates, additions] = await Promise.all([
    db.select().from(patientUpdatesTable).where(and(eq(patientUpdatesTable.centerId, centerId), eq(patientUpdatesTable.leadId, leadId))).orderBy(desc(patientUpdatesTable.createdAt)),
    db.select().from(patientAdditionsTable).where(and(eq(patientAdditionsTable.centerId, centerId), eq(patientAdditionsTable.leadId, leadId))).orderBy(desc(patientAdditionsTable.createdAt)),
  ]);
  return { updates: updates as PatientUpdate[], additions: additions.map(publicAddition) };
}

/** Pacientes de la clínica con novedades sin revisar: cambios no vistos más adicionales pendientes. */
export async function unseenCounts(centerId: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const updates = await db.select({ leadId: patientUpdatesTable.leadId }).from(patientUpdatesTable)
    .where(and(eq(patientUpdatesTable.centerId, centerId), isNull(patientUpdatesTable.seenAt)));
  for (const row of updates) counts[row.leadId] = (counts[row.leadId] ?? 0) + 1;
  return counts;
}

async function staffName(userId: string): Promise<string> {
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  return user?.name || userId;
}

export async function markUpdatesSeen(centerId: string, leadId: string, userId: string): Promise<void> {
  await db.update(patientUpdatesTable).set({ seenAt: new Date(), seenByName: await staffName(userId) })
    .where(and(eq(patientUpdatesTable.centerId, centerId), eq(patientUpdatesTable.leadId, leadId), isNull(patientUpdatesTable.seenAt)));
}

export async function resolveAddition(centerId: string, leadId: string, additionId: string, userId: string, status: "incorporated" | "dismissed"): Promise<PatientAddition | null> {
  const [row] = await db.update(patientAdditionsTable)
    .set({ status, resolvedAt: new Date(), resolvedByName: await staffName(userId) })
    .where(and(eq(patientAdditionsTable.id, additionId), eq(patientAdditionsTable.centerId, centerId), eq(patientAdditionsTable.leadId, leadId)))
    .returning();
  if (row) await markUpdatesSeen(centerId, leadId, userId);
  return row ?? null;
}

export async function additionFile(centerId: string, leadId: string, additionId: string, index: number) {
  const [row] = await db.select().from(patientAdditionsTable)
    .where(and(eq(patientAdditionsTable.id, additionId), eq(patientAdditionsTable.centerId, centerId), eq(patientAdditionsTable.leadId, leadId)));
  const file = row?.files[index];
  if (!file) return null;
  return privatePhotoStorage.read(file.objectPath).catch(() => null);
}

/** Al eliminar la ficha de un paciente se eliminan también sus novedades y los archivos adicionales. */
export async function deletePatientEditsForLeads(leadIds: string[]): Promise<void> {
  if (!leadIds.length) return;
  try {
    const additions = await db.select().from(patientAdditionsTable).where(inArray(patientAdditionsTable.leadId, leadIds));
    for (const addition of additions) for (const file of addition.files) await privatePhotoStorage.remove(file.objectPath).catch(() => undefined);
    await db.delete(patientAdditionsTable).where(inArray(patientAdditionsTable.leadId, leadIds));
    await db.delete(patientUpdatesTable).where(inArray(patientUpdatesTable.leadId, leadIds));
  } catch {
    // Tablas aún no creadas: no hay nada que borrar.
  }
}

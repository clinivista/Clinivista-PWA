import { and, desc, eq } from "drizzle-orm";
import {
  db, leadsTable, dataRequestsTable, staffAccessEventsTable, evaluationsTable, clinicalPhotosTable, diagnosesTable, usersTable,
  DATA_REQUEST_TYPES, DATA_REQUEST_STATUSES, type DataRequest, type DataRequestType, type DataRequestStatus, type Lead,
} from "@workspace/db";
import { uid } from "./helpers";

/** Plazo legal de respuesta (Ley 21.719, art. 11): 30 días corridos, prorrogable una vez por otros 30. */
export const DATA_REQUEST_DAYS = 30;
const DAY_MS = 24 * 3600 * 1000;

export const isDataRequestType = (value: unknown): value is DataRequestType =>
  typeof value === "string" && (DATA_REQUEST_TYPES as readonly string[]).includes(value);
export const isDataRequestStatus = (value: unknown): value is DataRequestStatus =>
  typeof value === "string" && (DATA_REQUEST_STATUSES as readonly string[]).includes(value);

export async function createDataRequest(lead: Lead, type: DataRequestType, message: string): Promise<DataRequest> {
  const now = Date.now();
  const [row] = await db.insert(dataRequestsTable).values({
    id: uid(), centerId: lead.centerId ?? "default-center", leadId: lead.id, type,
    message: message.trim().slice(0, 1000), status: "pending", dueAt: new Date(now + DATA_REQUEST_DAYS * DAY_MS),
  }).returning();
  return row;
}

/** Solicitudes de una clínica con el nombre del paciente. Primero las pendientes más próximas a vencer. */
export async function listDataRequests(centerId: string) {
  const rows = await db.select({ request: dataRequestsTable, patientName: leadsTable.name, patientEmail: leadsTable.email, patientPhone: leadsTable.phone })
    .from(dataRequestsTable)
    .leftJoin(leadsTable, eq(leadsTable.id, dataRequestsTable.leadId))
    .where(eq(dataRequestsTable.centerId, centerId))
    .orderBy(desc(dataRequestsTable.createdAt));
  const open = (status: string) => status === "pending" || status === "in_progress";
  return rows
    .map(({ request, patientName, patientEmail, patientPhone }) => ({ ...request, patientName: patientName ?? "", patientEmail: patientEmail ?? "", patientPhone: patientPhone ?? "" }))
    .sort((a, b) => Number(open(b.status)) - Number(open(a.status)) || a.dueAt.getTime() - b.dueAt.getTime());
}

export async function updateDataRequest(centerId: string, id: string, userId: string, status: DataRequestStatus, note: string): Promise<DataRequest | null> {
  const [current] = await db.select().from(dataRequestsTable).where(and(eq(dataRequestsTable.id, id), eq(dataRequestsTable.centerId, centerId)));
  if (!current) return null;
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  const done = status === "resolved" || status === "rejected";
  const [row] = await db.update(dataRequestsTable).set({
    status,
    resolutionNote: note.trim().slice(0, 1000),
    resolvedAt: done ? new Date() : null,
    resolvedByName: done ? user?.name || userId : "",
  }).where(eq(dataRequestsTable.id, id)).returning();
  return row;
}

/** Deja constancia de que una persona del personal abrió o exportó una ficha. Nunca rompe la operación principal. */
export async function logStaffAccess(centerId: string, leadId: string, userId: string, action: "view" | "export"): Promise<void> {
  try {
    await db.insert(staffAccessEventsTable).values({ id: uid(), centerId, leadId, userId, action });
  } catch {
    // La tabla puede no existir todavía (SQL pendiente): el acceso a la ficha no debe fallar por esto.
  }
}

export async function accessEventsForLead(centerId: string, leadId: string) {
  return db.select().from(staffAccessEventsTable)
    .where(and(eq(staffAccessEventsTable.centerId, centerId), eq(staffAccessEventsTable.leadId, leadId)))
    .orderBy(desc(staffAccessEventsTable.createdAt));
}

const HIDDEN_KEYS = /(ObjectPath|tokenHash|passwordHash|^token$|patientAccountId)/;
const clean = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([key]) => !HIDDEN_KEYS.test(key)));

/**
 * Paquete de datos de un paciente para atender acceso o portabilidad: sus datos, sus evaluaciones, la lista de
 * fotografías (sin los archivos) y los diagnósticos. Formato JSON, estructurado y de uso común.
 */
export async function exportPatientData(lead: Lead) {
  const evaluations = await db.select().from(evaluationsTable).where(eq(evaluationsTable.leadId, lead.id));
  const photos = [];
  const diagnoses = [];
  for (const evaluation of evaluations) {
    photos.push(...(await db.select().from(clinicalPhotosTable).where(eq(clinicalPhotosTable.evaluationId, evaluation.id))));
    diagnoses.push(...(await db.select().from(diagnosesTable).where(eq(diagnosesTable.evaluationId, evaluation.id))));
  }
  return {
    exportedAt: new Date().toISOString(),
    format: "clinivista-patient-data/1",
    patient: clean(lead as unknown as Record<string, unknown>),
    evaluations: evaluations.map((row) => clean(row as unknown as Record<string, unknown>)),
    photos: photos.map((row) => clean(row as unknown as Record<string, unknown>)),
    diagnoses: diagnoses.map((row) => clean(row as unknown as Record<string, unknown>)),
  };
}

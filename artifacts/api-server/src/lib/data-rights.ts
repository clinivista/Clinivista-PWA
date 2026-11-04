import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db, leadsTable, dataRequestsTable, staffAccessEventsTable, evaluationsTable, clinicalPhotosTable, diagnosesTable, usersTable,
  DATA_REQUEST_TYPES, DATA_REQUEST_STATUSES, type DataRequest, type DataRequestType, type DataRequestStatus, type Lead,
} from "@workspace/db";
import { uid } from "./helpers";
import { sendMail } from "./mailer";
import { logger } from "./logger";
import { updatesForLead } from "./patient-edits";
import { consentsForLead, publicConsent } from "./photo-consents";

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
  const edits = await updatesForLead(lead.centerId ?? "default-center", lead.id).catch(() => ({ updates: [], additions: [] }));
  const photoConsents = await consentsForLead(lead.centerId ?? "default-center", lead.id).catch(() => []);
  return {
    exportedAt: new Date().toISOString(),
    format: "clinivista-patient-data/1",
    patient: clean(lead as unknown as Record<string, unknown>),
    evaluations: evaluations.map((row) => clean(row as unknown as Record<string, unknown>)),
    photos: photos.map((row) => clean(row as unknown as Record<string, unknown>)),
    diagnoses: diagnoses.map((row) => clean(row as unknown as Record<string, unknown>)),
    patientUpdates: edits.updates.map((row) => clean(row as unknown as Record<string, unknown>)),
    patientAdditions: edits.additions,
    photoConsents: photoConsents.map(publicConsent),
  };
}

/** Lo que el paciente puede ver de sus propias solicitudes: tipo, estado, plazo y la respuesta de la clínica. */
export async function requestsForLead(leadId: string) {
  const rows = await db.select().from(dataRequestsTable).where(eq(dataRequestsTable.leadId, leadId)).orderBy(desc(dataRequestsTable.createdAt));
  return rows.map((row) => ({
    id: row.id, type: row.type, status: row.status, createdAt: row.createdAt, dueAt: row.dueAt,
    resolvedAt: row.resolvedAt, resolutionNote: row.resolutionNote,
  }));
}

const REMINDER_DAYS = 7;
const TYPE_LABEL: Record<DataRequestType, string> = {
  access: "acceso", withdrawal: "retiro del consentimiento", rectification: "rectificación", erasure: "eliminación",
  opposition: "oposición", portability: "portabilidad", blocking: "bloqueo temporal",
};

/**
 * Avisa por correo a las personas administrativas de la clínica cuando una solicitud de datos está por vencer
 * (7 días o menos) y cuando ya venció. Cada aviso se envía una sola vez por solicitud. No incluye datos del paciente.
 */
export async function runDataRequestReminders(baseUrl: string | undefined, now = new Date()): Promise<number> {
  const open = await db.select().from(dataRequestsTable).where(inArray(dataRequestsTable.status, ["pending", "in_progress"]));
  let sent = 0;
  for (const request of open) {
    const overdue = request.dueAt.getTime() < now.getTime();
    const stage = overdue ? 2 : request.dueAt.getTime() - now.getTime() <= REMINDER_DAYS * DAY_MS ? 1 : 0;
    if (stage === 0 || stage <= request.reminderStage) continue;
    const staff = await db.select({ email: usersTable.email }).from(usersTable)
      .where(and(eq(usersTable.centerId, request.centerId), eq(usersTable.role, "administrativo"), eq(usersTable.active, true)));
    if (!staff.length) continue;
    const due = request.dueAt.toLocaleDateString("es-CL", { dateStyle: "long", timeZone: "America/Santiago" });
    const label = TYPE_LABEL[request.type as DataRequestType] ?? request.type;
    const subject = overdue ? "Solicitud de datos vencida" : "Solicitud de datos por vencer";
    const link = baseUrl ? `${baseUrl.replace(/\/+$/, "")}/admin` : "";
    const text = `${overdue ? "Venció el plazo de" : "Está por vencer el plazo de"} una solicitud de ${label} de un paciente (fecha límite: ${due}). Revísala en el panel, menú «Solicitudes de datos»${link ? `: ${link}` : "."}`;
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5"><p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p></div>`;
    let delivered = false;
    for (const person of staff) {
      try { await sendMail({ to: person.email, subject, text, html }); delivered = true; }
      catch (err) { logger.error({ err }, "No se pudo enviar el aviso de solicitud de datos"); }
    }
    if (delivered) {
      await db.update(dataRequestsTable).set({ reminderStage: stage }).where(eq(dataRequestsTable.id, request.id));
      sent += 1;
    }
  }
  return sent;
}

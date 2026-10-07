import { and, asc, eq } from "drizzle-orm";
import {
  db,
  diagnosesTable,
  diagnosisEventsTable,
  photoAnnotationsTable,
  usersTable,
  type Lead,
} from "@workspace/db";
import { uid } from "./helpers";
import { createObjectKey, privatePhotoStorage } from "./clinical-photo-storage";
import { ensureEvaluationForLead, getLeadPhases, type PhotoStatus } from "./clinical-photos";

export const MAX_RESPONSE_LENGTH = 8000;
const MAX_STROKES = 400;
const MAX_POINTS = 2000;
const MAX_STROKES_BYTES = 200_000;

export class DiagnosisError extends Error {
  constructor(message: string, readonly status: 400 | 403 | 404 | 409 = 400) {
    super(message);
  }
}

export type Stroke =
  | { type: "pen"; color: string; width: number; points: Array<[number, number]> }
  | { type: "line" | "arrow" | "ellipse"; color: string; width: number; points: [[number, number], [number, number]] }
  | { type: "text"; color: string; width: number; points: [[number, number]]; text: string };

const COLOR = /^#[0-9a-fA-F]{6}$/;
const unit = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const point = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && unit(value[0]) && unit(value[1]);

/** The drawing is stored as vectors in the photo's own 0–1 coordinates, so it can be edited again at any size. */
export function parseStrokes(raw: unknown): Stroke[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_STROKES || JSON.stringify(raw).length > MAX_STROKES_BYTES) return null;
  const strokes: Stroke[] = [];
  for (const item of raw as Array<Record<string, unknown>>) {
    if (!item || typeof item !== "object") return null;
    const { type, color, width, points, text } = item;
    if (typeof color !== "string" || !COLOR.test(color)) return null;
    if (typeof width !== "number" || !Number.isFinite(width) || width < 0.0005 || width > 0.2) return null;
    if (!Array.isArray(points) || !points.every(point)) return null;
    if (type === "pen" && points.length >= 1 && points.length <= MAX_POINTS) {
      strokes.push({ type, color, width, points: points as Array<[number, number]> });
    } else if ((type === "line" || type === "arrow" || type === "ellipse") && points.length === 2) {
      strokes.push({ type, color, width, points: points as [[number, number], [number, number]] });
    } else if (type === "text" && points.length === 1 && typeof text === "string" && text.trim() && text.length <= 200) {
      strokes.push({ type, color, width, points: points as [[number, number]], text });
    } else {
      return null;
    }
  }
  return strokes;
}

export type DiagnosisPhoto = {
  photoId: string;
  viewKey: string;
  label: string;
  note: string | null;
  width: number | null;
  height: number | null;
  hasAnnotation: boolean;
  annotationUpdatedAt: Date | null;
  strokes: Stroke[];
};

export type DiagnosisState = {
  phaseId: string | null;
  status: "draft" | "closed";
  responseText: string;
  closedAt: Date | null;
  closedByName: string | null;
  /** The patient's pre-evaluación is complete, so there is something to diagnose. */
  readyToDiagnose: boolean;
  photos: DiagnosisPhoto[];
  events: Array<{ action: string; actorName: string | null; createdAt: Date }>;
};

async function actorName(userId: string): Promise<string | null> {
  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  return user ? (user.name || user.email) : null;
}

async function findDiagnosis(evaluationId: string) {
  const [diagnosis] = await db.select().from(diagnosesTable).where(eq(diagnosesTable.evaluationId, evaluationId));
  return diagnosis;
}

async function ensureDiagnosis(evaluationId: string) {
  await db.insert(diagnosesTable).values({ id: uid(18), evaluationId }).onConflictDoNothing();
  return (await findDiagnosis(evaluationId))!;
}

async function record(diagnosisId: string, action: string, userId: string) {
  await db.insert(diagnosisEventsTable).values({ id: uid(18), diagnosisId, action, actorUserId: userId, actorName: await actorName(userId) });
}

export async function getDiagnosisState(lead: Lead): Promise<DiagnosisState> {
  const evaluation = await ensureEvaluationForLead(lead);
  const phases = await getLeadPhases(lead);
  const diagnosisPhase = phases.find((phase) => phase.kind === "diagnosis");
  const preEvaluation = phases[0];
  const diagnosis = await findDiagnosis(evaluation.id);

  const withPhoto = (preEvaluation?.views ?? []).filter((view) => view.photo !== null);
  const annotations = new Map<string, typeof photoAnnotationsTable.$inferSelect>();
  for (const view of withPhoto) {
    const [annotation] = await db.select().from(photoAnnotationsTable).where(eq(photoAnnotationsTable.photoId, view.photo!.id));
    if (annotation) annotations.set(annotation.photoId, annotation);
  }
  const events = diagnosis
    ? await db.select().from(diagnosisEventsTable).where(eq(diagnosisEventsTable.diagnosisId, diagnosis.id)).orderBy(asc(diagnosisEventsTable.createdAt))
    : [];

  return {
    phaseId: diagnosisPhase?.id ?? null,
    status: diagnosis?.status === "closed" ? "closed" : "draft",
    responseText: diagnosis?.responseText ?? "",
    closedAt: diagnosis?.closedAt ?? null,
    closedByName: diagnosis?.closedByName ?? null,
    readyToDiagnose: preEvaluation?.complete === true,
    photos: withPhoto.map((view) => {
      const photo = view.photo as PhotoStatus;
      const annotation = annotations.get(photo.id);
      return {
        photoId: photo.id,
        viewKey: view.key,
        label: view.label,
        note: photo.note,
        width: photo.width,
        height: photo.height,
        hasAnnotation: Boolean(annotation),
        annotationUpdatedAt: annotation?.updatedAt ?? null,
        strokes: (annotation ? parseStrokes(annotation.strokes) : null) ?? [],
      };
    }),
    events: events.map((event) => ({ action: event.action, actorName: event.actorName, createdAt: event.createdAt })),
  };
}

async function editableDiagnosis(lead: Lead) {
  const evaluation = await ensureEvaluationForLead(lead);
  const diagnosis = await ensureDiagnosis(evaluation.id);
  if (diagnosis.status === "closed") throw new DiagnosisError("El diagnóstico está cerrado. Reábrelo para editarlo.", 409);
  return { evaluation, diagnosis };
}

export async function saveDiagnosisText(lead: Lead, userId: string, text: string) {
  if (text.length > MAX_RESPONSE_LENGTH) throw new DiagnosisError(`La respuesta no puede superar ${MAX_RESPONSE_LENGTH} caracteres.`);
  const { diagnosis } = await editableDiagnosis(lead);
  await db.update(diagnosesTable).set({ responseText: text, updatedAt: new Date() }).where(eq(diagnosesTable.id, diagnosis.id));
  await record(diagnosis.id, "saved", userId);
}

export async function closeDiagnosis(lead: Lead, userId: string, text?: string) {
  const { diagnosis } = await editableDiagnosis(lead);
  const phases = await getLeadPhases(lead);
  if (!phases.some((phase) => phase.kind === "diagnosis")) throw new DiagnosisError("Esta clínica no tiene fase de diagnóstico.");
  if (phases[0]?.complete !== true) throw new DiagnosisError("El paciente aún no completa su pre-evaluación.", 409);
  const responseText = (text ?? diagnosis.responseText).trim();
  if (!responseText) throw new DiagnosisError("Escribe la respuesta para el paciente antes de cerrar el diagnóstico.");
  if (responseText.length > MAX_RESPONSE_LENGTH) throw new DiagnosisError(`La respuesta no puede superar ${MAX_RESPONSE_LENGTH} caracteres.`);
  await db.update(diagnosesTable).set({
    responseText,
    status: "closed",
    closedAt: new Date(),
    closedByUserId: userId,
    closedByName: await actorName(userId),
    updatedAt: new Date(),
  }).where(eq(diagnosesTable.id, diagnosis.id));
  await record(diagnosis.id, "closed", userId);
}

export async function reopenDiagnosis(lead: Lead, userId: string) {
  const evaluation = await ensureEvaluationForLead(lead);
  const diagnosis = await findDiagnosis(evaluation.id);
  if (!diagnosis || diagnosis.status !== "closed") throw new DiagnosisError("El diagnóstico no está cerrado.", 409);
  await db.update(diagnosesTable).set({ status: "draft", updatedAt: new Date() }).where(eq(diagnosesTable.id, diagnosis.id));
  await record(diagnosis.id, "reopened", userId);
}

async function patientPhotoOf(lead: Lead, photoId: string) {
  const phases = await getLeadPhases(lead);
  const view = phases[0]?.views.find((candidate) => candidate.photo?.id === photoId);
  if (!view) throw new DiagnosisError("Esa foto no es parte de la pre-evaluación del paciente.", 404);
  return view;
}

export async function saveAnnotation(lead: Lead, userId: string, photoId: string, image: { contentType: string; bytes: Buffer }, strokes: Stroke[]) {
  const { evaluation } = await editableDiagnosis(lead);
  await patientPhotoOf(lead, photoId);
  const stored = await privatePhotoStorage.put({
    key: createObjectKey({ centerId: evaluation.centerId, evaluationId: evaluation.id, kind: "annotation", contentType: image.contentType }),
    bytes: image.bytes,
    contentType: image.contentType,
  });
  const [previous] = await db.select().from(photoAnnotationsTable).where(eq(photoAnnotationsTable.photoId, photoId));
  await db.insert(photoAnnotationsTable).values({
    id: uid(18), photoId, objectPath: stored.objectPath, mimeType: image.contentType, strokes, updatedByUserId: userId,
  }).onConflictDoUpdate({
    target: photoAnnotationsTable.photoId,
    set: { objectPath: stored.objectPath, mimeType: image.contentType, strokes, updatedByUserId: userId, updatedAt: new Date() },
  });
  if (previous) await privatePhotoStorage.remove(previous.objectPath);
}

export async function deleteAnnotation(lead: Lead, photoId: string) {
  await editableDiagnosis(lead);
  await patientPhotoOf(lead, photoId);
  const [annotation] = await db.select().from(photoAnnotationsTable).where(eq(photoAnnotationsTable.photoId, photoId));
  if (!annotation) return false;
  await privatePhotoStorage.remove(annotation.objectPath);
  await db.delete(photoAnnotationsTable).where(and(eq(photoAnnotationsTable.photoId, photoId)));
  return true;
}

export async function readAnnotationFile(lead: Lead, photoId: string) {
  await patientPhotoOf(lead, photoId);
  const [annotation] = await db.select().from(photoAnnotationsTable).where(eq(photoAnnotationsTable.photoId, photoId));
  if (!annotation) return null;
  return privatePhotoStorage.read(annotation.objectPath);
}

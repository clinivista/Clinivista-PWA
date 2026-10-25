import crypto from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, captureSessionsTable, leadsTable, centersTable, type Lead } from "@workspace/db";
import { DEFAULT_CENTER_ID, PhaseCaptureError, getLeadPhases, type LeadPhase } from "./clinical-photos";

/** The phone link lives a few minutes: enough to photograph one phase, short enough to be harmless if it leaks. */
export const CAPTURE_SESSION_MINUTES = 20;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** The phase must be one the staff can photograph right now (same rules as the tablet). */
function capturablePhase(phases: LeadPhase[], phaseId: string): LeadPhase {
  const phase = phases.find((candidate) => candidate.id === phaseId);
  if (!phase) throw new PhaseCaptureError("Esa fase no existe en este proceso.", 404);
  if (phase.kind !== "capture") throw new PhaseCaptureError("Esta fase no lleva fotografías.");
  if (!phase.staffCanCapture) throw new PhaseCaptureError("La pre-evaluación la toma el paciente desde su enlace.");
  if (!phase.enabled) throw new PhaseCaptureError("Completa la fase anterior antes de registrar esta.", 409);
  if (phase.skipped) throw new PhaseCaptureError("Esta fase fue omitida.", 409);
  if (phase.attentionRequired && !phase.attention) throw new PhaseCaptureError("Registra la fecha de atención de esta fase antes de subir sus fotografías.", 409);
  return phase;
}

/** Opens a capture session; any earlier open one for the same phase is closed, so only the newest link works. */
export async function createCaptureSession(lead: Lead, phaseId: string, userId: string): Promise<{ token: string; expiresAt: Date }> {
  capturablePhase(await getLeadPhases(lead), phaseId);
  const centerId = lead.centerId ?? DEFAULT_CENTER_ID;
  const now = new Date();
  await db.update(captureSessionsTable).set({ closedAt: now }).where(and(
    eq(captureSessionsTable.leadId, lead.id), eq(captureSessionsTable.phaseId, phaseId), isNull(captureSessionsTable.closedAt),
  ));
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + CAPTURE_SESSION_MINUTES * 60_000);
  await db.insert(captureSessionsTable).values({ tokenHash: hashToken(token), leadId: lead.id, centerId, phaseId, createdByUserId: userId, expiresAt });
  return { token, expiresAt };
}

export type OpenCaptureSession = { lead: Lead; phase: LeadPhase; userId: string; expiresAt: Date; clinicName: string };

/** The session behind a phone link, or null when it is unknown, closed or expired. */
export async function openCaptureSession(token: string): Promise<OpenCaptureSession | null> {
  if (!/^[\w-]{20,100}$/.test(token)) return null;
  const [session] = await db.select().from(captureSessionsTable).where(and(
    eq(captureSessionsTable.tokenHash, hashToken(token)), isNull(captureSessionsTable.closedAt), gt(captureSessionsTable.expiresAt, new Date()),
  ));
  if (!session) return null;
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, session.leadId));
  if (!lead) return null;
  const [center] = await db.select({ name: centersTable.name }).from(centersTable).where(eq(centersTable.id, session.centerId));
  let phase: LeadPhase;
  try {
    phase = capturablePhase(await getLeadPhases(lead), session.phaseId);
  } catch {
    return null;
  }
  return { lead, phase, userId: session.createdByUserId, expiresAt: session.expiresAt, clinicName: center?.name ?? "" };
}

export async function closeCaptureSession(token: string): Promise<void> {
  await db.update(captureSessionsTable).set({ closedAt: new Date() }).where(eq(captureSessionsTable.tokenHash, hashToken(token)));
}

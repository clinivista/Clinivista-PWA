import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db, diagnosesTable, evaluationsTable, leadsTable, reportSettingsTable, centersTable, type ReportSettings } from "@workspace/db";
import { logger } from "./logger";
import { MailNotConfiguredError, pendingReportMail, sendMail } from "./mailer";

export const TIME_ZONE = "America/Santiago";
export const FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const MAX_RECIPIENTS = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ReportError extends Error {
  constructor(message: string, readonly status: 400 | 409 | 503 = 400) {
    super(message);
  }
}

export type ReportConfig = {
  enabled: boolean;
  recipients: string[];
  frequency: Frequency;
  weekday: number;
  hour: number;
  skipWhenEmpty: boolean;
  lastSentAt: Date | null;
  lastError: string | null;
};

export const DEFAULT_CONFIG: ReportConfig = { enabled: false, recipients: [], frequency: "weekly", weekday: 1, hour: 8, skipWhenEmpty: true, lastSentAt: null, lastError: null };

const toConfig = (row: ReportSettings | undefined): ReportConfig =>
  row
    ? {
        enabled: row.enabled,
        recipients: row.recipients.split(",").map((e) => e.trim()).filter(Boolean),
        frequency: (FREQUENCIES as readonly string[]).includes(row.frequency) ? (row.frequency as Frequency) : "weekly",
        weekday: row.weekday,
        hour: row.hour,
        skipWhenEmpty: row.skipWhenEmpty,
        lastSentAt: row.lastSentAt,
        lastError: row.lastError,
      }
    : DEFAULT_CONFIG;

export async function getReportConfig(centerId: string): Promise<ReportConfig> {
  const [row] = await db.select().from(reportSettingsTable).where(eq(reportSettingsTable.centerId, centerId));
  return toConfig(row);
}

export type ReportInput = { enabled: boolean; recipients: string[]; frequency: string; weekday: number; hour: number; skipWhenEmpty: boolean };

export async function saveReportConfig(centerId: string, input: ReportInput): Promise<ReportConfig> {
  const recipients = [...new Set(input.recipients.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (recipients.some((e) => !EMAIL.test(e) || e.length > 200)) throw new ReportError("Hay un correo con formato inválido.");
  if (recipients.length > MAX_RECIPIENTS) throw new ReportError(`Puedes agregar hasta ${MAX_RECIPIENTS} correos.`);
  if (!(FREQUENCIES as readonly string[]).includes(input.frequency)) throw new ReportError("La periodicidad no es válida.");
  if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) throw new ReportError("El día de la semana no es válido.");
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) throw new ReportError("La hora no es válida.");
  if (input.enabled && recipients.length === 0) throw new ReportError("Agrega al menos un correo para activar el informe.");
  const values = { enabled: input.enabled, recipients: recipients.join(","), frequency: input.frequency, weekday: input.weekday, hour: input.hour, skipWhenEmpty: input.skipWhenEmpty, updatedAt: new Date() };
  await db.insert(reportSettingsTable).values({ centerId, ...values }).onConflictDoUpdate({ target: reportSettingsTable.centerId, set: values });
  return getReportConfig(centerId);
}

// ---- Calendario (hora de Chile) ----

/** Milliseconds that Chile is ahead of UTC at the given instant (negative: behind). */
function offsetMs(at: number): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(new Date(at));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - Math.floor(at / 1000) * 1000;
}

/** The instant at which `hour:00` on the given Chilean calendar date happens. */
function chileInstant(year: number, month: number, day: number, hour: number): number {
  const guess = Date.UTC(year, month, day, hour);
  return guess - offsetMs(guess - offsetMs(guess));
}

function chileDate(at: number): { year: number; month: number; day: number; weekday: number } {
  const local = new Date(at + offsetMs(at));
  return { year: local.getUTCFullYear(), month: local.getUTCMonth(), day: local.getUTCDate(), weekday: local.getUTCDay() };
}

/** The most recent scheduled send time that is not in the future. */
export function latestSlot(config: Pick<ReportConfig, "frequency" | "weekday" | "hour">, now: Date): Date {
  const today = chileDate(now.getTime());
  for (let back = 0; back <= 40; back += 1) {
    const base = Date.UTC(today.year, today.month, today.day - back);
    const day = new Date(base);
    const matches =
      config.frequency === "daily" ||
      (config.frequency === "weekly" && day.getUTCDay() === config.weekday) ||
      (config.frequency === "monthly" && day.getUTCDate() === 1);
    if (!matches) continue;
    const instant = chileInstant(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), config.hour);
    if (instant <= now.getTime()) return new Date(instant);
  }
  return new Date(now.getTime());
}

/** Due when a slot has passed since the report was last sent (or since it was configured). */
export function isDue(config: ReportConfig, configuredAt: Date, now: Date): boolean {
  if (!config.enabled || config.recipients.length === 0) return false;
  const slot = latestSlot(config, now);
  const since = Math.max(config.lastSentAt?.getTime() ?? 0, configuredAt.getTime());
  return slot.getTime() > since;
}

// ---- Pendientes ----

export type PendingPatient = { leadId: string; name: string; documentId: string; phone: string; waitingDays: number; link: string };

const PENDING_STATUSES = ["listo", "contactar", "agendado"];

/** Patients whose pre-evaluation is complete and whose diagnosis is not closed yet, oldest first. */
export async function pendingDiagnoses(centerId: string, baseUrl: string, now = new Date()): Promise<PendingPatient[]> {
  const leads = await db.select().from(leadsTable).where(and(eq(leadsTable.centerId, centerId), inArray(leadsTable.status, PENDING_STATUSES), or(isNull(leadsTable.isDemo), eq(leadsTable.isDemo, false))));
  if (leads.length === 0) return [];
  const closed = await db
    .select({ leadId: evaluationsTable.leadId })
    .from(evaluationsTable)
    .innerJoin(diagnosesTable, eq(diagnosesTable.evaluationId, evaluationsTable.id))
    .where(and(inArray(evaluationsTable.leadId, leads.map((l) => l.id)), eq(diagnosesTable.status, "closed")));
  const closedIds = new Set(closed.map((row) => row.leadId));
  return leads
    .filter((lead) => !closedIds.has(lead.id))
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .map((lead) => ({
      leadId: lead.id,
      name: lead.name,
      documentId: lead.documentId ?? "",
      phone: lead.phone,
      waitingDays: Math.max(0, Math.floor((now.getTime() - lead.updatedAt.getTime()) / 86_400_000)),
      link: patientLink(baseUrl, lead.id),
    }));
}

/** Opens the patient directly in the staff panel (asks to sign in first if needed). */
export const patientLink = (baseUrl: string, leadId: string) => `${baseUrl.replace(/\/+$/, "")}/admin?lead=${encodeURIComponent(leadId)}`;

// ---- Envío ----

export async function sendReport(centerId: string, baseUrl: string): Promise<{ sent: number; pending: number }> {
  const config = await getReportConfig(centerId);
  if (config.recipients.length === 0) throw new ReportError("Agrega al menos un correo para enviar el informe.", 409);
  const [center] = await db.select().from(centersTable).where(eq(centersTable.id, centerId));
  const pending = await pendingDiagnoses(centerId, baseUrl);
  let sent = 0;
  try {
    for (const to of config.recipients) {
      await sendMail(pendingReportMail({ to, clinicName: center?.name ?? "Clinivista", patients: pending, baseUrl }));
      sent += 1;
    }
  } catch (error) {
    if (error instanceof MailNotConfiguredError) throw new ReportError(error.message, 503);
    throw error;
  }
  return { sent, pending: pending.length };
}

/** Called on a timer: sends every report whose scheduled time has passed. */
export async function runDueReports(baseUrl: string | undefined, now = new Date()): Promise<number> {
  if (!baseUrl) return 0;
  const rows = await db.select().from(reportSettingsTable).where(eq(reportSettingsTable.enabled, true));
  let ran = 0;
  for (const row of rows) {
    const config = toConfig(row);
    if (!isDue(config, row.updatedAt, now)) continue;
    const slot = latestSlot(config, now);
    // Claim this period first so two instances (or two ticks) never send it twice.
    const claimed = await db
      .update(reportSettingsTable)
      .set({ lastSentAt: now, lastError: null })
      .where(and(eq(reportSettingsTable.centerId, row.centerId), or(isNull(reportSettingsTable.lastSentAt), lt(reportSettingsTable.lastSentAt, slot))))
      .returning({ centerId: reportSettingsTable.centerId });
    if (claimed.length === 0) continue;
    try {
      const pending = await pendingDiagnoses(row.centerId, baseUrl, now);
      if (pending.length === 0 && config.skipWhenEmpty) continue;
      await sendReport(row.centerId, baseUrl);
      ran += 1;
    } catch (error) {
      logger.error({ err: error, centerId: row.centerId }, "Pending-diagnosis report failed");
      // Release the period so the next tick retries it, and keep the reason for the panel.
      await db.update(reportSettingsTable).set({ lastSentAt: row.lastSentAt, lastError: error instanceof Error ? error.message : "Error al enviar" }).where(eq(reportSettingsTable.centerId, row.centerId));
    }
  }
  return ran;
}

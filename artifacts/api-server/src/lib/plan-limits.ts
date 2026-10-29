import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import type { Response } from "express";
import {
  db,
  centersTable,
  clinicHoursTable,
  clinicPlanSettingsTable,
  clinicalPhotosTable,
  evaluationsTable,
  leadsTable,
  transcriptionUsageTable,
} from "@workspace/db";
import { logger } from "./logger";
import { PLAN_DEFAULT_LIMITS, PLAN_SERVICES, centerPlan, toPlan, type Plan, type PlanLimits } from "./plans";
import { DEFAULT_CENTER_ID } from "./clinical-photos";
import { uid } from "./helpers";

/**
 * Límites efectivos de una clínica = lo que define su plan, salvo lo que
 * supra-control haya parametrizado para ella. En los parámetros, NULL = el valor
 * del plan y 0 = sin límite. Todo lo que se lee de `clinic_plan_settings` falla
 * «abierto»: si la tabla aún no existe, la clínica queda sin límites en vez de bloquearse.
 */

const GB = 1024 * 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Plazos del cobro, en días respecto al vencimiento («pagado hasta»). */
export const BILLING_DAYS = { warning: 7, grace: 5, readOnlyUntil: 20 } as const;

export type BillingStage = "sin_registro" | "al_dia" | "aviso" | "gracia" | "solo_lectura" | "suspendida";

export function billingStage(paidUntil: Date | null, now = new Date()): BillingStage {
  if (!paidUntil) return "sin_registro";
  const late = (now.getTime() - paidUntil.getTime()) / DAY_MS;
  if (late <= -BILLING_DAYS.warning) return "al_dia";
  if (late <= 0) return "aviso";
  if (late <= BILLING_DAYS.grace) return "gracia";
  if (late <= BILLING_DAYS.readOnlyUntil) return "solo_lectura";
  return "suspendida";
}

export type PlanSettings = {
  patientsPerMonth: number | null;
  storageGb: number | null;
  pendingPlan: Plan | null;
  pendingPlanFrom: Date | null;
  billingAuto: boolean;
};

const NO_SETTINGS: PlanSettings = { patientsPerMonth: null, storageGb: null, pendingPlan: null, pendingPlanFrom: null, billingAuto: false };

export async function readPlanSettings(centerId: string): Promise<PlanSettings> {
  try {
    const [row] = await db.select().from(clinicPlanSettingsTable).where(eq(clinicPlanSettingsTable.centerId, centerId));
    if (!row) return NO_SETTINGS;
    return {
      patientsPerMonth: row.patientsPerMonth,
      storageGb: row.storageGb,
      pendingPlan: row.pendingPlan ? toPlan(row.pendingPlan) : null,
      pendingPlanFrom: row.pendingPlanFrom,
      billingAuto: row.billingAuto,
    };
  } catch (error) {
    logger.warn({ err: error, centerId }, "Could not read the clinic plan settings; treating the clinic as unrestricted");
    return NO_SETTINGS;
  }
}

export type EffectiveLimits = PlanLimits & { fromClinic: { patientsPerMonth: boolean; storageGb: boolean } };

export function effectiveLimits(plan: Plan, settings: PlanSettings): EffectiveLimits {
  const base = PLAN_DEFAULT_LIMITS[plan];
  return {
    ...base,
    patientsPerMonth: settings.patientsPerMonth ?? base.patientsPerMonth,
    storageGb: settings.storageGb ?? base.storageGb,
    fromClinic: { patientsPerMonth: settings.patientsPerMonth !== null, storageGb: settings.storageGb !== null },
  };
}

/** El mes de las cuotas es el mes calendario UTC, igual que el de las transcripciones. */
export function monthBounds(now = new Date()): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export async function patientsThisMonth(centerId: string, now = new Date()): Promise<number> {
  const { from, to } = monthBounds(now);
  const clinic = centerId === DEFAULT_CENTER_ID
    ? sql`coalesce(${leadsTable.centerId}, ${DEFAULT_CENTER_ID}) = ${centerId}`
    : eq(leadsTable.centerId, centerId);
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(leadsTable)
    .where(and(clinic, isNull(leadsTable.parentLeadId), gte(leadsTable.createdAt, from), lt(leadsTable.createdAt, to)));
  return row?.n ?? 0;
}

/** Bytes de los originales guardados (fotos y videos, de todos los estados: los archivos reemplazados también ocupan espacio). */
export async function storageUsedBytes(centerId: string): Promise<number> {
  const [row] = await db.select({ bytes: sql<string>`coalesce(sum(${clinicalPhotosTable.originalBytes}), 0)::text` })
    .from(clinicalPhotosTable)
    .innerJoin(evaluationsTable, eq(evaluationsTable.id, clinicalPhotosTable.evaluationId))
    .where(eq(evaluationsTable.centerId, centerId));
  return Number(row?.bytes ?? 0);
}

export async function transcriptionsThisMonth(centerId: string, now = new Date()): Promise<number> {
  const { from, to } = monthBounds(now);
  const [row] = await db.select({ units: sql<number>`coalesce(sum(${transcriptionUsageTable.units}), 0)::int` }).from(transcriptionUsageTable)
    .where(and(eq(transcriptionUsageTable.centerId, centerId), gte(transcriptionUsageTable.createdAt, from), lt(transcriptionUsageTable.createdAt, to)));
  return row?.units ?? 0;
}

// ---------- Horas ----------

export type HoursKind = "incluidas" | "compradas" | "usadas" | "ajuste";

export type HoursSummary = { includedMinutes: number; purchasedMinutes: number; adjustMinutes: number; usedMinutes: number; balanceMinutes: number };

export async function hoursSummary(centerId: string): Promise<HoursSummary> {
  const empty: HoursSummary = { includedMinutes: 0, purchasedMinutes: 0, adjustMinutes: 0, usedMinutes: 0, balanceMinutes: 0 };
  try {
    const rows = await db.select({ kind: clinicHoursTable.kind, minutes: sql<number>`sum(${clinicHoursTable.minutes})::int` })
      .from(clinicHoursTable).where(eq(clinicHoursTable.centerId, centerId)).groupBy(clinicHoursTable.kind);
    const total = (kind: HoursKind) => rows.find((row) => row.kind === kind)?.minutes ?? 0;
    const summary = { ...empty, includedMinutes: total("incluidas"), purchasedMinutes: total("compradas"), adjustMinutes: total("ajuste"), usedMinutes: total("usadas") };
    return { ...summary, balanceMinutes: summary.includedMinutes + summary.purchasedMinutes + summary.adjustMinutes - summary.usedMinutes };
  } catch (error) {
    logger.warn({ err: error, centerId }, "Could not read the hours ledger");
    return empty;
  }
}

export async function listHours(centerId: string, limit = 50) {
  return db.select().from(clinicHoursTable).where(eq(clinicHoursTable.centerId, centerId)).orderBy(sql`${clinicHoursTable.createdAt} desc`).limit(limit);
}

export class PlanLimitError extends Error {
  readonly status = 403 as const;
  constructor(message: string, readonly code: "billing" | "patients_limit" | "storage_limit") {
    super(message);
  }
}

export async function addHours(centerId: string, input: { kind: HoursKind; minutes: number; note: string; createdBy: string | null }) {
  const plan = await centerPlan(centerId);
  if (input.kind === "compradas" && !PLAN_SERVICES[plan].buyHours) {
    throw new PlanLimitError("El plan Basic no puede comprar horas adicionales.", "billing");
  }
  const [row] = await db.insert(clinicHoursTable).values({ id: uid(18), centerId, kind: input.kind, minutes: input.minutes, note: input.note, createdBy: input.createdBy }).returning();
  return row;
}

// ---------- Estado de la clínica: lo que ven supra-control y la propia clínica ----------

export type PlanStatus = {
  plan: Plan;
  pendingPlan: Plan | null;
  pendingPlanFrom: string | null;
  billing: { stage: BillingStage; paidUntil: string | null; auto: boolean; restricted: boolean };
  limits: { patientsPerMonth: number; storageGb: number; transcriptionsPerMonth: number; includedHours: number; fromClinic: { patientsPerMonth: boolean; storageGb: boolean } };
  usage: { patientsThisMonth: number; storageBytes: number; transcriptionsThisMonth: number };
  hours: HoursSummary & { canBuy: boolean; customWork: boolean };
};

export async function planStatus(centerId: string, transcriptionQuota: number, now = new Date()): Promise<PlanStatus> {
  const [plan, settings] = await Promise.all([centerPlan(centerId), readPlanSettings(centerId)]);
  const [center] = await db.select({ paidUntil: centersTable.paidUntil }).from(centersTable).where(eq(centersTable.id, centerId));
  const limits = effectiveLimits(plan, settings);
  const stage = billingStage(center?.paidUntil ?? null, now);
  const safeUsage = async <T>(read: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await read(); } catch (error) { logger.warn({ err: error, centerId }, "Could not read plan usage"); return fallback; }
  };
  const [patients, storage, transcriptions, hours] = await Promise.all([
    safeUsage(() => patientsThisMonth(centerId, now), 0),
    safeUsage(() => storageUsedBytes(centerId), 0),
    safeUsage(() => transcriptionsThisMonth(centerId, now), 0),
    hoursSummary(centerId),
  ]);
  return {
    plan,
    pendingPlan: settings.pendingPlan,
    pendingPlanFrom: settings.pendingPlanFrom ? settings.pendingPlanFrom.toISOString() : null,
    billing: { stage, paidUntil: center?.paidUntil ? center.paidUntil.toISOString() : null, auto: settings.billingAuto, restricted: settings.billingAuto && (stage === "solo_lectura" || stage === "suspendida") },
    limits: { ...limits, transcriptionsPerMonth: transcriptionQuota },
    usage: { patientsThisMonth: patients, storageBytes: storage, transcriptionsThisMonth: transcriptions },
    hours: { ...hours, canBuy: PLAN_SERVICES[plan].buyHours, customWork: PLAN_SERVICES[plan].customWork },
  };
}

// ---------- Bloqueos ----------

async function assertBillingOpen(centerId: string): Promise<void> {
  const settings = await readPlanSettings(centerId);
  if (!settings.billingAuto) return;
  const [center] = await db.select({ paidUntil: centersTable.paidUntil }).from(centersTable).where(eq(centersTable.id, centerId));
  const stage = billingStage(center?.paidUntil ?? null);
  if (stage === "solo_lectura" || stage === "suspendida") {
    throw new PlanLimitError("La suscripción de esta clínica está vencida: por ahora solo se puede ver la información. Registra el pago para volver a agregar pacientes y fotos.", "billing");
  }
}

/** Antes de crear un paciente nuevo: cobro al día y cupo del mes. */
export async function assertCanAddPatient(centerId: string): Promise<void> {
  await assertBillingOpen(centerId);
  const [plan, settings] = await Promise.all([centerPlan(centerId), readPlanSettings(centerId)]);
  const limit = effectiveLimits(plan, settings).patientsPerMonth;
  if (limit > 0 && (await patientsThisMonth(centerId)) >= limit) {
    throw new PlanLimitError(`Esta clínica alcanzó su límite de ${limit} pacientes nuevos este mes. Sube de plan o contacta a Clinivista para ampliarlo.`, "patients_limit");
  }
}

/** Antes de guardar una foto o un video: cobro al día y espacio disponible. */
export async function assertCanStore(centerId: string): Promise<void> {
  await assertBillingOpen(centerId);
  const [plan, settings] = await Promise.all([centerPlan(centerId), readPlanSettings(centerId)]);
  const limit = effectiveLimits(plan, settings).storageGb;
  if (limit > 0 && (await storageUsedBytes(centerId)) >= limit * GB) {
    throw new PlanLimitError(`Esta clínica llenó su almacenamiento de ${limit} GB. Contacta a Clinivista para ampliarlo; lo ya guardado sigue disponible.`, "storage_limit");
  }
}

/** Responde 403 con el motivo si el error es un límite del plan; devuelve true si lo manejó. */
export function sendIfPlanLimit(error: unknown, res: Response): boolean {
  if (!(error instanceof PlanLimitError)) return false;
  res.status(error.status).json({ error: error.message, code: error.code });
  return true;
}

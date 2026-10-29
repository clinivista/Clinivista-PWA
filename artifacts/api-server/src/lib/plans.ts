import { eq } from "drizzle-orm";
import { db, centersTable, clinicPlanSettingsTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * Planes de las clínicas y qué habilita cada uno. El servidor decide con
 * `centerHasFeature`; la interfaz solo refleja lo que recibe en /auth/me y en
 * /clinic/protocol.
 *
 * Regla: un plan solo AGREGA funciones. Todo lo que existía antes de los
 * planes sigue disponible en todos (no figura en esta tabla), así ninguna
 * clínica pierde algo que ya usa. Para una función nueva: agrégala a
 * `PlanFeature` y a los planes que la incluyen. Las cuotas (p. ej. pacientes
 * por mes) están en `PLAN_DEFAULT_LIMITS`.
 */
export const PLANS = ["basic", "unlimited", "titanium"] as const;
export type Plan = (typeof PLANS)[number];

export type PlanFeature = "video";

const PLAN_FEATURES: Record<Plan, readonly PlanFeature[]> = {
  basic: [],
  unlimited: [],
  titanium: ["video"],
};

/**
 * Valores por defecto de cada plan. 0 significa «sin límite». Cada clínica puede
 * tener los suyos (ver `clinic_plan_settings` y lib/plan-limits.ts): un campo
 * vacío allí significa «lo que define el plan».
 */
export type PlanLimits = {
  patientsPerMonth: number;
  storageGb: number;
  transcriptionsPerMonth: number;
  /** Horas de inducción y personalización que se sugieren al contratar. */
  includedHours: number;
};

export const PLAN_DEFAULT_LIMITS: Record<Plan, PlanLimits> = {
  basic: { patientsPerMonth: 30, storageGb: 50, transcriptionsPerMonth: 20, includedHours: 0 },
  unlimited: { patientsPerMonth: 0, storageGb: 250, transcriptionsPerMonth: 100, includedHours: 5 },
  titanium: { patientsPerMonth: 0, storageGb: 1000, transcriptionsPerMonth: 300, includedHours: 15 },
};

/** Quién puede comprar horas adicionales y pedir mejoras a medida. */
export const PLAN_SERVICES: Record<Plan, { buyHours: boolean; customWork: boolean }> = {
  basic: { buyHours: false, customWork: false },
  unlimited: { buyHours: true, customWork: false },
  titanium: { buyHours: true, customWork: true },
};

export const isPlan = (value: unknown): value is Plan => typeof value === "string" && (PLANS as readonly string[]).includes(value);

/** Un valor desconocido (o una clínica sin fila) se trata como «basic»: nunca habilita de más. */
export const toPlan = (value: unknown): Plan => (isPlan(value) ? value : "basic");

export const planFeatures = (plan: Plan): PlanFeature[] => [...PLAN_FEATURES[plan]];

/** Bajada (o cambio) de plan programada: cuando llega su fecha se aplica sola, sin tarea aparte. */
async function applyDuePlanChange(centerId: string, current: Plan): Promise<Plan> {
  try {
    const [settings] = await db.select().from(clinicPlanSettingsTable).where(eq(clinicPlanSettingsTable.centerId, centerId));
    if (!settings?.pendingPlan || !settings.pendingPlanFrom || settings.pendingPlanFrom.getTime() > Date.now()) return current;
    const next = toPlan(settings.pendingPlan);
    await db.update(centersTable).set({ plan: next }).where(eq(centersTable.id, centerId));
    await db.update(clinicPlanSettingsTable).set({ pendingPlan: null, pendingPlanFrom: null, updatedAt: new Date() }).where(eq(clinicPlanSettingsTable.centerId, centerId));
    logger.info({ event: "clinic_plan_changed", centerId, from: current, to: next, scheduled: true }, "Scheduled clinic plan change applied");
    return next;
  } catch (error) {
    // Sin la tabla de parámetros (migración pendiente) el plan sigue siendo el actual.
    logger.warn({ err: error, centerId }, "Could not check the scheduled plan change");
    return current;
  }
}

export async function centerPlan(centerId: string): Promise<Plan> {
  const [center] = await db.select({ plan: centersTable.plan }).from(centersTable).where(eq(centersTable.id, centerId));
  return applyDuePlanChange(centerId, toPlan(center?.plan));
}

export async function centerHasFeature(centerId: string, feature: PlanFeature): Promise<boolean> {
  return planFeatures(await centerPlan(centerId)).includes(feature);
}

/** Lo que ve la interfaz: el plan y las funciones que habilita. */
export async function centerPlanInfo(centerId: string): Promise<{ plan: Plan; features: PlanFeature[] }> {
  const plan = await centerPlan(centerId);
  return { plan, features: planFeatures(plan) };
}

/** Se lanza cuando la clínica intenta usar una función que su plan no incluye (HTTP 403). */
export class PlanFeatureError extends Error {
  readonly status = 403 as const;
}

export const VIDEO_PLAN_MESSAGE = "El video por fotografía está disponible solo en el plan Titanium.";

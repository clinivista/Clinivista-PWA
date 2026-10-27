import { eq } from "drizzle-orm";
import { db, centersTable } from "@workspace/db";

/**
 * Planes de las clínicas y qué habilita cada uno. El servidor decide con
 * `centerHasFeature`; la interfaz solo refleja lo que recibe en /auth/me y en
 * /clinic/protocol.
 *
 * Regla: un plan solo AGREGA funciones. Todo lo que existía antes de los
 * planes sigue disponible en todos (no figura en esta tabla), así ninguna
 * clínica pierde algo que ya usa. Para una función nueva: agrégala a
 * `PlanFeature` y a los planes que la incluyen. Las cuotas (p. ej. pacientes
 * por mes) irán en `PLAN_LIMITS` cuando existan.
 */
export const PLANS = ["basic", "unlimited", "titanium"] as const;
export type Plan = (typeof PLANS)[number];

export type PlanFeature = "video";

const PLAN_FEATURES: Record<Plan, readonly PlanFeature[]> = {
  basic: [],
  unlimited: [],
  titanium: ["video"],
};

/** Cuotas por plan. Vacío a propósito: hoy ningún plan limita nada. */
export const PLAN_LIMITS: Record<Plan, Record<string, number>> = {
  basic: {},
  unlimited: {},
  titanium: {},
};

export const isPlan = (value: unknown): value is Plan => typeof value === "string" && (PLANS as readonly string[]).includes(value);

/** Un valor desconocido (o una clínica sin fila) se trata como «basic»: nunca habilita de más. */
export const toPlan = (value: unknown): Plan => (isPlan(value) ? value : "basic");

export const planFeatures = (plan: Plan): PlanFeature[] => [...PLAN_FEATURES[plan]];

export async function centerPlan(centerId: string): Promise<Plan> {
  const [center] = await db.select({ plan: centersTable.plan }).from(centersTable).where(eq(centersTable.id, centerId));
  return toPlan(center?.plan);
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

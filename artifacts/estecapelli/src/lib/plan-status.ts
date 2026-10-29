import { useQuery } from "@tanstack/react-query";

export type ClinicPlanId = "basic" | "unlimited" | "titanium";
export type BillingStage = "sin_registro" | "al_dia" | "aviso" | "gracia" | "solo_lectura" | "suspendida";

/** Lo que devuelve /api/clinic/plan-status: el plan de la clínica, su uso del mes y su saldo de horas. */
export type PlanStatus = {
  plan: ClinicPlanId;
  pendingPlan: ClinicPlanId | null;
  pendingPlanFrom: string | null;
  billing: { stage: BillingStage; paidUntil: string | null; auto: boolean; restricted: boolean };
  limits: { patientsPerMonth: number; storageGb: number; transcriptionsPerMonth: number; includedHours: number };
  usage: { patientsThisMonth: number; storageBytes: number; transcriptionsThisMonth: number };
  hours: { includedMinutes: number; purchasedMinutes: number; adjustMinutes: number; usedMinutes: number; balanceMinutes: number; canBuy: boolean; customWork: boolean };
};

export const PLAN_STATUS_KEY = ["clinic-plan-status"] as const;

export async function fetchPlanStatus(): Promise<PlanStatus> {
  const response = await fetch("/api/clinic/plan-status", { credentials: "same-origin" });
  if (!response.ok) throw new Error("plan-status");
  return (await response.json()) as PlanStatus;
}

export function usePlanStatus() {
  return useQuery({ queryKey: PLAN_STATUS_KEY, queryFn: fetchPlanStatus, staleTime: 60_000, retry: false });
}

const GB = 1024 * 1024 * 1024;
export const NEAR_LIMIT = 0.8;

export type MeterKey = "patients" | "storage" | "transcriptions";
/** limit 0 = sin límite; ratio = uso / límite (null si no hay límite). */
export type Meter = { key: MeterKey; used: number; limit: number; ratio: number | null };

export function meters(status: PlanStatus): Meter[] {
  const make = (key: MeterKey, used: number, limit: number): Meter => ({ key, used, limit, ratio: limit > 0 ? used / limit : null });
  return [
    make("patients", status.usage.patientsThisMonth, status.limits.patientsPerMonth),
    make("storage", status.usage.storageBytes / GB, status.limits.storageGb),
    make("transcriptions", status.usage.transcriptionsThisMonth, status.limits.transcriptionsPerMonth),
  ];
}

export type PlanAlert =
  | { kind: "full"; meter: MeterKey }
  | { kind: "near"; meter: MeterKey }
  | { kind: "billing"; stage: "aviso" | "gracia" | "solo_lectura" | "suspendida" }
  | { kind: "pending" };

/** Avisos que se muestran en el panel. El de cobro solo aparece si supra-control activó el cobro automático para la clínica. */
export function planAlerts(status: PlanStatus): PlanAlert[] {
  const alerts: PlanAlert[] = [];
  const { stage, auto } = status.billing;
  if (auto && (stage === "aviso" || stage === "gracia" || stage === "solo_lectura" || stage === "suspendida")) alerts.push({ kind: "billing", stage });
  for (const meter of meters(status)) {
    if (meter.ratio === null) continue;
    if (meter.ratio >= 1) alerts.push({ kind: "full", meter: meter.key });
    else if (meter.ratio >= NEAR_LIMIT) alerts.push({ kind: "near", meter: meter.key });
  }
  if (status.pendingPlan && status.pendingPlanFrom) alerts.push({ kind: "pending" });
  return alerts;
}

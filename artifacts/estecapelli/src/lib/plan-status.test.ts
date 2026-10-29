import { describe, expect, it } from "vitest";
import { meters, planAlerts, type PlanStatus } from "./plan-status";
import { PLAN_COUNTER_TEXT, fillPlan } from "./plan-counter-i18n";

const GB = 1024 ** 3;
const base = (over: Partial<PlanStatus> = {}): PlanStatus => ({
  plan: "basic", pendingPlan: null, pendingPlanFrom: null,
  billing: { stage: "al_dia", paidUntil: null, auto: false, restricted: false },
  limits: { patientsPerMonth: 30, storageGb: 50, transcriptionsPerMonth: 20, includedHours: 0 },
  usage: { patientsThisMonth: 0, storageBytes: 0, transcriptionsThisMonth: 0 },
  hours: { includedMinutes: 0, purchasedMinutes: 0, adjustMinutes: 0, usedMinutes: 0, balanceMinutes: 0, canBuy: false, customWork: false },
  ...over,
});

describe("planAlerts", () => {
  it("sin uso no avisa nada", () => expect(planAlerts(base())).toEqual([]));
  it("avisa al 80% y al 100%", () => {
    const alerts = planAlerts(base({ usage: { patientsThisMonth: 24, storageBytes: 50 * GB, transcriptionsThisMonth: 0 } }));
    expect(alerts).toContainEqual({ kind: "near", meter: "patients" });
    expect(alerts).toContainEqual({ kind: "full", meter: "storage" });
  });
  it("límite 0 = sin límite: no hay ratio ni aviso", () => {
    const status = base({ limits: { patientsPerMonth: 0, storageGb: 0, transcriptionsPerMonth: 0, includedHours: 0 }, usage: { patientsThisMonth: 999, storageBytes: 999 * GB, transcriptionsThisMonth: 99 } });
    expect(meters(status).every((m) => m.ratio === null)).toBe(true);
    expect(planAlerts(status)).toEqual([]);
  });
  it("el aviso de cobro solo aparece con cobro automático", () => {
    const billing = { stage: "gracia" as const, paidUntil: null, auto: false, restricted: false };
    expect(planAlerts(base({ billing }))).toEqual([]);
    expect(planAlerts(base({ billing: { ...billing, auto: true } }))).toEqual([{ kind: "billing", stage: "gracia" }]);
  });
  it("muestra el cambio de plan programado", () => {
    expect(planAlerts(base({ pendingPlan: "basic", pendingPlanFrom: "2026-12-01" }))).toEqual([{ kind: "pending" }]);
  });
});

describe("PLAN_COUNTER_TEXT", () => {
  it("las 9 lenguas tienen las mismas claves y ninguna vacía", () => {
    const keys = Object.keys(PLAN_COUNTER_TEXT.es).sort();
    expect(Object.keys(PLAN_COUNTER_TEXT)).toHaveLength(9);
    for (const text of Object.values(PLAN_COUNTER_TEXT)) {
      expect(Object.keys(text).sort()).toEqual(keys);
      for (const value of Object.values(text)) expect(String(value).length).toBeGreaterThan(0);
    }
  });
  it("fillPlan reemplaza marcadores", () => expect(fillPlan("{a} de {b}", { a: 3, b: 5 })).toBe("3 de 5"));
});

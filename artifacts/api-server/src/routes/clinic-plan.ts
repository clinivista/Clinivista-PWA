import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, centersTable, clinicPlanSettingsTable } from "@workspace/db";
import { requireStaffAuth, requireSupraAuth } from "./auth";
import { PLANS, PLAN_DEFAULT_LIMITS, centerPlan, isPlan, type Plan } from "../lib/plans";
import { PlanLimitError, addHours, listHours, planStatus, type HoursKind } from "../lib/plan-limits";
import { getTranscriptionSettings } from "../lib/transcription";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ID = /^[\w.-]{1,200}$/;
const RANK: Record<Plan, number> = { basic: 0, unlimited: 1, titanium: 2 };
const MAX_LIMIT = 100_000;

async function clinicStatus(centerId: string) {
  const transcription = await getTranscriptionSettings(centerId);
  return planStatus(centerId, transcription.monthlyQuota);
}

// El contador de la propia clínica: su plan, lo que lleva usado y su saldo de horas.
router.get("/clinic/plan-status", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  res.json(await clinicStatus(staff.centerId));
});

async function supraCenter(req: Parameters<typeof requireSupraAuth>[0], res: Parameters<typeof requireSupraAuth>[1]) {
  const context = requireSupraAuth(req, res);
  if (!context) return undefined;
  const id = String(req.params.id);
  if (!ID.test(id)) { res.status(404).json({ error: "Clínica no encontrada." }); return undefined; }
  const [center] = await db.select().from(centersTable).where(eq(centersTable.id, id));
  if (!center) { res.status(404).json({ error: "Clínica no encontrada." }); return undefined; }
  return { context, center };
}

async function supraView(centerId: string) {
  const [status, hours] = await Promise.all([clinicStatus(centerId), listHours(centerId).catch(() => [])]);
  return { ...status, planDefaults: PLAN_DEFAULT_LIMITS[status.plan], hoursLog: hours.map((row) => ({ id: row.id, kind: row.kind, minutes: row.minutes, note: row.note, createdAt: row.createdAt.toISOString() })) };
}

router.get("/director/centers/:id/plan", async (req, res): Promise<void> => {
  const found = await supraCenter(req, res);
  if (!found) return;
  res.json(await supraView(found.center.id));
});

async function upsertSettings(centerId: string, change: Partial<typeof clinicPlanSettingsTable.$inferInsert>) {
  await db.insert(clinicPlanSettingsTable).values({ centerId, ...change })
    .onConflictDoUpdate({ target: clinicPlanSettingsTable.centerId, set: { ...change, updatedAt: new Date() } });
}

const limitValue = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_LIMIT) return value;
  throw new RangeError("invalid");
};

// Límites propios de la clínica. Vacío (null) = lo que define su plan; 0 = sin límite.
router.put("/director/centers/:id/plan-settings", async (req, res): Promise<void> => {
  const found = await supraCenter(req, res);
  if (!found) return;
  const body = (req.body ?? {}) as Record<string, unknown>;
  let patients: number | null | undefined;
  let storage: number | null | undefined;
  try {
    patients = limitValue(body.patientsPerMonth);
    storage = limitValue(body.storageGb);
  } catch {
    res.status(422).json({ error: `Los límites deben ser números enteros entre 0 y ${MAX_LIMIT} (0 = sin límite, vacío = el del plan).` });
    return;
  }
  if (body.billingAuto !== undefined && typeof body.billingAuto !== "boolean") {
    res.status(422).json({ error: "Dato inválido." });
    return;
  }
  const change = {
    ...(patients !== undefined ? { patientsPerMonth: patients } : {}),
    ...(storage !== undefined ? { storageGb: storage } : {}),
    ...(body.billingAuto !== undefined ? { billingAuto: body.billingAuto as boolean } : {}),
  };
  if (Object.keys(change).length === 0) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }
  await upsertSettings(found.center.id, change);
  logger.info({ event: "clinic_plan_settings_changed", centerId: found.center.id, change, byUserId: found.context.userId }, "Clinic plan settings changed");
  res.json(await supraView(found.center.id));
});

// Cambio de plan: subir se aplica de inmediato; bajar queda programado para cuando vence lo pagado
// (o de inmediato si no hay pago registrado). `mode: "now"` fuerza el cambio ya; `mode: "cancel"` anula uno programado.
router.put("/director/centers/:id/plan-change", async (req, res): Promise<void> => {
  const found = await supraCenter(req, res);
  if (!found) return;
  const body = (req.body ?? {}) as { plan?: unknown; mode?: unknown };
  const current = await centerPlan(found.center.id);
  if (body.mode === "cancel") {
    await upsertSettings(found.center.id, { pendingPlan: null, pendingPlanFrom: null });
    res.json(await supraView(found.center.id));
    return;
  }
  if (!isPlan(body.plan) || !PLANS.includes(body.plan) || (body.mode !== undefined && body.mode !== "now")) {
    res.status(422).json({ error: "Plan inválido." });
    return;
  }
  const target = body.plan;
  const [fresh] = await db.select({ paidUntil: centersTable.paidUntil }).from(centersTable).where(eq(centersTable.id, found.center.id));
  const paidUntil = fresh?.paidUntil ?? null;
  const upgrade = RANK[target] > RANK[current];
  const later = !upgrade && target !== current && body.mode !== "now" && paidUntil !== null && paidUntil.getTime() > Date.now();
  if (target === current) {
    await upsertSettings(found.center.id, { pendingPlan: null, pendingPlanFrom: null });
  } else if (later) {
    await upsertSettings(found.center.id, { pendingPlan: target, pendingPlanFrom: paidUntil });
  } else {
    await db.update(centersTable).set({ plan: target }).where(eq(centersTable.id, found.center.id));
    await upsertSettings(found.center.id, { pendingPlan: null, pendingPlanFrom: null });
  }
  logger.info({ event: "clinic_plan_changed", centerId: found.center.id, from: current, to: target, scheduled: later, byUserId: found.context.userId }, "Clinic plan change");
  res.json(await supraView(found.center.id));
});

const HOUR_KINDS: HoursKind[] = ["incluidas", "compradas", "usadas", "ajuste"];

// Horas de inducción, personalización y atención: se registran como movimientos (en horas, múltiplos de 0,25).
router.post("/director/centers/:id/hours", async (req, res): Promise<void> => {
  const found = await supraCenter(req, res);
  if (!found) return;
  const body = (req.body ?? {}) as { kind?: unknown; hours?: unknown; note?: unknown };
  const kind = HOUR_KINDS.find((candidate) => candidate === body.kind);
  const hours = typeof body.hours === "number" ? body.hours : NaN;
  const minutes = Math.round(hours * 60);
  const valid = kind && Number.isFinite(hours) && Math.abs(hours) <= 1000 && minutes % 15 === 0 && (kind === "ajuste" ? minutes !== 0 : minutes > 0);
  if (!valid) {
    res.status(422).json({ error: "Indica el tipo y las horas (en múltiplos de 0,25; los ajustes pueden ser negativos)." });
    return;
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
  try {
    await addHours(found.center.id, { kind, minutes, note, createdBy: found.context.userId });
  } catch (error) {
    if (error instanceof PlanLimitError) { res.status(422).json({ error: error.message }); return; }
    throw error;
  }
  res.status(201).json(await supraView(found.center.id));
});

export default router;

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("@workspace/db", async () => {
  const real = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../../../lib/db/src/schema/index");
  const passwords = await import("../../../../lib/db/src/passwords");
  const client = new real.PGlite();
  const db = drizzle(client, { schema });
  return { ...schema, ...passwords, db, pool: client, __pglite: client };
});

import * as mockedDb from "@workspace/db";
import clinicPlanRouter from "./clinic-plan";
import { createSession } from "../lib/sessions";
import { BILLING_DAYS, PlanLimitError, assertCanAddPatient, assertCanStore, billingStage, effectiveLimits, hoursSummary } from "../lib/plan-limits";
import { centerPlan } from "../lib/plans";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json());
app.use("/api", clinicPlanRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof PlanLimitError) { res.status(error.status).json({ error: error.message, code: error.code }); return; }
  next(error);
});

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true,
      paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar',
      plan text NOT NULL DEFAULT 'basic', created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE leads (
      id text PRIMARY KEY, token text NOT NULL UNIQUE, parent_lead_id text, center_id text DEFAULT 'default-center',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE clinical_evaluations (id text PRIMARY KEY, center_id text NOT NULL DEFAULT 'default-center');
    CREATE TABLE clinical_photos (id text PRIMARY KEY, evaluation_id text NOT NULL, original_bytes integer NOT NULL);
    CREATE TABLE clinic_plan_settings (
      center_id text PRIMARY KEY, patients_per_month integer, storage_gb integer, pending_plan text,
      pending_plan_from timestamptz, billing_auto boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE clinic_hours_ledger (
      id text PRIMARY KEY, center_id text NOT NULL, kind text NOT NULL, minutes integer NOT NULL,
      note text NOT NULL DEFAULT '', created_by text, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE clinic_transcription_settings (
      center_id text PRIMARY KEY, monthly_quota integer NOT NULL DEFAULT 100, advanced_enabled boolean NOT NULL DEFAULT false,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE clinic_transcription_usage (
      id text PRIMARY KEY, center_id text NOT NULL, photo_id text NOT NULL, tier text NOT NULL, model text NOT NULL,
      units integer NOT NULL DEFAULT 1, input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
});

beforeEach(async () => {
  await pglite.exec(`TRUNCATE clinical_centers, leads, clinical_evaluations, clinical_photos, clinic_plan_settings, clinic_hours_ledger, clinic_transcription_settings, clinic_transcription_usage;`);
  await pglite.exec(`INSERT INTO clinical_centers (id, name, slug, plan) VALUES ('clinic-a', 'Clínica A', 'clinic-a', 'basic');`);
});

const director = () => `clinivista_session=${createSession({ userId: "director-1", centerId: null, role: "director" })}`;
const staff = (centerId = "clinic-a") => `clinivista_session=${createSession({ userId: "s1", centerId, role: "administrativo" })}`;

async function seedPatients(count: number, createdAt = "now()", parent = "NULL") {
  for (let i = 0; i < count; i++) {
    await pglite.exec(`INSERT INTO leads (id, token, center_id, created_at, parent_lead_id) VALUES ('l-${createdAt.length}-${parent.length}-${i}-${Math.random()}', 't-${Math.random()}', 'clinic-a', ${createdAt}, ${parent});`);
  }
}

describe("etapas de cobro", () => {
  const paid = new Date("2026-11-30T12:00:00Z");
  const at = (days: number) => new Date(paid.getTime() + days * 24 * 60 * 60 * 1000);
  it("recorre las cinco etapas según los días respecto al vencimiento", () => {
    expect(billingStage(null)).toBe("sin_registro");
    expect(billingStage(paid, at(-BILLING_DAYS.warning - 1))).toBe("al_dia");
    expect(billingStage(paid, at(-3))).toBe("aviso");
    expect(billingStage(paid, at(2))).toBe("gracia");
    expect(billingStage(paid, at(6))).toBe("solo_lectura");
    expect(billingStage(paid, at(20))).toBe("solo_lectura");
    expect(billingStage(paid, at(21))).toBe("suspendida");
  });
});

describe("límites efectivos", () => {
  const none = { patientsPerMonth: null, storageGb: null, pendingPlan: null, pendingPlanFrom: null, billingAuto: false };
  it("sin parámetros propios vale el plan; vacío = plan y 0 = sin límite", () => {
    expect(effectiveLimits("basic", none)).toMatchObject({ patientsPerMonth: 30, storageGb: 50, transcriptionsPerMonth: 20 });
    expect(effectiveLimits("unlimited", none)).toMatchObject({ patientsPerMonth: 0, storageGb: 250 });
    expect(effectiveLimits("titanium", none).storageGb).toBe(1000);
    expect(effectiveLimits("basic", { ...none, patientsPerMonth: 0, storageGb: 80 })).toMatchObject({ patientsPerMonth: 0, storageGb: 80, fromClinic: { patientsPerMonth: true, storageGb: true } });
  });
});

describe("bloqueo por cupo de pacientes", () => {
  it("Basic permite 30 pacientes nuevos al mes y rechaza el 31", async () => {
    await seedPatients(29);
    await expect(assertCanAddPatient("clinic-a")).resolves.toBeUndefined();
    await seedPatients(1, "now()");
    await expect(assertCanAddPatient("clinic-a")).rejects.toMatchObject({ code: "patients_limit" });
  });

  it("no cuentan los pacientes de meses anteriores ni las consultas de un paciente ya existente", async () => {
    await seedPatients(30, "now() - interval '40 days'");
    await seedPatients(5, "now()", "'l-parent'");
    await expect(assertCanAddPatient("clinic-a")).resolves.toBeUndefined();
  });

  it("el límite propio de la clínica manda sobre el del plan, y 0 lo quita", async () => {
    await seedPatients(30);
    await pglite.exec(`INSERT INTO clinic_plan_settings (center_id, patients_per_month) VALUES ('clinic-a', 100);`);
    await expect(assertCanAddPatient("clinic-a")).resolves.toBeUndefined();
    await pglite.exec(`UPDATE clinic_plan_settings SET patients_per_month = 10 WHERE center_id = 'clinic-a';`);
    await expect(assertCanAddPatient("clinic-a")).rejects.toBeInstanceOf(PlanLimitError);
    await pglite.exec(`UPDATE clinic_plan_settings SET patients_per_month = 0 WHERE center_id = 'clinic-a';`);
    await expect(assertCanAddPatient("clinic-a")).resolves.toBeUndefined();
  });
});

describe("bloqueo por almacenamiento", () => {
  it("rechaza guardar cuando los originales llegan al tramo, y se libera al ampliarlo", async () => {
    await pglite.exec(`
      INSERT INTO clinical_evaluations (id, center_id) VALUES ('e1', 'clinic-a');
      INSERT INTO clinical_photos (id, evaluation_id, original_bytes) VALUES ('p1', 'e1', 1073741824);
      INSERT INTO clinic_plan_settings (center_id, storage_gb) VALUES ('clinic-a', 1);
    `);
    await expect(assertCanStore("clinic-a")).rejects.toMatchObject({ code: "storage_limit" });
    await pglite.exec(`UPDATE clinic_plan_settings SET storage_gb = 2 WHERE center_id = 'clinic-a';`);
    await expect(assertCanStore("clinic-a")).resolves.toBeUndefined();
  });
});

describe("suspensión automática por falta de pago", () => {
  it("solo actúa si supra-control la activó para esa clínica", async () => {
    await pglite.exec(`UPDATE clinical_centers SET paid_until = now() - interval '30 days' WHERE id = 'clinic-a';`);
    await expect(assertCanAddPatient("clinic-a")).resolves.toBeUndefined();
    await pglite.exec(`INSERT INTO clinic_plan_settings (center_id, billing_auto) VALUES ('clinic-a', true);`);
    await expect(assertCanAddPatient("clinic-a")).rejects.toMatchObject({ code: "billing" });
    await expect(assertCanStore("clinic-a")).rejects.toMatchObject({ code: "billing" });
    await pglite.exec(`UPDATE clinical_centers SET paid_until = now() + interval '20 days' WHERE id = 'clinic-a';`);
    await expect(assertCanAddPatient("clinic-a")).resolves.toBeUndefined();
  });
});

describe("rutas de supra-control", () => {
  it("solo supra-control accede, y un personal de clínica no", async () => {
    await request(app).get("/api/director/centers/clinic-a/plan").expect(401);
    await request(app).get("/api/director/centers/clinic-a/plan").set("Cookie", staff()).expect(403);
    await request(app).put("/api/director/centers/clinic-a/plan-settings").set("Cookie", staff()).send({ storageGb: 5 }).expect(403);
    await request(app).get("/api/director/centers/nope/plan").set("Cookie", director()).expect(404);
  });

  it("parametriza límites y valida los datos", async () => {
    const ok = await request(app).put("/api/director/centers/clinic-a/plan-settings").set("Cookie", director()).send({ patientsPerMonth: 80, storageGb: null, billingAuto: true }).expect(200);
    expect(ok.body.limits).toMatchObject({ patientsPerMonth: 80, storageGb: 50, fromClinic: { patientsPerMonth: true, storageGb: false } });
    expect(ok.body.billing.auto).toBe(true);
    expect(ok.body.planDefaults).toMatchObject({ patientsPerMonth: 30, storageGb: 50 });
    await request(app).put("/api/director/centers/clinic-a/plan-settings").set("Cookie", director()).send({ storageGb: -1 }).expect(422);
    await request(app).put("/api/director/centers/clinic-a/plan-settings").set("Cookie", director()).send({ storageGb: 1.5 }).expect(422);
    await request(app).put("/api/director/centers/clinic-a/plan-settings").set("Cookie", director()).send({}).expect(400);
  });

  it("subir de plan es inmediato; bajar queda programado hasta que vence lo pagado y entonces se aplica solo", async () => {
    await pglite.exec(`UPDATE clinical_centers SET paid_until = now() + interval '10 days' WHERE id = 'clinic-a';`);
    const up = await request(app).put("/api/director/centers/clinic-a/plan-change").set("Cookie", director()).send({ plan: "titanium" }).expect(200);
    expect(up.body).toMatchObject({ plan: "titanium", pendingPlan: null });

    const down = await request(app).put("/api/director/centers/clinic-a/plan-change").set("Cookie", director()).send({ plan: "basic" }).expect(200);
    expect(down.body).toMatchObject({ plan: "titanium", pendingPlan: "basic" });
    expect(new Date(down.body.pendingPlanFrom).getTime()).toBeGreaterThan(Date.now());
    await expect(centerPlan("clinic-a")).resolves.toBe("titanium");

    await pglite.exec(`UPDATE clinic_plan_settings SET pending_plan_from = now() - interval '1 minute' WHERE center_id = 'clinic-a';`);
    await expect(centerPlan("clinic-a")).resolves.toBe("basic");
    const after = await request(app).get("/api/director/centers/clinic-a/plan").set("Cookie", director()).expect(200);
    expect(after.body).toMatchObject({ plan: "basic", pendingPlan: null });
  });

  it("se puede anular una bajada programada, forzarla de inmediato y rechaza planes inventados", async () => {
    await pglite.exec(`UPDATE clinical_centers SET plan = 'unlimited', paid_until = now() + interval '10 days' WHERE id = 'clinic-a';`);
    await request(app).put("/api/director/centers/clinic-a/plan-change").set("Cookie", director()).send({ plan: "basic" }).expect(200);
    const cancelled = await request(app).put("/api/director/centers/clinic-a/plan-change").set("Cookie", director()).send({ mode: "cancel" }).expect(200);
    expect(cancelled.body).toMatchObject({ plan: "unlimited", pendingPlan: null });
    const now = await request(app).put("/api/director/centers/clinic-a/plan-change").set("Cookie", director()).send({ plan: "basic", mode: "now" }).expect(200);
    expect(now.body).toMatchObject({ plan: "basic", pendingPlan: null });
    await request(app).put("/api/director/centers/clinic-a/plan-change").set("Cookie", director()).send({ plan: "gold" }).expect(422);
  });

  it("sin pago registrado la bajada se aplica de inmediato", async () => {
    await pglite.exec(`UPDATE clinical_centers SET plan = 'titanium' WHERE id = 'clinic-a';`);
    const res = await request(app).put("/api/director/centers/clinic-a/plan-change").set("Cookie", director()).send({ plan: "unlimited" }).expect(200);
    expect(res.body).toMatchObject({ plan: "unlimited", pendingPlan: null });
  });
});

describe("horas", () => {
  it("lleva el saldo: incluidas y compradas suman, usadas restan, y Basic no compra", async () => {
    await pglite.exec(`UPDATE clinical_centers SET plan = 'unlimited' WHERE id = 'clinic-a';`);
    const post = (body: object) => request(app).post("/api/director/centers/clinic-a/hours").set("Cookie", director()).send(body);
    await post({ kind: "incluidas", hours: 5, note: "Contrato inicial" }).expect(201);
    await post({ kind: "compradas", hours: 2.5, note: "Atención extra" }).expect(201);
    const res = await post({ kind: "usadas", hours: 1.25, note: "Inducción" }).expect(201);
    expect(res.body.hours).toMatchObject({ includedMinutes: 300, purchasedMinutes: 150, usedMinutes: 75, balanceMinutes: 375, canBuy: true, customWork: false });
    expect(res.body.hoursLog).toHaveLength(3);
    await expect(hoursSummary("clinic-a")).resolves.toMatchObject({ balanceMinutes: 375 });

    await post({ kind: "ajuste", hours: -0.25, note: "Corrección" }).expect(201);
    await post({ kind: "usadas", hours: 0.1 }).expect(422);
    await post({ kind: "usadas", hours: -1 }).expect(422);
    await post({ kind: "otra", hours: 1 }).expect(422);

    await pglite.exec(`UPDATE clinical_centers SET plan = 'basic' WHERE id = 'clinic-a';`);
    await post({ kind: "compradas", hours: 1 }).expect(422);
  });
});

describe("contador de la clínica", () => {
  it("cada clínica ve solo su propio plan, uso y saldo", async () => {
    await pglite.exec(`
      INSERT INTO clinical_centers (id, name, slug, plan) VALUES ('clinic-b', 'Clínica B', 'clinic-b', 'titanium');
      INSERT INTO clinical_evaluations (id, center_id) VALUES ('e1', 'clinic-a');
      INSERT INTO clinical_photos (id, evaluation_id, original_bytes) VALUES ('p1', 'e1', 5000000);
      INSERT INTO clinic_transcription_usage (id, center_id, photo_id, tier, model, units) VALUES ('u1', 'clinic-a', 'p1', 'basic', 'm', 3);
    `);
    await seedPatients(4);
    await request(app).get("/api/clinic/plan-status").expect(401);
    const a = await request(app).get("/api/clinic/plan-status").set("Cookie", staff("clinic-a")).expect(200);
    expect(a.body).toMatchObject({
      plan: "basic",
      limits: { patientsPerMonth: 30, storageGb: 50, transcriptionsPerMonth: 20 },
      usage: { patientsThisMonth: 4, storageBytes: 5000000, transcriptionsThisMonth: 3 },
      billing: { stage: "sin_registro", restricted: false },
      hours: { balanceMinutes: 0, canBuy: false },
    });
    const b = await request(app).get("/api/clinic/plan-status").set("Cookie", staff("clinic-b")).expect(200);
    expect(b.body).toMatchObject({ plan: "titanium", usage: { patientsThisMonth: 0, storageBytes: 0 }, hours: { customWork: true } });
  });
});

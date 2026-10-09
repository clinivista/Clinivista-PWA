import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("@workspace/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../../../lib/db/src/schema/index");
  const passwords = await import("../../../../lib/db/src/passwords");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  return { ...schema, ...passwords, db, pool: client, __pglite: client };
});

import * as mockedDb from "@workspace/db";
import clinicReportRouter from "./clinic-report";
import { createSession } from "../lib/sessions";
import { isDue, latestSlot, runDueReports, getReportConfig, DEFAULT_CONFIG } from "../lib/pending-report";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", clinicReportRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL,
      password_hash text NOT NULL, name text NOT NULL DEFAULT '', role text NOT NULL,
      center_id text, active boolean NOT NULL DEFAULT true,
      legal_representative boolean NOT NULL DEFAULT false,
      reset_token_hash text, reset_token_expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS leads (
      id text PRIMARY KEY, token text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', document_id text DEFAULT '',
      document_normalized text DEFAULT '', email text DEFAULT '', age text DEFAULT '', city text DEFAULT '',
      status text NOT NULL DEFAULT 'nuevo', consent boolean NOT NULL DEFAULT false,
      marketing_consent boolean NOT NULL DEFAULT false, photo_count text NOT NULL DEFAULT '0',
      photos jsonb NOT NULL DEFAULT '[]', hair_loss_time text DEFAULT '', pattern text DEFAULT '',
      previous_treatment text DEFAULT '', symptoms text DEFAULT '', surgery_history text DEFAULT '',
      notes text DEFAULT '', norwood text DEFAULT '', appointment_at text DEFAULT '',
      is_demo boolean DEFAULT false, center_id text DEFAULT 'default-center',
      protocol_id text DEFAULT 'capillary-initial', delivery_channel text DEFAULT '',
      language text DEFAULT '', patient_account_id text, clinical_data jsonb NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS clinical_evaluations (
      id text PRIMARY KEY, lead_id text NOT NULL UNIQUE, center_id text NOT NULL DEFAULT 'default-center',
      protocol_id text NOT NULL DEFAULT 'capillary-initial', status text NOT NULL DEFAULT 'draft',
      clinical_data jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_diagnoses (
      id text PRIMARY KEY, evaluation_id text NOT NULL UNIQUE, response_text text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'draft', closed_at timestamptz, closed_by_user_id text, closed_by_name text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinic_report_settings (
      center_id text PRIMARY KEY, enabled boolean NOT NULL DEFAULT false, recipients text NOT NULL DEFAULT '',
      frequency text NOT NULL DEFAULT 'weekly', weekday integer NOT NULL DEFAULT 1, hour integer NOT NULL DEFAULT 8,
      skip_when_empty boolean NOT NULL DEFAULT true, last_sent_at timestamptz, last_error text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
});

const sent: Array<{ to: string[]; subject: string; text: string }> = [];
beforeEach(async () => {
  await pglite.exec(`TRUNCATE clinical_centers, users, leads, clinical_evaluations, clinical_diagnoses, clinic_report_settings;`);
  await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-a', 'Clínica A', 'clinic-a'), ('clinic-b', 'Clínica B', 'clinic-b');`);
  await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, role, center_id, legal_representative) VALUES
    ('rep', 'rep@x.cl', 'rep@x.cl', 'x', 'medico', 'clinic-a', true), ('adm', 'adm@x.cl', 'adm@x.cl', 'x', 'administrativo', 'clinic-a', false);`);
  process.env.PUBLIC_APP_URL = "https://app.example.cl";
  sent.length = 0;
  process.env.RESEND_API_KEY = "re_test";
  process.env.MAIL_FROM = "Clínica <r@example.cl>";
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)));
    return new Response("{}", { status: 200 });
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.MAIL_FROM;
  delete process.env.PUBLIC_APP_URL;
});

const cookie = (userId: string, role: "medico" | "administrativo", centerId = "clinic-a") => `clinivista_session=${createSession({ userId, centerId, role })}`;
const rep = () => cookie("rep", "medico");
const lead = (id: string, name: string, status: string, center = "clinic-a", updatedAt = "now()") =>
  pglite.exec(`INSERT INTO leads (id, token, name, status, center_id, document_id, updated_at) VALUES ('${id}', 't-${id}', '${name}', '${status}', '${center}', '11.111.111-1', ${updatedAt});`);
const closeDiagnosis = (leadId: string) =>
  pglite.exec(`INSERT INTO clinical_evaluations (id, lead_id, center_id) VALUES ('ev-${leadId}', '${leadId}', 'clinic-a');
    INSERT INTO clinical_diagnoses (id, evaluation_id, status) VALUES ('dg-${leadId}', 'ev-${leadId}', 'closed');`);
const valid = { enabled: true, recipients: ["jefe@clinica.cl", "Medico@Clinica.cl"], frequency: "weekly", weekday: 1, hour: 8, skipWhenEmpty: true };

describe("calendario del informe (hora de Chile)", () => {
  it("weekly: the latest Monday 08:00 Chile time", () => {
    // Wed 2026-10-07 15:00 UTC (Chile is UTC-3 in October): the Monday before was 2026-10-05 08:00 -03 = 11:00 UTC.
    const slot = latestSlot({ frequency: "weekly", weekday: 1, hour: 8 }, new Date("2026-10-07T15:00:00Z"));
    expect(slot.toISOString()).toBe("2026-10-05T11:00:00.000Z");
  });
  it("daily: today's slot once reached, yesterday's before it", () => {
    expect(latestSlot({ frequency: "daily", weekday: 0, hour: 8 }, new Date("2026-10-07T15:00:00Z")).toISOString()).toBe("2026-10-07T11:00:00.000Z");
    expect(latestSlot({ frequency: "daily", weekday: 0, hour: 8 }, new Date("2026-10-07T10:00:00Z")).toISOString()).toBe("2026-10-06T11:00:00.000Z");
  });
  it("monthly: the 1st of the month", () => {
    expect(latestSlot({ frequency: "monthly", weekday: 0, hour: 9 }, new Date("2026-10-20T00:00:00Z")).toISOString()).toBe("2026-10-01T12:00:00.000Z");
  });
  it("a freshly configured report waits for its next slot; a sent one waits for the following", () => {
    const config = { ...DEFAULT_CONFIG, enabled: true, recipients: ["a@b.cl"], frequency: "daily" as const, hour: 8 };
    const now = new Date("2026-10-07T15:00:00Z");
    expect(isDue(config, new Date("2026-10-07T14:00:00Z"), now)).toBe(false); // configured after today's slot
    expect(isDue(config, new Date("2026-10-06T14:00:00Z"), now)).toBe(true);
    expect(isDue({ ...config, lastSentAt: new Date("2026-10-07T11:05:00Z") }, new Date("2026-10-01T00:00:00Z"), now)).toBe(false);
    expect(isDue({ ...config, enabled: false }, new Date("2026-10-01T00:00:00Z"), now)).toBe(false);
  });
});

describe("informe de pacientes pendientes de diagnóstico", () => {
  it("lists only this clinic's complete evaluations without a closed diagnosis, oldest first, each with a direct link", async () => {
    await lead("l1", "Reciente", "listo", "clinic-a", "now() - interval '1 day'");
    await lead("l2", "Antiguo", "contactar", "clinic-a", "now() - interval '9 days'");
    await lead("l3", "Ya diagnosticado", "listo");
    await closeDiagnosis("l3");
    await lead("l4", "Incompleto", "incompleto");
    await lead("l5", "Otra clínica", "listo", "clinic-b");
    await lead("l6", "Cerrado", "cerrado");
    const res = await request(app).get("/api/clinic/report").set("Cookie", cookie("adm", "administrativo")).expect(200);
    expect(res.body.canEdit).toBe(false);
    expect(res.body.pending.map((p: { name: string }) => p.name)).toEqual(["Antiguo", "Reciente"]);
    expect(res.body.pending[0]).toMatchObject({ waitingDays: 9, link: "https://app.example.cl/admin?lead=l2" });
    await request(app).get("/api/clinic/report").expect(401);
  });

  it("only the legal representative saves settings; invalid ones are rejected", async () => {
    await request(app).put("/api/clinic/report").set("Cookie", cookie("adm", "administrativo")).send(valid).expect(403);
    const ok = await request(app).put("/api/clinic/report").set("Cookie", rep()).send(valid).expect(200);
    expect(ok.body.config).toMatchObject({ enabled: true, recipients: ["jefe@clinica.cl", "medico@clinica.cl"], frequency: "weekly", weekday: 1, hour: 8 });
    expect(ok.body.canEdit).toBe(true);
    const bad = (patch: object) => request(app).put("/api/clinic/report").set("Cookie", rep()).send({ ...valid, ...patch });
    expect((await bad({ recipients: ["no-es-correo"] })).status).toBe(400);
    expect((await bad({ recipients: [] })).status).toBe(400);
    expect((await bad({ frequency: "cada-rato" })).status).toBe(400);
    expect((await bad({ hour: 25 })).status).toBe(400);
    expect((await bad({ weekday: 9 })).status).toBe(400);
    expect((await bad({ recipients: ["a@x.cl", "b@x.cl", "c@x.cl", "d@x.cl", "e@x.cl", "f@x.cl"] })).status).toBe(400);
    // disabled with no recipients is fine (it is just off)
    await bad({ enabled: false, recipients: [] }).expect(200);
  });

  it("send now: one email per recipient with the patients and their links; needs recipients and mail", async () => {
    await lead("l1", "Ana Pérez", "listo");
    await request(app).post("/api/clinic/report/send").set("Cookie", cookie("adm", "administrativo")).expect(403);
    await request(app).post("/api/clinic/report/send").set("Cookie", rep()).expect(409);
    await request(app).put("/api/clinic/report").set("Cookie", rep()).send(valid).expect(200);
    const res = await request(app).post("/api/clinic/report/send").set("Cookie", rep()).expect(200);
    expect(res.body).toEqual({ sent: 2, pending: 1 });
    expect(sent.map((m) => m.to[0])).toEqual(["jefe@clinica.cl", "medico@clinica.cl"]);
    expect(sent[0].subject).toContain("1 paciente pendiente");
    expect(sent[0].text).toContain("Ana Pérez");
    expect(sent[0].text).toContain("https://app.example.cl/admin?lead=l1");
    delete process.env.RESEND_API_KEY;
    await request(app).post("/api/clinic/report/send").set("Cookie", rep()).expect(503);
  });

  it("the scheduler sends a due report once, skips empty ones when asked, and does not repeat the period", async () => {
    await request(app).put("/api/clinic/report").set("Cookie", rep()).send({ ...valid, frequency: "daily", recipients: ["jefe@clinica.cl"] }).expect(200);
    // pretend it was configured long ago so today's slot counts
    await pglite.exec(`UPDATE clinic_report_settings SET updated_at = now() - interval '3 days';`);
    const later = new Date(Date.now() + 2 * 86_400_000);
    // nothing pending + skip when empty → claimed but not sent
    expect(await runDueReports("https://app.example.cl", later)).toBe(0);
    expect(sent).toHaveLength(0);
    await lead("l1", "Ana", "listo");
    // same period again: already claimed, nothing happens
    expect(await runDueReports("https://app.example.cl", later)).toBe(0);
    // the next day's period sends it
    const next = new Date(later.getTime() + 86_400_000);
    expect(await runDueReports("https://app.example.cl", next)).toBe(1);
    expect(sent).toHaveLength(1);
    expect(await runDueReports("https://app.example.cl", next)).toBe(0);
    expect(sent).toHaveLength(1);
    expect((await getReportConfig("clinic-a")).lastSentAt).not.toBeNull();
    expect(await runDueReports(undefined, next)).toBe(0);
  });

  it("a failed send releases the period and records the reason", async () => {
    await lead("l1", "Ana", "listo");
    await request(app).put("/api/clinic/report").set("Cookie", rep()).send({ ...valid, frequency: "daily", recipients: ["jefe@clinica.cl"] }).expect(200);
    await pglite.exec(`UPDATE clinic_report_settings SET updated_at = now() - interval '3 days';`);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 422 })));
    const later = new Date(Date.now() + 2 * 86_400_000);
    expect(await runDueReports("https://app.example.cl", later)).toBe(0);
    const config = await getReportConfig("clinic-a");
    expect(config.lastSentAt).toBeNull();
    expect(config.lastError).toMatch(/rechazó/);
  });
});

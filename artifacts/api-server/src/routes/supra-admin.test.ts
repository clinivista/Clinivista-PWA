import { describe, it, expect, beforeAll, vi } from "vitest";
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
import supraAdminRouter from "./supra-admin";
import { createSession } from "../lib/sessions";
import { applyResults, alertRenewals, checkClaude, type CheckResult } from "../lib/service-monitor";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", supraAdminRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE admin_services (id text PRIMARY KEY, name text NOT NULL, provider text NOT NULL DEFAULT '', plan text NOT NULL DEFAULT '', cost_cents integer NOT NULL DEFAULT 0, currency text NOT NULL DEFAULT 'USD', billing_cycle text NOT NULL DEFAULT 'monthly', renewal_date text, renewal_alerted_for text, notes text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE admin_service_status (check_key text PRIMARY KEY, status text NOT NULL DEFAULT 'unknown', detail text NOT NULL DEFAULT '', checked_at timestamptz NOT NULL DEFAULT now(), changed_at timestamptz NOT NULL DEFAULT now(), failures integer NOT NULL DEFAULT 0, alerted boolean NOT NULL DEFAULT false, last_alert_at timestamptz);
    CREATE TABLE finance_entries (id text PRIMARY KEY, kind text NOT NULL, entry_date text NOT NULL, amount_cents integer NOT NULL, currency text NOT NULL DEFAULT 'CLP', category text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', service_id text, created_by text, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE admin_settings (key text PRIMARY KEY, value text NOT NULL DEFAULT '');
    CREATE TABLE clinical_centers (id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE clinic_transcription_settings (center_id text PRIMARY KEY, monthly_quota integer NOT NULL DEFAULT 100, advanced_enabled boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE clinic_transcription_usage (id text PRIMARY KEY, center_id text NOT NULL, photo_id text NOT NULL, tier text NOT NULL, model text NOT NULL, units integer NOT NULL DEFAULT 1, input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
  `);
});

const supra = (role: "director" | "supra_admin" = "director") => `clinivista_session=${createSession({ userId: "d1", centerId: null, role })}`;
const clinic = () => `clinivista_session=${createSession({ userId: "u1", centerId: "c1", role: "administrativo" })}`;

describe("acceso", () => {
  it("solo directores", async () => {
    await request(app).get("/api/supra/admin/services").expect(401);
    await request(app).get("/api/supra/admin/finance").set("Cookie", clinic()).expect(403);
    await request(app).post("/api/supra/admin/finance").set("Cookie", clinic()).send({}).expect(403);
    for (const url of ["services", "banner", "finance", "finance/export"]) await request(app).get(`/api/supra/admin/${url}`).set("Cookie", supra("supra_admin")).expect(403);
    await request(app).post("/api/supra/admin/services/seed").set("Cookie", supra("supra_admin")).expect(403);
    await request(app).get("/api/supra/admin/services").set("Cookie", supra()).expect(200);
  });
});

describe("finanzas", () => {
  const entry = (o: object = {}) => ({ kind: "expense", date: "2026-10-05", amount: 25.5, currency: "USD", category: "Hosting", note: "Render", ...o });

  it("valida los datos", async () => {
    const post = (b: object) => request(app).post("/api/supra/admin/finance").set("Cookie", supra()).send(b);
    await post(entry({ kind: "otro" })).expect(400);
    await post(entry({ date: "2026-02-31" })).expect(400);
    await post(entry({ date: "05/10/2026" })).expect(400);
    await post(entry({ amount: 0 })).expect(400);
    await post(entry({ amount: -4 })).expect(400);
    await post(entry({ currency: "BTC" })).expect(400);
  });

  it("registra, suma por mes y moneda, edita y borra", async () => {
    const post = (b: object) => request(app).post("/api/supra/admin/finance").set("Cookie", supra());
    const e1 = (await post({}).send(entry()).expect(201)).body;
    await post({}).send(entry({ kind: "income", amount: 100, category: "Clínica Aurora" })).expect(201);
    await post({}).send(entry({ kind: "expense", amount: 40000, currency: "CLP", date: "2026-10-20" })).expect(201);
    await post({}).send(entry({ date: "2026-09-10", amount: 10 })).expect(201);

    const oct = (await request(app).get("/api/supra/admin/finance?month=2026-10").set("Cookie", supra()).expect(200)).body;
    expect(oct.entries).toHaveLength(3);
    expect(oct.totals.USD).toEqual({ income: 100, expense: 25.5, balance: 74.5 });
    expect(oct.totals.CLP).toEqual({ income: 0, expense: 40000, balance: -40000 });
    expect(oct.history).toHaveLength(12);
    expect(oct.history.at(-1).month).toBe("2026-10");
    expect(oct.history.at(-2).totals.USD.expense).toBe(10);

    await request(app).patch(`/api/supra/admin/finance/${e1.id}`).set("Cookie", supra()).send(entry({ amount: 30 })).expect(200);
    const after = (await request(app).get("/api/supra/admin/finance?month=2026-10").set("Cookie", supra())).body;
    expect(after.totals.USD.expense).toBe(30);
    await request(app).delete(`/api/supra/admin/finance/${e1.id}`).set("Cookie", supra()).expect(200);
    await request(app).delete(`/api/supra/admin/finance/${e1.id}`).set("Cookie", supra()).expect(404);
  });

  it("exporta CSV y neutraliza fórmulas", async () => {
    await request(app).post("/api/supra/admin/finance").set("Cookie", supra()).send(entry({ note: "=HYPERLINK(\"x\")", category: "a;b" })).expect(201);
    const res = await request(app).get("/api/supra/admin/finance/export?month=2026-10").set("Cookie", supra()).expect(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Fecha;Tipo;Monto;Moneda;Categoría;Nota");
    expect(res.text).toContain("'=HYPERLINK");
    expect(res.text).toContain('"a;b"');
  });
});

describe("costo de la IA", () => {
  const usage = (id: string, center: string, tier: string, input: number, output: number, at: string, units = tier === "advanced" ? 2 : 1) =>
    pglite.exec(`INSERT INTO clinic_transcription_usage (id, center_id, photo_id, tier, model, units, input_tokens, output_tokens, created_at) VALUES ('${id}', '${center}', 'p', '${tier}', 'm', ${units}, ${input}, ${output}, '${at}');`);

  it("suma tokens y costo del mes por clínica y por nivel, con historial de 12 meses", async () => {
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('ca', 'Clínica Alfa', 'ca'), ('cb', 'Clínica Beta', 'cb') ON CONFLICT DO NOTHING;
      INSERT INTO clinic_transcription_settings (center_id, monthly_quota) VALUES ('ca', 250) ON CONFLICT DO NOTHING;`);
    await usage("u1", "ca", "basic", 2000, 600, "2026-10-05T12:00:00Z");
    await usage("u2", "ca", "advanced", 2000, 600, "2026-10-06T12:00:00Z");
    await usage("u3", "cb", "basic", 1_000_000, 0, "2026-10-07T12:00:00Z");
    await usage("u4", "ca", "basic", 2000, 600, "2026-09-10T12:00:00Z");
    await usage("u5", "ca", "basic", 2000, 600, "2026-11-01T00:00:00Z"); // fuera del mes

    const res = (await request(app).get("/api/supra/admin/finance/ai-usage?month=2026-10").set("Cookie", supra()).expect(200)).body;
    // básico: 2000×0,10 + 600×0,50 = 500 / 1e6 · avanzado: 2000×2 + 600×10 = 10000 / 1e6 · Beta: 1e6 × 0,10 = 0,10 USD
    expect(res.totals.calls).toBe(3);
    expect(res.totals.units).toBe(4);
    expect(res.totals.inputTokens).toBe(1_004_000);
    expect(res.totals.costUsd).toBeCloseTo(0.0005 + 0.01 + 0.1, 6);
    expect(res.byTier.find((t: { tier: string }) => t.tier === "advanced")).toMatchObject({ calls: 1, units: 2 });
    expect(res.byClinic.map((c: { name: string }) => c.name)).toEqual(["Clínica Beta", "Clínica Alfa"]);
    expect(res.byClinic.find((c: { centerId: string }) => c.centerId === "ca")).toMatchObject({ monthlyQuota: 250, calls: 2, units: 3 });
    expect(res.history).toHaveLength(12);
    expect(res.history.at(-1)).toMatchObject({ month: "2026-10", calls: 3 });
    expect(res.history.at(-2)).toMatchObject({ month: "2026-09", calls: 1 });
    expect(res.rates.basic).toMatchObject({ input: 0.1, output: 0.5 });
  });

  it("solo la ven los directores", async () => {
    await request(app).get("/api/supra/admin/finance/ai-usage").set("Cookie", clinic()).expect(403);
    await request(app).get("/api/supra/admin/finance/ai-usage").set("Cookie", supra("supra_admin")).expect(403);
    await request(app).get("/api/supra/admin/finance/ai-usage").expect(401);
  });
});

describe("servicios", () => {
  it("carga los habituales una sola vez y permite editar", async () => {
    const seed = await request(app).post("/api/supra/admin/services/seed").set("Cookie", supra()).expect(200);
    expect(seed.body.added).toBe(8);
    expect((await request(app).post("/api/supra/admin/services/seed").set("Cookie", supra())).body.added).toBe(0);
    const list = (await request(app).get("/api/supra/admin/services").set("Cookie", supra())).body;
    expect(list.services).toHaveLength(8);
    expect(list.checks.map((c: { key: string }) => c.key)).toEqual(["database", "storage", "email", "google", "dns", "https", "github", "claude"]);
    const render = list.services.find((s: { name: string }) => s.name === "Render");
    const patched = (await request(app).patch(`/api/supra/admin/services/${render.id}`).set("Cookie", supra()).send({ cost: 7, plan: "Starter", renewalDate: "2026-11-01" }).expect(200)).body;
    expect(patched).toMatchObject({ cost: 7, plan: "Starter", renewalDate: "2026-11-01" });
    await request(app).patch(`/api/supra/admin/services/${render.id}`).set("Cookie", supra()).send({ renewalDate: "mañana" }).expect(400);
    await request(app).post("/api/supra/admin/services").set("Cookie", supra()).send({ name: "" }).expect(400);
    const created = (await request(app).post("/api/supra/admin/services").set("Cookie", supra()).send({ name: "Uptime", cost: "9,5", currency: "USD" }).expect(201)).body;
    expect(created.cost).toBe(9.5);
    await request(app).delete(`/api/supra/admin/services/${created.id}`).set("Cookie", supra()).expect(200);
  });

  it("guarda y valida los correos de alerta", async () => {
    await request(app).put("/api/supra/admin/alert-emails").set("Cookie", supra()).send({ emails: ["no-es-correo"] }).expect(400);
    const ok = await request(app).put("/api/supra/admin/alert-emails").set("Cookie", supra()).send({ emails: ["Jose@Ejemplo.cl", "jose@ejemplo.cl", "juan@ejemplo.cl"] }).expect(200);
    expect(ok.body.alertEmails).toEqual(["jose@ejemplo.cl", "juan@ejemplo.cl"]);
    expect((await request(app).get("/api/supra/admin/services").set("Cookie", supra())).body.alertEmails).toEqual(["jose@ejemplo.cl", "juan@ejemplo.cl"]);
  });
});

describe("alertas del monitor", () => {
  const fail: CheckResult = { key: "storage", status: "fail", detail: "claves rechazadas" };
  const ok: CheckResult = { key: "storage", status: "ok", detail: "bien" };

  it("avisa tras dos fallos seguidos, recuerda a las 24 h y avisa la recuperación", async () => {
    const send = vi.fn(async () => {});
    const t0 = new Date("2026-10-21T10:00:00Z");
    await applyResults([fail], t0, send);
    expect(send).not.toHaveBeenCalled();
    await applyResults([fail], new Date(t0.getTime() + 5 * 60_000), send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(String(send.mock.calls[0]![0])).toContain("falla");
    await applyResults([fail], new Date(t0.getTime() + 10 * 60_000), send);
    expect(send).toHaveBeenCalledTimes(1);
    await applyResults([fail], new Date(t0.getTime() + 25 * 3600_000), send);
    expect(send).toHaveBeenCalledTimes(2);
    await applyResults([ok], new Date(t0.getTime() + 26 * 3600_000), send);
    expect(send).toHaveBeenCalledTimes(3);
    expect(String(send.mock.calls[2]![0])).toContain("recuperó");
    await applyResults([ok], new Date(t0.getTime() + 27 * 3600_000), send);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("un fallo aislado que se recupera no avisa", async () => {
    const send = vi.fn(async () => {});
    const other = (status: "fail" | "ok"): CheckResult => ({ key: "database", status, detail: "" });
    await applyResults([other("fail")], new Date(), send);
    await applyResults([other("ok")], new Date(), send);
    expect(send).not.toHaveBeenCalled();
  });

  it("avisa una sola vez cada renovación próxima y las muestra en el aviso del panel", async () => {
    const send = vi.fn(async () => {});
    const now = new Date("2026-10-30T15:00:00Z");
    expect(await alertRenewals(now, send)).toBe(1); // Render vence 2026-11-01
    expect(await alertRenewals(now, send)).toBe(0);
    const banner = (await request(app).get("/api/supra/admin/banner").set("Cookie", supra())).body;
    expect(Array.isArray(banner.problems)).toBe(true);
    expect(Array.isArray(banner.renewals)).toBe(true);
  });
});

describe("cuenta de Claude", () => {
  const withFetch = (status: number, body: unknown = {}) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
  const restore = () => { vi.unstubAllGlobals(); delete process.env.ANTHROPIC_API_KEY; };

  it("con clave: válida, rechazada, límite y caída", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    withFetch(200); expect((await checkClaude()).status).toBe("ok");
    withFetch(401); expect((await checkClaude()).status).toBe("fail");
    withFetch(403); expect((await checkClaude()).status).toBe("fail");
    withFetch(429); expect((await checkClaude()).status).toBe("warn");
    withFetch(500); expect((await checkClaude()).status).toBe("fail");
    restore();
  });

  it("sin clave usa el estado público", async () => {
    withFetch(200, { status: { indicator: "none" } });
    const ok = await checkClaude();
    expect(ok.status).toBe("ok");
    expect(ok.detail).toContain("ANTHROPIC_API_KEY");
    withFetch(200, { status: { indicator: "major", description: "Partial outage" } });
    expect((await checkClaude()).status).toBe("warn");
    restore();
  });
});

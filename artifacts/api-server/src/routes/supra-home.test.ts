/**
 * Inicio de supra-control: /supra/overview/monthly, /supra/activity y
 * /supra/clinics/recent. Solo director y supra_admin; meses completos con ceros
 * en hora de Chile; límites; y ningún dato de pacientes en las respuestas.
 * Datos ficticios.
 */
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
import supraHomeRouter from "./supra-home";
import { createSession } from "../lib/sessions";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", supraHomeRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE clinical_centers (id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar', plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'unlimited', 'titanium')), created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE leads (id text PRIMARY KEY, name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', center_id text DEFAULT 'default-center', parent_lead_id text, is_demo boolean DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE clinical_evaluations (id text PRIMARY KEY, lead_id text NOT NULL UNIQUE, center_id text NOT NULL DEFAULT 'default-center');
    CREATE TABLE clinical_photos (id text PRIMARY KEY, evaluation_id text NOT NULL, status text NOT NULL DEFAULT 'draft', original_mime_type text NOT NULL DEFAULT 'image/jpeg', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE support_tickets (id text PRIMARY KEY, requester_user_id text NOT NULL, center_id text NOT NULL, subject text NOT NULL, status text NOT NULL DEFAULT 'waiting', created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz, closed_at timestamptz);
    CREATE TABLE admin_service_status (check_key text PRIMARY KEY, status text NOT NULL DEFAULT 'unknown', detail text NOT NULL DEFAULT '', checked_at timestamptz NOT NULL DEFAULT now(), changed_at timestamptz NOT NULL DEFAULT now());
  `);
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-15T15:00:00Z"));
  await pglite.exec(`TRUNCATE clinical_centers, leads, clinical_evaluations, clinical_photos, support_tickets, admin_service_status;`);
});
afterEach(() => vi.useRealTimers());

const supra = (role: "director" | "supra_admin" = "director") => `clinivista_session=${createSession({ userId: "d1", centerId: null, role })}`;
const clinicStaff = (role: "medico" | "administrativo") => `clinivista_session=${createSession({ userId: "u1", centerId: "c1", role })}`;

const seed = () => pglite.exec(`
  INSERT INTO clinical_centers (id, name, slug, specialty, plan, logo_data_url, created_at) VALUES
    ('c1', 'Clínica Norte', 'norte', 'dermatologia', 'titanium', 'data:image/png;base64,AAAA', '2026-08-03T15:00:00Z'),
    ('c2', 'Clínica Sur', 'sur', 'capilar', 'basic', NULL, '2026-10-05T15:00:00Z');
  INSERT INTO leads (id, name, phone, center_id, parent_lead_id, is_demo, created_at) VALUES
    ('p1', 'Ana Secreta', '+56911111111', 'c1', NULL, false, '2026-08-10T15:00:00Z'),
    ('p2', 'Bruno Secreto', '+56922222222', 'c1', NULL, false, '2026-10-02T15:00:00Z'),
    ('p2b', 'Bruno Secreto', '+56922222222', 'c1', 'p2', false, '2026-10-03T15:00:00Z'),
    ('demo', 'Demo', '', 'c2', NULL, true, '2026-10-04T15:00:00Z'),
    ('p3', 'Carla Secreta', '+56933333333', 'c2', NULL, false, '2026-10-06T15:00:00Z');
  INSERT INTO clinical_evaluations (id, lead_id, center_id) VALUES ('e1', 'p1', 'c1'), ('e2', 'p2', 'c1'), ('ed', 'demo', 'c2');
  INSERT INTO clinical_photos (id, evaluation_id, status, original_mime_type, created_at) VALUES
    ('f1', 'e1', 'confirmed', 'image/jpeg', '2026-08-10T16:00:00Z'),
    ('f2', 'e2', 'draft', 'image/jpeg', '2026-10-02T16:00:00Z'),
    ('f3', 'e2', 'discarded', 'image/jpeg', '2026-10-02T16:00:00Z'),
    ('f4', 'e2', 'confirmed', 'video/mp4', '2026-10-02T16:00:00Z'),
    ('fd', 'ed', 'confirmed', 'image/jpeg', '2026-10-04T16:00:00Z');
  INSERT INTO support_tickets (id, requester_user_id, center_id, subject, status, created_at, resolved_at, closed_at) VALUES
    ('t1', 'u1', 'c1', 'Problema con la ficha de Ana Secreta', 'resolved', '2026-10-10T12:00:00Z', '2026-10-11T12:00:00Z', NULL),
    ('t2', 'u1', 'c2', 'No carga', 'waiting', '2026-10-12T12:00:00Z', NULL, NULL);
  INSERT INTO admin_service_status (check_key, status, detail, changed_at) VALUES
    ('storage', 'fail', 'detalle interno', '2026-10-13T12:00:00Z'), ('database', 'ok', 'ok', '2026-10-14T12:00:00Z');
`);

describe("permisos", () => {
  it.each(["/api/supra/overview/monthly", "/api/supra/activity", "/api/supra/clinics/recent"])("%s: solo director y supra_admin", async (url) => {
    await request(app).get(url).expect(401);
    await request(app).get(url).set("Cookie", clinicStaff("medico")).expect(403);
    await request(app).get(url).set("Cookie", clinicStaff("administrativo")).expect(403);
    await request(app).get(url).set("Cookie", supra("director")).expect(200);
    await request(app).get(url).set("Cookie", supra("supra_admin")).expect(200);
  });
});

describe("GET /supra/overview/monthly", () => {
  it("sin datos: todos los meses en cero (6 por defecto)", async () => {
    const res = await request(app).get("/api/supra/overview/monthly").set("Cookie", supra()).expect(200);
    expect(res.body.monthly.map((m: { month: string }) => m.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(res.body.monthly.every((m: Record<string, unknown>) => m.patients === 0 && m.photos === 0 && m.clinics === 0)).toBe(true);
  });

  it("cuenta pacientes reales, fotos vigentes y clínicas por mes, de todas las clínicas", async () => {
    await seed();
    const res = await request(app).get("/api/supra/overview/monthly?months=3").set("Cookie", supra("supra_admin")).expect(200);
    expect(res.body.monthly).toEqual([
      { month: "2026-08", patients: 1, photos: 1, clinics: 1 },
      { month: "2026-09", patients: 0, photos: 0, clinics: 0 },
      // Sin la consulta adicional ni el paciente demo; sin fotos descartadas, videos ni fotos demo.
      { month: "2026-10", patients: 2, photos: 1, clinics: 1 },
    ]);
  });

  it("agrupa en hora de Chile y acepta solo 3, 6 o 12 meses", async () => {
    // 2026-10-01 02:00 UTC = 30 de septiembre en Chile.
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug, created_at) VALUES ('edge', 'Borde', 'borde', '2026-10-01T02:00:00Z');`);
    const res = await request(app).get("/api/supra/overview/monthly?months=3").set("Cookie", supra()).expect(200);
    expect(res.body.monthly.find((m: { month: string }) => m.month === "2026-09").clinics).toBe(1);
    const len = async (q: string) => (await request(app).get(`/api/supra/overview/monthly${q}`).set("Cookie", supra())).body.monthly.length;
    expect(await len("?months=12")).toBe(12);
    expect(await len("?months=7")).toBe(6);
  });
});

describe("GET /supra/activity", () => {
  it("eventos de plataforma, los más nuevos primero, sin datos de pacientes ni asuntos de tickets", async () => {
    await seed();
    const res = await request(app).get("/api/supra/activity").set("Cookie", supra()).expect(200);
    expect(res.body.events).toEqual([
      { type: "service_alert", clinicName: null, serviceLabel: "Fotos clínicas (almacenamiento R2)", at: "2026-10-13T12:00:00.000Z" },
      { type: "ticket_opened", clinicName: "Clínica Sur", serviceLabel: null, at: "2026-10-12T12:00:00.000Z" },
      { type: "ticket_resolved", clinicName: "Clínica Norte", serviceLabel: null, at: "2026-10-11T12:00:00.000Z" },
      { type: "ticket_opened", clinicName: "Clínica Norte", serviceLabel: null, at: "2026-10-10T12:00:00.000Z" },
      { type: "clinic_created", clinicName: "Clínica Sur", serviceLabel: null, at: "2026-10-05T15:00:00.000Z" },
      { type: "clinic_created", clinicName: "Clínica Norte", serviceLabel: null, at: "2026-08-03T15:00:00.000Z" },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/Secret|5691|5692|5693|Problema|No carga|detalle interno|p1|p2|p3/);
  });

  it("respeta el límite (8 por defecto, de 1 a 20) y sin datos devuelve una lista vacía", async () => {
    expect((await request(app).get("/api/supra/activity").set("Cookie", supra())).body).toEqual({ events: [] });
    const values = Array.from({ length: 25 }, (_, i) => `('k${i}', 'C ${i}', 'k${i}', '2026-09-${String(1 + i).padStart(2, "0")}T12:00:00Z')`).join(",");
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug, created_at) VALUES ${values};`);
    const count = async (q: string) => (await request(app).get(`/api/supra/activity${q}`).set("Cookie", supra())).body.events.length;
    expect(await count("")).toBe(8);
    expect(await count("?limit=3")).toBe(3);
    expect(await count("?limit=99")).toBe(20);
    expect(await count("?limit=0")).toBe(1);
  });
});

describe("GET /supra/clinics/recent", () => {
  it("clínicas más nuevas con especialidad, plan, logo y cantidad de pacientes reales", async () => {
    await seed();
    const res = await request(app).get("/api/supra/clinics/recent").set("Cookie", supra()).expect(200);
    expect(res.body.clinics).toEqual([
      { id: "c2", name: "Clínica Sur", specialty: "capilar", patients: 1, logo: null, createdAt: "2026-10-05T15:00:00.000Z", plan: "basic" },
      { id: "c1", name: "Clínica Norte", specialty: "dermatologia", patients: 2, logo: "data:image/png;base64,AAAA", createdAt: "2026-08-03T15:00:00.000Z", plan: "titanium" },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/Secret|5691/);
  });

  it("respeta el límite (6 por defecto) y sin clínicas devuelve una lista vacía", async () => {
    expect((await request(app).get("/api/supra/clinics/recent").set("Cookie", supra())).body).toEqual({ clinics: [] });
    const values = Array.from({ length: 9 }, (_, i) => `('k${i}', 'C ${i}', 'k${i}', '2026-09-0${1 + i}T12:00:00Z')`).join(",");
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug, created_at) VALUES ${values};`);
    const res = await request(app).get("/api/supra/clinics/recent").set("Cookie", supra()).expect(200);
    expect(res.body.clinics.map((c: { id: string }) => c.id)).toEqual(["k8", "k7", "k6", "k5", "k4", "k3"]);
    expect((await request(app).get("/api/supra/clinics/recent?limit=2").set("Cookie", supra())).body.clinics).toHaveLength(2);
  });
});

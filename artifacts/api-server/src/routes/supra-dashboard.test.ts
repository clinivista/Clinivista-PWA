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
import dashboardRouter, { trafficLight } from "./supra-dashboard";
import { createSession } from "../lib/sessions";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", dashboardRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE clinical_centers (id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar', plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'unlimited', 'titanium')), created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE clinical_evaluations (id text PRIMARY KEY, lead_id text NOT NULL UNIQUE, center_id text NOT NULL DEFAULT 'default-center', protocol_id text NOT NULL DEFAULT 'capillary-initial', status text NOT NULL DEFAULT 'draft', clinical_data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE clinical_photos (id text PRIMARY KEY, evaluation_id text NOT NULL, view_id text NOT NULL, status text NOT NULL DEFAULT 'draft', original_object_path text NOT NULL, derivative_object_path text, original_mime_type text NOT NULL, original_bytes integer NOT NULL, original_sha256 text NOT NULL, width integer, height integer, source text NOT NULL DEFAULT 'upload', capture_metadata jsonb NOT NULL DEFAULT '{}', edit_params jsonb, note text, created_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz, discarded_at timestamptz);
    CREATE TABLE clinical_photo_transcriptions (photo_id text PRIMARY KEY, text text NOT NULL DEFAULT '', tier text NOT NULL DEFAULT 'basic', model text NOT NULL DEFAULT '', transcribed_by_user_id text, transcribed_by_name text, transcribed_at timestamptz NOT NULL DEFAULT now(), edited_by_name text, edited_at timestamptz);
    CREATE TABLE users (id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL, password_hash text NOT NULL, name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', role text NOT NULL, center_id text, active boolean NOT NULL DEFAULT true, legal_representative boolean NOT NULL DEFAULT false, reset_token_hash text, reset_token_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE leads (parent_lead_id text, id text PRIMARY KEY, is_demo boolean DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE support_tickets (id text PRIMARY KEY, number serial NOT NULL, requester_user_id text NOT NULL, center_id text NOT NULL, subject text NOT NULL, status text NOT NULL DEFAULT 'waiting', language text NOT NULL DEFAULT 'es', created_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz NOT NULL DEFAULT now(), first_response_at timestamptz, resolved_at timestamptz, resolved_by_user_id text, closed_at timestamptz, rating integer, rating_comment text NOT NULL DEFAULT '');
    CREATE TABLE finance_entries (id text PRIMARY KEY, kind text NOT NULL, entry_date text NOT NULL, amount_cents integer NOT NULL, currency text NOT NULL DEFAULT 'CLP', category text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', service_id text, created_by text, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE admin_service_status (check_key text PRIMARY KEY, status text NOT NULL DEFAULT 'unknown', detail text NOT NULL DEFAULT '', checked_at timestamptz NOT NULL DEFAULT now(), changed_at timestamptz NOT NULL DEFAULT now(), failures integer NOT NULL DEFAULT 0, alerted boolean NOT NULL DEFAULT false, last_alert_at timestamptz);
    CREATE TABLE admin_services (id text PRIMARY KEY, name text NOT NULL, provider text NOT NULL DEFAULT '', plan text NOT NULL DEFAULT '', cost_cents integer NOT NULL DEFAULT 0, currency text NOT NULL DEFAULT 'USD', billing_cycle text NOT NULL DEFAULT 'monthly', renewal_date text, renewal_alerted_for text, notes text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE admin_settings (key text PRIMARY KEY, value text NOT NULL DEFAULT '');
    INSERT INTO clinical_centers (id, name, slug, active, paid_until) VALUES
      ('c1','Al día','al-dia', true, now() + interval '60 days'),
      ('c2','Por vencer','por-vencer', true, now() + interval '3 days'),
      ('c3','Vencida','vencida', false, now() - interval '5 days'),
      ('c4','Sin registro','sin-registro', true, null);
    INSERT INTO users (id,email,email_normalized,password_hash,role,center_id,active) VALUES
      ('u1','a@x.cl','a@x.cl','h','medico','c1',true), ('u2','b@x.cl','b@x.cl','h','administrativo','c1',true),
      ('u3','c@x.cl','c@x.cl','h','medico','c2',false), ('u4','d@x.cl','d@x.cl','h','director',null,true), ('u5','e@x.cl','e@x.cl','h','supra_admin',null,true);
    INSERT INTO leads (id,is_demo,created_at) VALUES ('p1',false,now()), ('p2',false,now() - interval '90 days'), ('p3',true,now());
    INSERT INTO support_tickets (id, requester_user_id, center_id, subject, status, created_at, first_response_at, resolved_at, rating) VALUES
      ('t1','u1','c1','a','waiting', now(), null, null, null),
      ('t2','u1','c1','b','attending', now(), now() + interval '10 minutes', null, null),
      ('t3','u1','c1','c','closed', now(), now() + interval '20 minutes', now(), 5),
      ('t4','u1','c1','d','closed', now(), now() + interval '30 minutes', now(), 4);
    INSERT INTO finance_entries (id, kind, entry_date, amount_cents, currency) VALUES
      ('f1','income', to_char(now() at time zone 'America/Santiago','YYYY-MM-DD'), 100000, 'CLP'),
      ('f2','expense', to_char(now() at time zone 'America/Santiago','YYYY-MM-DD'), 25000, 'CLP');
  `);
});

const supra = (role: "director" | "supra_admin" = "director") => `clinivista_session=${createSession({ userId: "d1", centerId: null, role })}`;
const clinic = () => `clinivista_session=${createSession({ userId: "u1", centerId: "c1", role: "administrativo" })}`;

describe("trafficLight", () => {
  it("rojo si algo falla, amarillo si hay alerta, verde si todo funciona", () => {
    expect(trafficLight(["ok", "ok"])).toBe("green");
    expect(trafficLight(["ok", "warn"])).toBe("yellow");
    expect(trafficLight(["ok", "warn", "fail"])).toBe("red");
    expect(trafficLight(["unknown", "unknown"])).toBe("unknown");
    expect(trafficLight([])).toBe("unknown");
    expect(trafficLight(["unknown", "ok"])).toBe("green");
  });
});

describe("GET /supra/dashboard", () => {
  beforeAll(async () => {
    await pglite.exec(`
      INSERT INTO clinical_evaluations (id, lead_id, center_id) VALUES ('ev1', 'l1', 'clinic-a'), ('ev2', 'l2', 'clinic-b');
      INSERT INTO clinical_photos (id, evaluation_id, view_id, status, original_object_path, original_mime_type, original_bytes, original_sha256) VALUES
        ('ph1', 'ev1', 'v', 'confirmed', 'x', 'image/jpeg', 1, 'h'), ('ph2', 'ev2', 'v', 'draft', 'x', 'image/jpeg', 1, 'h'),
        ('ph3', 'ev2', 'v', 'confirmed', 'x', 'image/jpeg', 1, 'h'), ('ph4', 'ev1', 'v', 'discarded', 'x', 'image/jpeg', 1, 'h');
      INSERT INTO clinical_photo_transcriptions (photo_id, text, tier) VALUES
        ('ph1', 'texto', 'basic'), ('ph2', 'texto', 'advanced'), ('ph3', 'a mano', 'manual'), ('ph4', 'descartada', 'basic');
    `);
  });

  it("exige sesión de supra-control", async () => {
    await request(app).get("/api/supra/dashboard").expect(401);
    await request(app).get("/api/supra/dashboard").set("Cookie", clinic()).expect(403);
  });

  it("devuelve las estadísticas y las finanzas solo al director", async () => {
    const body = (await request(app).get("/api/supra/dashboard").set("Cookie", supra()).expect(200)).body;
    expect(body.clinics).toMatchObject({ total: 4, active: 3, suspended: 1, payments: { upToDate: 1, expiring: 1, overdue: 1, noRecord: 1 } });
    expect(body.users).toMatchObject({ total: 5, active: 4, blocked: 1, medicos: 2, administrativos: 1, supra: 2 });
    expect(body.patients).toEqual({ total: 2, newThisMonth: 1 });
    // Solo cuentan los documentos transcritos con IA (no los escritos a mano) de fotos vigentes, de todas las clínicas.
    expect(body.documents).toEqual({ transcribed: 2, transcribedThisMonth: 2 });
    expect(body.tickets).toMatchObject({ waiting: 1, attending: 1, closed: 2, pending: 2, attendedTotal: 3, ratingAverage: 4.5, ratingCount: 2, firstResponseMinutes: 20 });
    expect(["green", "yellow", "red", "unknown"]).toContain(body.services.light);
    expect(Array.isArray(body.services.checks)).toBe(true);
    expect(body.finance.totals.CLP).toEqual({ income: 1000, expense: 250, balance: 750 });

    const admin = (await request(app).get("/api/supra/dashboard").set("Cookie", supra("supra_admin")).expect(200)).body;
    expect(admin.finance).toBeNull();
    expect(admin.clinics.total).toBe(4);
  });
});

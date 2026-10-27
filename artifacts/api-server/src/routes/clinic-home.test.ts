/**
 * Inicio del dashboard de clínica: /clinic/overview y /clinic/activity. Solo lecturas
 * agregadas de la clínica de la sesión (nada de otra clínica), meses completos con
 * ceros, en hora de Chile, y «Profesionales activos» solo para quien gestiona usuarios.
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
import clinicHomeRouter, { monthWindow } from "./clinic-home";
import { createSession } from "../lib/sessions";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", clinicHomeRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL,
      password_hash text NOT NULL, name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', role text NOT NULL,
      center_id text, active boolean NOT NULL DEFAULT true,
      legal_representative boolean NOT NULL DEFAULT false,
      reset_token_hash text, reset_token_expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS leads (
      id text PRIMARY KEY, token text NOT NULL UNIQUE, name text NOT NULL DEFAULT '', notes text DEFAULT '',
      center_id text DEFAULT 'default-center', parent_lead_id text, discharged_at timestamptz, discharge_note text DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_evaluations (
      id text PRIMARY KEY, lead_id text NOT NULL UNIQUE, center_id text NOT NULL DEFAULT 'default-center'
    );
    CREATE TABLE IF NOT EXISTS clinical_photos (
      id text PRIMARY KEY, evaluation_id text NOT NULL, view_id text NOT NULL DEFAULT 'v', status text NOT NULL DEFAULT 'draft',
      original_mime_type text NOT NULL DEFAULT 'image/jpeg', note text, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_photo_audit_events (
      id text PRIMARY KEY, photo_id text NOT NULL, evaluation_id text NOT NULL, action text NOT NULL,
      actor_type text NOT NULL, actor_id text, details jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-15T15:00:00Z"));
  await pglite.exec(`TRUNCATE users, leads, clinical_evaluations, clinical_photos, clinical_photo_audit_events;`);
  await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, role, center_id, legal_representative, active) VALUES
    ('adm', 'adm@example.com', 'adm@example.com', 'x', 'administrativo', 'clinic-a', false, true),
    ('doc', 'doc@example.com', 'doc@example.com', 'x', 'medico', 'clinic-a', false, true),
    ('rep', 'rep@example.com', 'rep@example.com', 'x', 'medico', 'clinic-a', true, true),
    ('old', 'old@example.com', 'old@example.com', 'x', 'medico', 'clinic-a', false, false),
    ('b-doc', 'b@example.com', 'b@example.com', 'x', 'medico', 'clinic-b', false, true),
    ('dir', 'dir@example.com', 'dir@example.com', 'x', 'director', NULL, false, true);`);
});

afterEach(() => vi.useRealTimers());

const cookie = (userId: string, role: "medico" | "administrativo", centerId = "clinic-a") => `clinivista_session=${createSession({ userId, centerId, role })}`;
const directorInside = (legal: boolean) => `clinivista_session=${createSession({ userId: "dir", centerId: null, role: "director", viewingCenterId: "clinic-a", viewingLegal: legal })}`;

const patient = (id: string, at: string, center = "clinic-a", extra: { parent?: string; discharged?: string; name?: string } = {}) =>
  pglite.exec(`INSERT INTO leads (id, token, name, center_id, parent_lead_id, discharged_at, created_at, notes) VALUES
    ('${id}', 't-${id}', '${extra.name ?? `Paciente ${id}`}', '${center}', ${extra.parent ? `'${extra.parent}'` : "NULL"}, ${extra.discharged ? `'${extra.discharged}'` : "NULL"}, '${at}', 'nota clínica secreta');
    INSERT INTO clinical_evaluations (id, lead_id, center_id) VALUES ('ev-${id}', '${id}', '${center}');`);
const photo = (id: string, leadId: string, at: string, status = "confirmed", mime = "image/jpeg") =>
  pglite.exec(`INSERT INTO clinical_photos (id, evaluation_id, status, original_mime_type, created_at, note) VALUES ('${id}', 'ev-${leadId}', '${status}', '${mime}', '${at}', 'nota de la foto');`);
const measured = (id: string, photoId: string, leadId: string, at: string, action = "measured") =>
  pglite.exec(`INSERT INTO clinical_photo_audit_events (id, photo_id, evaluation_id, action, actor_type, details, created_at) VALUES ('${id}', '${photoId}', 'ev-${leadId}', '${action}', 'staff', '{"lengthMm": 12}', '${at}');`);

describe("monthWindow", () => {
  it("devuelve los meses completos en hora de Chile, cruzando el año", () => {
    expect(monthWindow(3, new Date("2026-02-10T12:00:00Z"))).toEqual(["2025-12", "2026-01", "2026-02"]);
    // 1 de noviembre 01:00 UTC todavía es 31 de octubre en Chile.
    expect(monthWindow(1, new Date("2026-11-01T01:00:00Z"))).toEqual(["2026-10"]);
    expect(monthWindow(12, new Date("2026-10-15T12:00:00Z"))[0]).toBe("2025-11");
  });
});

describe("GET /clinic/overview", () => {
  it("una clínica vacía recibe todos los meses en cero (6 por defecto)", async () => {
    const res = await request(app).get("/api/clinic/overview").set("Cookie", cookie("adm", "administrativo"));
    expect(res.status).toBe(200);
    expect(res.body.monthly.map((m: { month: string }) => m.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(res.body.monthly.every((m: { patients: number; photos: number }) => m.patients === 0 && m.photos === 0)).toBe(true);
    expect(res.body.totals).toEqual({ patients: 0, photos: 0, thisMonth: 0, activeProfessionals: 3 });
  });

  it("cuenta solo la clínica de la sesión, sin consultas adicionales ni fotos descartadas o videos", async () => {
    await patient("a1", "2026-10-02T15:00:00Z");
    await patient("a2", "2026-08-20T15:00:00Z");
    await patient("a1-extra", "2026-10-05T15:00:00Z", "clinic-a", { parent: "a1" }); // consulta adicional: no es un paciente
    await patient("old", "2025-01-10T15:00:00Z"); // fuera de la ventana: cuenta en el total
    await patient("b1", "2026-10-03T15:00:00Z", "clinic-b");
    for (let i = 0; i < 5; i += 1) await photo(`pa${i}`, "a1", "2026-10-02T15:30:00Z");
    await photo("pdraft", "a2", "2026-08-20T15:30:00Z", "draft");
    await photo("pextra", "a1-extra", "2026-10-05T15:30:00Z"); // las fotos de la consulta adicional sí son fotos
    await photo("pgone", "a1", "2026-10-02T15:30:00Z", "discarded");
    await photo("pvid", "a1", "2026-10-02T15:30:00Z", "confirmed", "video/mp4");
    for (let i = 0; i < 4; i += 1) await photo(`pb${i}`, "b1", "2026-10-03T15:30:00Z");

    const res = await request(app).get("/api/clinic/overview?months=3").set("Cookie", cookie("doc", "medico"));
    expect(res.status).toBe(200);
    expect(res.body.monthly).toEqual([
      { month: "2026-08", patients: 1, photos: 1 },
      { month: "2026-09", patients: 0, photos: 0 },
      { month: "2026-10", patients: 1, photos: 6 },
    ]);
    expect(res.body.totals).toEqual({ patients: 3, photos: 7, thisMonth: 1, activeProfessionals: null });

    const other = await request(app).get("/api/clinic/overview?months=3").set("Cookie", cookie("b-doc", "medico", "clinic-b"));
    expect(other.body.totals).toMatchObject({ patients: 1, photos: 4, thisMonth: 1 });
  });

  it("agrupa por mes en hora de Chile, no en UTC", async () => {
    // 2026-10-01 02:00 UTC = 30 de septiembre 23:00 en Chile.
    await patient("edge", "2026-10-01T02:00:00Z");
    const res = await request(app).get("/api/clinic/overview?months=3").set("Cookie", cookie("adm", "administrativo"));
    expect(res.body.monthly.find((m: { month: string }) => m.month === "2026-09").patients).toBe(1);
    expect(res.body.totals.thisMonth).toBe(0);
  });

  it("acepta 3, 6 o 12 meses; cualquier otro valor usa 6", async () => {
    const len = async (q: string) => (await request(app).get(`/api/clinic/overview${q}`).set("Cookie", cookie("adm", "administrativo"))).body.monthly.length;
    expect(await len("?months=12")).toBe(12);
    expect(await len("?months=3")).toBe(3);
    expect(await len("?months=500")).toBe(6);
    expect(await len("?months=abc")).toBe(6);
  });

  it("«Profesionales activos» solo para administrativos y el representante legal; nunca otra clínica", async () => {
    const pros = async (c: string) => (await request(app).get("/api/clinic/overview").set("Cookie", c)).body.totals.activeProfessionals;
    expect(await pros(cookie("adm", "administrativo"))).toBe(3); // adm, doc, rep (old está inactivo; b-doc es de otra clínica)
    expect(await pros(cookie("rep", "medico"))).toBe(3);
    expect(await pros(cookie("doc", "medico"))).toBeNull();
    // Un director dentro de la clínica no ve Usuarios en el panel: tampoco la cifra.
    expect(await pros(directorInside(true))).toBeNull();
  });

  it("exige una sesión de clínica", async () => {
    expect((await request(app).get("/api/clinic/overview")).status).toBe(401);
    const supra = `clinivista_session=${createSession({ userId: "dir", centerId: null, role: "director" })}`;
    expect((await request(app).get("/api/clinic/overview").set("Cookie", supra)).status).toBe(403);
  });
});

describe("GET /clinic/activity", () => {
  it("lista los eventos reales más nuevos primero, sin datos clínicos", async () => {
    await patient("a1", "2026-10-10T12:00:00Z", "clinic-a", { name: "Ana Ejemplo" });
    for (let i = 0; i < 5; i += 1) await photo(`pa${i}`, "a1", `2026-10-10T12:1${i}:00Z`);
    await measured("m1", "pa0", "a1", "2026-10-11T09:00:00Z");
    await measured("m2", "pa0", "a1", "2026-10-11T10:00:00Z", "measurement_removed"); // no es una medición guardada
    await patient("a2", "2026-10-12T12:00:00Z", "clinic-a", { name: "Bruno Prueba", discharged: "2026-10-14T12:00:00Z" });
    await patient("a2-extra", "2026-10-13T12:00:00Z", "clinic-a", { parent: "a2", name: "Bruno Prueba" });
    await photo("px", "a2-extra", "2026-10-13T12:05:00Z");
    await patient("b1", "2026-10-14T13:00:00Z", "clinic-b", { name: "Otra Clínica" });
    await photo("pb", "b1", "2026-10-14T13:05:00Z");

    const res = await request(app).get("/api/clinic/activity").set("Cookie", cookie("doc", "medico"));
    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([
      { type: "discharged", leadId: "a2", leadName: "Bruno Prueba", at: "2026-10-14T12:00:00.000Z", count: 1 },
      { type: "photos", leadId: "a2", leadName: "Bruno Prueba", at: "2026-10-13T12:05:00.000Z", count: 1 },
      { type: "patient", leadId: "a2", leadName: "Bruno Prueba", at: "2026-10-12T12:00:00.000Z", count: 1 },
      { type: "measured", leadId: "a1", leadName: "Ana Ejemplo", at: "2026-10-11T09:00:00.000Z", count: 1 },
      { type: "photos", leadId: "a1", leadName: "Ana Ejemplo", at: "2026-10-10T12:14:00.000Z", count: 5 },
      { type: "patient", leadId: "a1", leadName: "Ana Ejemplo", at: "2026-10-10T12:00:00.000Z", count: 1 },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/Otra Clínica|secreta|nota de la foto|lengthMm/);
  });

  it("respeta el límite (8 por defecto, de 1 a 20)", async () => {
    for (let i = 0; i < 25; i += 1) await patient(`p${i}`, `2026-10-0${1 + (i % 9)}T1${i % 10}:00:00Z`);
    const count = async (q: string) => (await request(app).get(`/api/clinic/activity${q}`).set("Cookie", cookie("adm", "administrativo"))).body.events.length;
    expect(await count("")).toBe(8);
    expect(await count("?limit=3")).toBe(3);
    expect(await count("?limit=100")).toBe(20);
    expect(await count("?limit=0")).toBe(1);
    expect(await count("?limit=x")).toBe(8);
  });

  it("una clínica vacía recibe una lista vacía y sin sesión es 401", async () => {
    const res = await request(app).get("/api/clinic/activity").set("Cookie", cookie("adm", "administrativo"));
    expect(res.body).toEqual({ events: [] });
    expect((await request(app).get("/api/clinic/activity")).status).toBe(401);
  });
});

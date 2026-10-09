import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
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

const sent: Array<{ to: string; subject: string; text: string }> = [];
vi.mock("../lib/mailer", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/mailer")>();
  return { ...original, sendMail: vi.fn(async (mail: { to: string; subject: string; text: string }) => { sent.push(mail); }) };
});

import * as mockedDb from "@workspace/db";
import { hashPassword } from "@workspace/db";
import authRouter from "./auth";
import { createSession, getSession } from "../lib/sessions";
import { resetThrottleForTests } from "../lib/patient-accounts";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown>; query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }> } }).__pglite;

const app = express();
app.use(express.json());
app.use("/api", authRouter);

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
  `);
});

beforeEach(async () => {
  sent.length = 0;
  resetThrottleForTests();
  await pglite.exec(`TRUNCATE clinical_centers, users;`);
  await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('c1', 'Clínica 1', 'c1'), ('c2', 'Clínica 2', 'c2');
    UPDATE clinical_centers SET active = true;
    INSERT INTO clinical_centers (id, name, slug, active) VALUES ('off', 'Suspendida', 'off', false);`);
  const pw = hashPassword("clave-vieja-1");
  await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id, active) VALUES
    ('dir', 'dir@x.cl', 'dir@x.cl', '${pw}', 'Dir', 'director', NULL, true),
    ('sup', 'sup@x.cl', 'sup@x.cl', '${pw}', 'Sup', 'supra_admin', NULL, true),
    ('doc', 'doc@x.cl', 'doc@x.cl', '${pw}', 'Doc', 'medico', 'c1', true),
    ('adm', 'adm@x.cl', 'adm@x.cl', '${pw}', 'Adm', 'administrativo', 'c1', true),
    ('old', 'old@x.cl', 'old@x.cl', '${pw}', 'Old', 'medico', 'c1', false),
    ('susp', 'susp@x.cl', 'susp@x.cl', '${pw}', 'Susp', 'medico', 'off', true);`);
});

const tokenFromMail = () => decodeURIComponent(sent[0].text.match(/token=([^\s]+)/)![1]);

describe("olvido de clave del personal", () => {
  it.each(["dir", "sup", "doc", "adm"])("envía el enlace a %s y permite elegir una clave nueva", async (id) => {
    const forgot = await request(app).post("/api/auth/forgot").send({ email: `${id}@x.cl`, language: "en" });
    expect(forgot.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(`${id}@x.cl`);
    expect(sent[0].subject).toMatch(/Reset your password/);

    const done = await request(app).post("/api/auth/reset").send({ token: tokenFromMail(), password: "clave-nueva-2" });
    expect(done.status).toBe(200);
    expect((await request(app).post("/api/auth/login").send({ email: `${id}@x.cl`, password: "clave-vieja-1" })).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: `${id}@x.cl`, password: "clave-nueva-2" })).status).toBe(200);
  });

  it("responde igual y no envía nada si la cuenta no existe, está desactivada o su clínica está suspendida", async () => {
    for (const email of ["nadie@x.cl", "old@x.cl", "susp@x.cl"]) {
      const res = await request(app).post("/api/auth/forgot").send({ email });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    }
    expect(sent).toHaveLength(0);
  });

  it("el enlace sirve una sola vez y no se guarda en claro", async () => {
    await request(app).post("/api/auth/forgot").send({ email: "doc@x.cl" });
    const token = tokenFromMail();
    const stored = await pglite.query(`SELECT reset_token_hash FROM users WHERE id = 'doc'`);
    expect(stored.rows[0].reset_token_hash).not.toContain(token);
    expect((await request(app).post("/api/auth/reset").send({ token, password: "clave-nueva-2" })).status).toBe(200);
    expect((await request(app).post("/api/auth/reset").send({ token, password: "otra-clave-3" })).status).toBe(400);
  });

  it("rechaza enlaces vencidos, inventados y claves cortas", async () => {
    await request(app).post("/api/auth/forgot").send({ email: "doc@x.cl" });
    const token = tokenFromMail();
    expect((await request(app).post("/api/auth/reset").send({ token, password: "corta" })).status).toBe(400);
    expect((await request(app).post("/api/auth/reset").send({ token: "x".repeat(43), password: "clave-nueva-2" })).status).toBe(400);
    await pglite.exec(`UPDATE users SET reset_token_expires_at = now() - interval '1 minute' WHERE id = 'doc'`);
    expect((await request(app).post("/api/auth/reset").send({ token, password: "clave-nueva-2" })).status).toBe(400);
  });

  it("cierra las sesiones abiertas de esa persona al cambiar la clave", async () => {
    const session = createSession({ userId: "doc", centerId: "c1", role: "medico" });
    await request(app).post("/api/auth/forgot").send({ email: "doc@x.cl" });
    await request(app).post("/api/auth/reset").send({ token: tokenFromMail(), password: "clave-nueva-2" });
    expect(getSession(session)).toBeUndefined();
  });

  it("limita las solicitudes repetidas del mismo correo", async () => {
    for (let i = 0; i < 6; i++) await request(app).post("/api/auth/forgot").send({ email: "doc@x.cl" });
    expect(sent).toHaveLength(3);
  });
});

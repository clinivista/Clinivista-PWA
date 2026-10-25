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

import * as mockedDb from "@workspace/db";
import { hashPassword, verifyPassword } from "@workspace/db";
import directorAccountRouter from "./director-account";
import authRouter from "./auth";
import { createSession, getSession } from "../lib/sessions";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown>; query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }> } }).__pglite;

const app = express();
app.use(express.json());
app.use("/api", directorAccountRouter);
app.use("/api", authRouter);

const cookie = (token: string) => `clinivista_session=${token}`;
const directorSession = () => createSession({ userId: "d1", centerId: null, role: "director" });

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS director_preferences (user_id text PRIMARY KEY, entry_profile text NOT NULL DEFAULT 'medico', updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL, password_hash text NOT NULL,
      name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', role text NOT NULL, center_id text,
      active boolean NOT NULL DEFAULT true, legal_representative boolean NOT NULL DEFAULT false,
      reset_token_hash text, reset_token_expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
});

beforeEach(async () => {
  await pglite.exec(`DELETE FROM director_preferences; DELETE FROM users; DELETE FROM clinical_centers;`);
  await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('c1', 'Clínica Uno', 'uno');`);
  const hash = hashPassword("clave-actual-1");
  await pglite.exec(`
    INSERT INTO users (id, email, email_normalized, password_hash, name, role) VALUES
      ('d1', 'jose@x.cl', 'jose@x.cl', '${hash}', 'Jose', 'director'),
      ('d2', 'otro@x.cl', 'otro@x.cl', '${hash}', 'Otro', 'director');
  `);
});

describe("Mi cuenta del director", () => {
  it("solo un director la usa", async () => {
    const staff = createSession({ userId: "s1", centerId: "c1", role: "administrativo" });
    expect((await request(app).get("/api/director/me").set("Cookie", cookie(staff))).status).toBe(403);
    expect((await request(app).get("/api/director/me")).status).toBe(401);
  });

  it("edita nombre y teléfono sin pedir la clave", async () => {
    const response = await request(app).patch("/api/director/me").set("Cookie", cookie(directorSession())).send({ name: "José Fernández", phone: "+56 9 1234 5678" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: "José Fernández", phone: "+56 9 1234 5678", email: "jose@x.cl" });
    expect((await request(app).patch("/api/director/me").set("Cookie", cookie(directorSession())).send({ phone: "abc" })).status).toBe(400);
  });

  it("cambiar el correo exige la clave actual y que no esté en uso", async () => {
    const token = cookie(directorSession());
    expect((await request(app).patch("/api/director/me").set("Cookie", token).send({ email: "nuevo@x.cl" })).status).toBe(403);
    expect((await request(app).patch("/api/director/me").set("Cookie", token).send({ email: "nuevo@x.cl", currentPassword: "mala" })).status).toBe(403);
    expect((await request(app).patch("/api/director/me").set("Cookie", token).send({ email: "OTRO@x.cl", currentPassword: "clave-actual-1" })).status).toBe(409);
    expect((await request(app).patch("/api/director/me").set("Cookie", token).send({ email: "malo", currentPassword: "clave-actual-1" })).status).toBe(400);
    const ok = await request(app).patch("/api/director/me").set("Cookie", token).send({ email: "Nuevo@x.cl", currentPassword: "clave-actual-1" });
    expect(ok.status).toBe(200);
    expect(ok.body.email).toBe("Nuevo@x.cl");
    const login = await request(app).post("/api/auth/login").send({ email: "nuevo@x.cl", password: "clave-actual-1" });
    expect(login.status).toBe(200);
  });

  it("cambia la clave: pide la actual, exige 8 caracteres y cierra las otras sesiones", async () => {
    const mine = directorSession();
    const other = directorSession();
    const post = (body: unknown) => request(app).post("/api/director/me/password").set("Cookie", cookie(mine)).send(body);
    expect((await post({ currentPassword: "mala", newPassword: "nueva-clave-9" })).status).toBe(403);
    expect((await post({ currentPassword: "clave-actual-1", newPassword: "corta" })).status).toBe(400);
    expect((await post({ currentPassword: "clave-actual-1", newPassword: "nueva-clave-9" })).status).toBe(200);
    const { rows } = await pglite.query(`SELECT password_hash FROM users WHERE id = 'd1'`);
    expect(verifyPassword("nueva-clave-9", String(rows[0].password_hash))).toBe(true);
    expect(getSession(mine)).toBeDefined();
    expect(getSession(other)).toBeUndefined();
    expect((await request(app).post("/api/auth/login").send({ email: "jose@x.cl", password: "clave-actual-1" })).status).toBe(401);
  });
});

describe("Perfil de ingreso del director a las clínicas", () => {
  const put = (token: string, profile: unknown) => request(app).put("/api/director/me/entry-profile").set("Cookie", cookie(token)).send({ profile });

  it("por defecto entra como médico y el perfil se guarda para todas las clínicas", async () => {
    const token = directorSession();
    expect((await request(app).get("/api/director/me").set("Cookie", cookie(token)).expect(200)).body.entryProfile).toBe("medico");
    await put(token, "administrativo").expect(200);
    expect((await request(app).get("/api/director/me").set("Cookie", cookie(token))).body.entryProfile).toBe("administrativo");
    await request(app).post("/api/auth/enter-clinic").set("Cookie", cookie(token)).send({ centerId: "c1" }).expect(200);
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie(token));
    expect(me.body.user).toMatchObject({ role: "administrativo", viewingAsDirector: true, viewingProfile: "administrativo" });
    // otra sesión del mismo director y otra clínica usan el mismo perfil
    const again = directorSession();
    await request(app).post("/api/auth/enter-clinic").set("Cookie", cookie(again)).send({ centerId: "c1" }).expect(200);
    expect(getSession(again)).toMatchObject({ viewingRole: "administrativo", viewingLegal: false });
  });

  it("representante legal: entra como médico con las facultades del representante", async () => {
    const token = directorSession();
    await put(token, "representante_legal").expect(200);
    await request(app).post("/api/auth/enter-clinic").set("Cookie", cookie(token)).send({ centerId: "c1" }).expect(200);
    expect(getSession(token)).toMatchObject({ viewingRole: "medico", viewingLegal: true });
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie(token));
    expect(me.body.user).toMatchObject({ role: "medico", viewingProfile: "representante_legal" });
  });

  it("al cambiarlo, vale al instante dentro de la clínica donde ya está", async () => {
    const token = directorSession();
    await request(app).post("/api/auth/enter-clinic").set("Cookie", cookie(token)).send({ centerId: "c1" }).expect(200);
    await put(token, "representante_legal").expect(200);
    expect(getSession(token)).toMatchObject({ viewingRole: "medico", viewingLegal: true });
    await put(token, "administrativo").expect(200);
    expect(getSession(token)).toMatchObject({ viewingRole: "administrativo", viewingLegal: false });
  });

  it("rechaza perfiles inválidos y a quien no es director", async () => {
    await put(directorSession(), "director").expect(400);
    const staff = createSession({ userId: "s1", centerId: "c1", role: "administrativo" });
    await put(staff, "medico").expect(403);
  });
});

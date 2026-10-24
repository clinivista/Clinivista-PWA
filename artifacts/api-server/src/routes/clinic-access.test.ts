import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createHash } from "node:crypto";

// Same in-memory PGlite approach as patients.test.ts: real SQL against a
// throwaway database, no real patient data involved.
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
import directorRouter from "./director";
import authRouter from "./auth";
import leadsRouter from "./leads";
import staffPatientsRouter from "./staff-patients";
import { createSession } from "../lib/sessions";
import { hashPassword } from "@workspace/db";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json({ limit: "1mb" })); // same limit as the real app
app.use("/api", directorRouter);
app.use("/api", authRouter);
app.use("/api", leadsRouter);
app.use("/api", staffPatientsRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_protocols (template_key text NOT NULL DEFAULT '', 
      id text PRIMARY KEY, center_id text NOT NULL DEFAULT 'default-center',
      name text NOT NULL, version text NOT NULL DEFAULT '1',
      specialty text NOT NULL DEFAULT 'capilar', active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_protocol_views (
      id text PRIMARY KEY, protocol_id text NOT NULL, key text NOT NULL, label text NOT NULL,
      position integer NOT NULL DEFAULT 0, requirements jsonb NOT NULL DEFAULT '{}',
      active boolean NOT NULL DEFAULT true, phase_id text,
      UNIQUE (protocol_id, key)
    );
    CREATE TABLE IF NOT EXISTS clinical_protocol_phases (
      id text PRIMARY KEY, protocol_id text NOT NULL, key text NOT NULL, name text NOT NULL,
      position integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, kind text NOT NULL DEFAULT 'capture',
      UNIQUE (protocol_id, key)
    );
    CREATE TABLE IF NOT EXISTS leads (parent_lead_id text, 
      id text PRIMARY KEY,
      token text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      name text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      document_id text DEFAULT '',
      document_normalized text DEFAULT '',
      email text DEFAULT '',
      age text DEFAULT '',
      city text DEFAULT '',
      status text NOT NULL DEFAULT 'nuevo',
      consent boolean NOT NULL DEFAULT false,
      marketing_consent boolean NOT NULL DEFAULT false,
      photo_count text NOT NULL DEFAULT '0',
      photos jsonb NOT NULL DEFAULT '[]',
      hair_loss_time text DEFAULT '',
      pattern text DEFAULT '',
      previous_treatment text DEFAULT '',
      symptoms text DEFAULT '',
      surgery_history text DEFAULT '',
      notes text DEFAULT '',
      norwood text DEFAULT '',
      appointment_at text DEFAULT '',
      is_demo boolean DEFAULT false,
      center_id text DEFAULT 'default-center',
      protocol_id text DEFAULT 'capillary-initial',
       delivery_channel text DEFAULT '',
       language text DEFAULT '',
       patient_account_id text,
       clinical_data jsonb NOT NULL DEFAULT '{}', consent_recorded_by text DEFAULT '', consent_recorded_at timestamptz, skipped_phases jsonb NOT NULL DEFAULT '[]', phase_attentions jsonb NOT NULL DEFAULT '{}', discharged_at timestamptz, discharged_by_name text DEFAULT '', discharge_note text DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL,
      email_normalized text NOT NULL,
      password_hash text NOT NULL,
      name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
      role text NOT NULL,
      center_id text,
      active boolean NOT NULL DEFAULT true,
      legal_representative boolean NOT NULL DEFAULT false,
      reset_token_hash text, reset_token_expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
});

beforeEach(async () => {
  await pglite.exec(`
    TRUNCATE clinical_centers, clinical_protocols, clinical_protocol_views, clinical_protocol_phases, leads, users;
  `);
});

function directorSession() {
  return createSession({ userId: "director-1", centerId: null, role: "director" });
}

async function seedClinic(id: string, overrides: { active?: boolean; patients?: number; staff?: number } = {}) {
  await pglite.exec(`
    INSERT INTO clinical_centers (id, name, slug, active) VALUES ('${id}', 'Clínica ${id}', '${id}', ${overrides.active ?? true});
  `);
  for (let i = 0; i < (overrides.patients ?? 0); i++) {
    await pglite.exec(`
      INSERT INTO leads (id, token, name, phone, center_id) VALUES ('${id}-lead-${i}', '${id}-token-${i}', 'Paciente ${i}', '+569${i}', '${id}');
    `);
  }
  for (let i = 0; i < (overrides.staff ?? 0); i++) {
    const passwordHash = hashPassword("password123");
    await pglite.exec(`
      INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id)
      VALUES ('${id}-staff-${i}', 'staff${i}@${id}.cl', 'staff${i}@${id}.cl', '${passwordHash}', 'Staff ${i}', 'administrativo', '${id}');
    `);
  }
}


const login = (email: string, password = "password123") => request(app).post("/api/auth/login").send({ email, password });
const cookieOf = (res: { headers: Record<string, unknown> }) => String((res.headers["set-cookie"] as string[])[0]).split(";")[0];
const director = () => `clinivista_session=${directorSession()}`;
const total = async (cookie: string) => (await request(app).get("/api/leads/stats").set("Cookie", cookie).expect(200)).body.total as number;
async function seedUser(id: string, centerId: string, role = "medico", extra: { active?: boolean; email?: string; password?: string } = {}) {
  const email = extra.email ?? `${id}@x.cl`;
  await pglite.exec(`
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id, active)
    VALUES ('${id}', '${email}', '${email}', '${hashPassword(extra.password ?? "password123")}', '${id}', '${role}', '${centerId}', ${extra.active ?? true});
  `);
}

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

describe("una persona en varias clínicas (una cuenta por clínica)", () => {
  beforeEach(async () => {
    await seedClinic("a", { patients: 1 });
    await seedClinic("b", { patients: 2 });
    await seedClinic("c", { patients: 3 });
    // La misma persona: una cuenta en cada clínica, con el mismo correo y distinto rol.
    await seedUser("ana-a", "a", "medico", { email: "ana@x.cl" });
    await seedUser("ana-b", "b", "administrativo", { email: "ana@x.cl" });
  });

  it("con la misma clave en ambas ve las dos clínicas y elige; cada una muestra solo lo suyo", async () => {
    const res = await login("ana@x.cl").expect(200);
    const cookie = cookieOf(res);
    expect(res.body.user.needsClinicChoice).toBe(true);
    expect(res.body.user.centerId).toBeNull();
    expect(res.body.user.clinics).toEqual([
      { id: "a", name: "Clínica a", role: "medico" },
      { id: "b", name: "Clínica b", role: "administrativo" },
    ]); // la clínica c no aparece
    await request(app).get("/api/leads/stats").set("Cookie", cookie).expect(403); // sin elegir no entra a ninguna

    await request(app).post("/api/auth/clinic").set("Cookie", cookie).send({ centerId: "c" }).expect(403);
    await request(app).post("/api/auth/clinic").send({ centerId: "a" }).expect(401);

    const inB = await request(app).post("/api/auth/clinic").set("Cookie", cookie).send({ centerId: "b" }).expect(200);
    expect(inB.body.user).toMatchObject({ id: "ana-b", centerId: "b", role: "administrativo", canManageUsers: true, needsClinicChoice: false });
    expect(await total(cookie)).toBe(2);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).body.user).toMatchObject({ id: "ana-b", centerId: "b" });

    await request(app).post("/api/auth/clinic").set("Cookie", cookie).send({ centerId: null }).expect(200);
    await request(app).get("/api/leads/stats").set("Cookie", cookie).expect(403);
    const inA = await request(app).post("/api/auth/clinic").set("Cookie", cookie).send({ centerId: "a" }).expect(200);
    expect(inA.body.user).toMatchObject({ id: "ana-a", centerId: "a", role: "medico" });
    expect(await total(cookie)).toBe(1);
  });

  it("con claves distintas, cada clave abre solo su clínica", async () => {
    await pglite.exec(`UPDATE users SET password_hash = '${hashPassword("otra-clave-99")}' WHERE id = 'ana-b';`);
    const a = await login("ana@x.cl", "password123").expect(200);
    expect(a.body.user).toMatchObject({ centerId: "a", needsClinicChoice: false });
    expect(a.body.user.clinics).toEqual([{ id: "a", name: "Clínica a", role: "medico" }]);
    const b = await login("ana@x.cl", "otra-clave-99").expect(200);
    expect(b.body.user).toMatchObject({ centerId: "b", role: "administrativo", needsClinicChoice: false });
    expect(await total(cookieOf(b))).toBe(2);
    await login("ana@x.cl", "ninguna").expect(401);
  });

  it("una clínica suspendida o una cuenta desactivada desaparece de la lista", async () => {
    await seedUser("ana-c", "c", "medico", { email: "ana@x.cl" });
    await pglite.exec("UPDATE clinical_centers SET active = false WHERE id = 'a';");
    await pglite.exec("UPDATE users SET active = false WHERE id = 'ana-c';");
    const res = await login("ana@x.cl").expect(200);
    expect(res.body.user).toMatchObject({ centerId: "b", needsClinicChoice: false });
    expect(res.body.user.clinics.map((c: { id: string }) => c.id)).toEqual(["b"]);
    await pglite.exec("UPDATE clinical_centers SET active = false WHERE id = 'b';");
    await login("ana@x.cl").expect(403);
  });

  it("si desactivan su cuenta en la clínica donde trabaja, su sesión se cierra y al volver solo ve las otras", async () => {
    const cookie = cookieOf(await login("ana@x.cl"));
    await request(app).post("/api/auth/clinic").set("Cookie", cookie).send({ centerId: "b" }).expect(200);
    await pglite.exec("UPDATE users SET active = false WHERE id = 'ana-b';");
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).body.authenticated).toBe(false);
    const again = await login("ana@x.cl").expect(200);
    expect(again.body.user).toMatchObject({ centerId: "a", needsClinicChoice: false });
  });

  it("cada clínica crea su cuenta con el mismo correo sin saber de la otra; dentro de una misma clínica no se repite", async () => {
    const body = { name: "Ana", email: "ana@x.cl", password: "password123", role: "medico" };
    await request(app).post("/api/director/centers/c/users").set("Cookie", director()).send(body).expect(201);
    await request(app).post("/api/director/centers/c/users").set("Cookie", director()).send(body).expect(409);
    expect((await login("ana@x.cl").expect(200)).body.user.clinics).toHaveLength(3);
  });

  it("el correo de un director no se puede usar en una clínica", async () => {
    await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES ('dir', 'dir@x.cl', 'dir@x.cl', '${hashPassword("password123")}', 'Dir', 'director', NULL);`);
    await request(app).post("/api/director/centers/c/users").set("Cookie", director())
      .send({ name: "X", email: "dir@x.cl", password: "password123", role: "medico" }).expect(409);
  });

  it("el personal de una clínica no puede entrar a otra por la vía de los directores", async () => {
    const cookie = cookieOf(await login("ana@x.cl"));
    await request(app).post("/api/auth/enter-clinic").set("Cookie", cookie).send({ centerId: "c" }).expect(403);
  });

  it("restablecer la clave: se elige si aplica a todas las clínicas o solo a algunas", async () => {
    const token = "t".repeat(40);
    await pglite.exec(`UPDATE users SET reset_token_hash = '${sha(token)}', reset_token_expires_at = now() + interval '1 hour' WHERE email_normalized = 'ana@x.cl';`);
    const info = await request(app).get(`/api/auth/reset-info?token=${token}`).expect(200);
    expect(info.body.clinics).toEqual([{ centerId: "a", name: "Clínica a" }, { centerId: "b", name: "Clínica b" }]);
    expect((await request(app).get("/api/auth/reset-info?token=" + "x".repeat(40)).expect(200)).body.clinics).toEqual([]);

    await request(app).post("/api/auth/reset").send({ token, password: "clave-nueva-1", centerIds: [] }).expect(400);
    await request(app).post("/api/auth/reset").send({ token, password: "clave-nueva-1", centerIds: ["a"] }).expect(200);
    // solo la clínica a cambió; la b conserva la clave anterior
    expect((await login("ana@x.cl", "clave-nueva-1").expect(200)).body.user).toMatchObject({ centerId: "a", needsClinicChoice: false });
    expect((await login("ana@x.cl", "password123").expect(200)).body.user).toMatchObject({ centerId: "b", needsClinicChoice: false });
    // el enlace sigue sirviendo para la que faltó, hasta que venza
    await request(app).post("/api/auth/reset").send({ token, password: "clave-nueva-1" }).expect(200);
    expect((await login("ana@x.cl", "clave-nueva-1").expect(200)).body.user.clinics).toHaveLength(2);
    await request(app).post("/api/auth/reset").send({ token, password: "otra-mas-123" }).expect(400);
  });
});

describe("director: elige entre todas las clínicas al iniciar sesión", () => {
  beforeEach(async () => {
    await seedClinic("a", { patients: 1 });
    await seedClinic("b", { patients: 2 });
    await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES ('director-1', 'd@x.cl', 'd@x.cl', '${hashPassword("password123")}', 'Director', 'director', NULL);`);
  });

  it("ve todas las clínicas más supra-control, entra a cualquiera y vuelve", async () => {
    const res = await login("d@x.cl").expect(200);
    const cookie = cookieOf(res);
    expect(res.body.user).toMatchObject({ role: "director", needsClinicChoice: true });
    expect(res.body.user.clinics.map((c: { id: string }) => c.id)).toEqual(["a", "b"]);
    expect((await request(app).get("/api/leads/stats").set("Cookie", cookie)).status).toBe(403);

    await request(app).post("/api/auth/enter-clinic").set("Cookie", cookie).send({ centerId: "no-existe" }).expect(404);
    await request(app).post("/api/auth/enter-clinic").set("Cookie", cookie).send({ centerId: "b" }).expect(200);
    expect(await total(cookie)).toBe(2);
    const inside = (await request(app).get("/api/auth/me").set("Cookie", cookie)).body.user;
    expect(inside).toMatchObject({ role: "medico", centerId: "b", viewingAsDirector: true, canManageUsers: false });
    // dentro de la clínica tiene también el rol de médico: puede dar altas (404 = pasó el permiso; el caso no existe)
    await request(app).post("/api/leads/no-existe/discharge").set("Cookie", cookie).send({}).expect(404);

    await request(app).post("/api/auth/leave-clinic").set("Cookie", cookie).expect(200);
    const supra = (await request(app).get("/api/auth/me").set("Cookie", cookie)).body.user;
    expect(supra).toMatchObject({ role: "director", needsClinicChoice: false });
    await request(app).get("/api/director/centers").set("Cookie", cookie).expect(200);

    await request(app).post("/api/auth/clinic").set("Cookie", cookie).send({ centerId: null }).expect(200);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).body.user.needsClinicChoice).toBe(true);
  });
});

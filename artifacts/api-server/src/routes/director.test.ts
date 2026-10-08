import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

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
import invitationsRouter from "./invitations";
import patientsRouter from "./patients";
import { createSession } from "../lib/sessions";
import { hashPassword } from "@workspace/db";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json({ limit: "1mb" })); // same limit as the real app
app.use("/api", directorRouter);
app.use("/api", authRouter);
app.use("/api", leadsRouter);
app.use("/api", invitationsRouter);
app.use("/api", patientsRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_protocols (
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
    CREATE TABLE IF NOT EXISTS leads (
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
       delivery_channel text DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL,
      email_normalized text NOT NULL,
      password_hash text NOT NULL,
      name text NOT NULL DEFAULT '',
      role text NOT NULL,
      center_id text,
      active boolean NOT NULL DEFAULT true,
      legal_representative boolean NOT NULL DEFAULT false,
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

describe("GET /api/director/centers", () => {
  it("rejects requests without a director session", async () => {
    await request(app).get("/api/director/centers").expect(401);

    const staffSession = createSession({ userId: "s1", centerId: "clinic-a", role: "administrativo" });
    await request(app)
      .get("/api/director/centers")
      .set("Cookie", `clinivista_session=${staffSession}`)
      .expect(403);
  });

  it("lists every clinic with patient and staff counts", async () => {
    await seedClinic("clinic-a", { patients: 3, staff: 2 });
    await seedClinic("clinic-b", { patients: 1, staff: 1, active: false });

    const res = await request(app)
      .get("/api/director/centers")
      .set("Cookie", `clinivista_session=${directorSession()}`)
      .expect(200);

    const byId = Object.fromEntries(res.body.centers.map((c: { id: string }) => [c.id, c]));
    expect(byId["clinic-a"]).toMatchObject({ active: true, patientCount: 3, staffCount: 2 });
    expect(byId["clinic-b"]).toMatchObject({ active: false, patientCount: 1, staffCount: 1 });
    // Fase 6 (manual billing): a clinic that has never had a payment
    // recorded shows up as "sin_registro", never a false "atrasada".
    expect(byId["clinic-a"]).toMatchObject({ paidUntil: null, paymentStatus: "sin_registro" });
  });
});

describe("POST /api/director/centers/:id/payments", () => {
  it("rejects a non-director session", async () => {
    await seedClinic("clinic-a");
    const staffSession = createSession({ userId: "s1", centerId: "clinic-a", role: "administrativo" });
    await request(app)
      .post("/api/director/centers/clinic-a/payments")
      .set("Cookie", `clinivista_session=${staffSession}`)
      .send({ paidUntil: "2027-01-01T00:00:00.000Z" })
      .expect(403);
  });

  it("records a future payment date as al_dia and a past one as atrasada", async () => {
    await seedClinic("clinic-a");

    const future = await request(app)
      .post("/api/director/centers/clinic-a/payments")
      .set("Cookie", `clinivista_session=${directorSession()}`)
      .send({ paidUntil: "2099-01-01T00:00:00.000Z" })
      .expect(200);
    expect(future.body.paymentStatus).toBe("al_dia");
    expect(new Date(future.body.paidUntil).toISOString()).toBe("2099-01-01T00:00:00.000Z");

    const past = await request(app)
      .post("/api/director/centers/clinic-a/payments")
      .set("Cookie", `clinivista_session=${directorSession()}`)
      .send({ paidUntil: "2000-01-01T00:00:00.000Z" })
      .expect(200);
    expect(past.body.paymentStatus).toBe("atrasada");
  });

  it("rejects an invalid date", async () => {
    await seedClinic("clinic-a");
    await request(app)
      .post("/api/director/centers/clinic-a/payments")
      .set("Cookie", `clinivista_session=${directorSession()}`)
      .send({ paidUntil: "not-a-date" })
      .expect(400);
  });

  it("creates the clinic's row if it only existed implicitly, same as the PATCH endpoint", async () => {
    // No seedClinic call: this clinic exists only because a lead references it.
    await pglite.exec(`
      INSERT INTO leads (id, token, name, phone, center_id) VALUES ('implicit-lead', 'implicit-token', 'Paciente', '+56900000000', 'clinic-implicit');
    `);
    const res = await request(app)
      .post("/api/director/centers/clinic-implicit/payments")
      .set("Cookie", `clinivista_session=${directorSession()}`)
      .send({ paidUntil: "2099-01-01T00:00:00.000Z" })
      .expect(200);
    expect(res.body.paymentStatus).toBe("al_dia");
  });
});

describe("PATCH /api/director/centers/:id", () => {
  it("suspends a clinic, and a staff login there is then rejected", async () => {
    await seedClinic("clinic-a", { patients: 1, staff: 1 });

    const patch = await request(app)
      .patch("/api/director/centers/clinic-a")
      .set("Cookie", `clinivista_session=${directorSession()}`)
      .send({ active: false })
      .expect(200);
    expect(patch.body.active).toBe(false);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff0@clinic-a.cl", password: "password123" })
      .expect(403);
    expect(login.body.error).toMatch(/suspendida/i);

    // Reactivating restores normal login.
    await request(app)
      .patch("/api/director/centers/clinic-a")
      .set("Cookie", `clinivista_session=${directorSession()}`)
      .send({ active: true })
      .expect(200);
    await request(app)
      .post("/api/auth/login")
      .send({ email: "staff0@clinic-a.cl", password: "password123" })
      .expect(200);
  });

  it("rejects a non-director session", async () => {
    await seedClinic("clinic-a");
    const staffSession = createSession({ userId: "s1", centerId: "clinic-a", role: "administrativo" });
    await request(app)
      .patch("/api/director/centers/clinic-a")
      .set("Cookie", `clinivista_session=${staffSession}`)
      .send({ active: false })
      .expect(403);
  });
});

describe("GET /api/director/centers/:id/export", () => {
  it("exports only that clinic's patients and staff", async () => {
    await seedClinic("clinic-a", { patients: 2, staff: 1 });
    await seedClinic("clinic-b", { patients: 5, staff: 3 });

    const res = await request(app)
      .get("/api/director/centers/clinic-a/export")
      .set("Cookie", `clinivista_session=${directorSession()}`)
      .expect(200);

    const payload = JSON.parse(res.text);
    expect(payload.patients).toHaveLength(2);
    expect(payload.staff).toHaveLength(1);
    expect(payload.patients.every((p: { centerId: string }) => p.centerId === "clinic-a")).toBe(true);
  });

  it("never includes patient access tokens or staff password hashes", async () => {
    await seedClinic("clinic-a", { patients: 2, staff: 1 });

    const res = await request(app)
      .get("/api/director/centers/clinic-a/export")
      .set("Cookie", `clinivista_session=${directorSession()}`)
      .expect(200);

    const payload = JSON.parse(res.text);
    expect(payload.patients).toHaveLength(2);
    for (const patient of payload.patients) {
      expect(patient).not.toHaveProperty("token");
      expect(patient).not.toHaveProperty("photos");
    }
    for (const member of payload.staff) {
      expect(member).not.toHaveProperty("passwordHash");
    }
    // Belt and braces: the raw file must not contain any token or hash value.
    expect(res.text).not.toContain("clinic-a-token-");
    expect(res.text).not.toMatch(/"passwordHash"|password_hash/);
    // The patient data itself is still exported.
    expect(payload.patients.map((p: { name: string }) => p.name).sort()).toEqual(["Paciente 0", "Paciente 1"]);
  });
});

describe("POST /api/director/centers (crear clínica)", () => {
  const director = () => `clinivista_session=${directorSession()}`;
  const demoBody = {
    name: "Clínica Demo Capilar",
    withSamplePatients: true,
    users: [
      { email: "Medico@Demo.cl", name: "Dra. Demo", password: "password-medico", role: "medico" },
      { email: "admin@demo.cl", name: "Admin Demo", password: "password-admin", role: "administrativo" },
    ],
  };

  it("rejects non-directors", async () => {
    await request(app).post("/api/director/centers").send(demoBody).expect(401);
    const staff = createSession({ userId: "s1", centerId: "clinic-a", role: "medico" });
    await request(app).post("/api/director/centers").set("Cookie", `clinivista_session=${staff}`).send(demoBody).expect(403);
  });

  it("creates the clinic, its accounts and sample patients, separate from other clinics", async () => {
    await seedClinic("default-center", { patients: 2, staff: 1 });

    const res = await request(app).post("/api/director/centers").set("Cookie", director()).send(demoBody).expect(201);
    expect(res.body).toMatchObject({
      id: "clinica-demo-capilar",
      name: "Clínica Demo Capilar",
      active: true,
      patientCount: 4,
      staffCount: 2,
      paymentStatus: "sin_registro",
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);

    const list = await request(app).get("/api/director/centers").set("Cookie", director()).expect(200);
    const byId = Object.fromEntries(list.body.centers.map((c: { id: string }) => [c.id, c]));
    expect(byId["default-center"]).toMatchObject({ patientCount: 2, staffCount: 1 });
    expect(byId["clinica-demo-capilar"]).toMatchObject({ patientCount: 4, staffCount: 2 });
  });

  it("lets the new accounts log in, scoped to the new clinic only", async () => {
    await request(app).post("/api/director/centers").set("Cookie", director()).send(demoBody).expect(201);

    const login = await request(app).post("/api/auth/login").send({ email: "medico@demo.cl", password: "password-medico" }).expect(200);
    expect(login.body.user).toMatchObject({ role: "medico", centerId: "clinica-demo-capilar" });
  });

  it("marks sample patients as demo and gives them no photos", async () => {
    await request(app).post("/api/director/centers").set("Cookie", director()).send(demoBody).expect(201);
    const rows = (await pglite.exec(
      "SELECT is_demo, photo_count, center_id, token FROM leads WHERE center_id = 'clinica-demo-capilar';",
    )) as Array<{ rows: Array<{ is_demo: boolean; photo_count: string; token: string }> }>;
    expect(rows[0].rows).toHaveLength(4);
    expect(rows[0].rows.every((row) => row.is_demo === true && row.photo_count === "0")).toBe(true);
    expect(new Set(rows[0].rows.map((row) => row.token)).size).toBe(4);
  });

  it("creates an empty clinic when no accounts or sample patients are requested", async () => {
    const res = await request(app).post("/api/director/centers").set("Cookie", director()).send({ name: "Clínica Vacía" }).expect(201);
    expect(res.body).toMatchObject({ id: "clinica-vacia", patientCount: 0, staffCount: 0 });
  });

  it("rejects a duplicate clinic identifier, including an implicit one", async () => {
    await seedClinic("clinica-demo-capilar");
    await request(app).post("/api/director/centers").set("Cookie", director()).send(demoBody).expect(409);

    await pglite.exec(`INSERT INTO leads (id, token, name, center_id) VALUES ('l1', 't1', 'X', 'implicit-clinic');`);
    await request(app).post("/api/director/centers").set("Cookie", director()).send({ name: "Otra", slug: "implicit-clinic" }).expect(409);
  });

  it("rejects an email that already has an account, creating nothing", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    await request(app)
      .post("/api/director/centers")
      .set("Cookie", director())
      .send({ name: "Clínica Nueva", users: [{ email: "STAFF0@clinic-a.cl", password: "password-123", role: "medico" }] })
      .expect(409);
    const list = await request(app).get("/api/director/centers").set("Cookie", director()).expect(200);
    expect(list.body.centers.map((c: { id: string }) => c.id)).toEqual(["clinic-a"]);
  });

  it("validates name, slug, emails and passwords", async () => {
    const post = (body: unknown) => request(app).post("/api/director/centers").set("Cookie", director()).send(body);
    await post({ name: "ab" }).expect(400);
    await post({ name: "Clínica Buena", slug: "Mal Slug!" }).expect(400);
    await post({ name: "Clínica Buena", users: [{ email: "no-es-correo", password: "password-123", role: "medico" }] }).expect(400);
    await post({ name: "Clínica Buena", users: [{ email: "a@b.cl", password: "corta", role: "medico" }] }).expect(400);
    await post({ name: "Clínica Buena", users: [{ email: "a@b.cl", password: "password-123", role: "director" }] }).expect(400);
    await post({
      name: "Clínica Buena",
      users: [
        { email: "a@b.cl", password: "password-123", role: "medico" },
        { email: "A@B.cl", password: "password-123", role: "administrativo" },
      ],
    }).expect(400);
  });
});

describe("usuarios de una clínica y reseteo de contraseña", () => {
  const director = () => `clinivista_session=${directorSession()}`;

  it("rejects non-directors on both endpoints", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    await request(app).get("/api/director/centers/clinic-a/users").expect(401);
    await request(app).post("/api/director/centers/clinic-a/users/clinic-a-staff-0/reset-password").expect(401);
    const staff = createSession({ userId: "s1", centerId: "clinic-a", role: "medico" });
    await request(app).get("/api/director/centers/clinic-a/users").set("Cookie", `clinivista_session=${staff}`).expect(403);
    await request(app).post("/api/director/centers/clinic-a/users/clinic-a-staff-0/reset-password").set("Cookie", `clinivista_session=${staff}`).expect(403);
  });

  it("lists only that clinic's users, never exposing password hashes", async () => {
    await seedClinic("clinic-a", { staff: 2 });
    await seedClinic("clinic-b", { staff: 1 });

    const res = await request(app).get("/api/director/centers/clinic-a/users").set("Cookie", director()).expect(200);
    expect(res.body.users.map((u: { email: string }) => u.email).sort()).toEqual(["staff0@clinic-a.cl", "staff1@clinic-a.cl"]);
    expect(res.body.users[0]).toMatchObject({ role: "administrativo", active: true });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash|:[0-9a-f]{40}/i);
  });

  it("returns 404 for an unknown clinic", async () => {
    await request(app).get("/api/director/centers/nope/users").set("Cookie", director()).expect(404);
  });

  it("resets to a generated password: old one stops working, new one works, sessions close", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    const userSession = createSession({ userId: "clinic-a-staff-0", centerId: "clinic-a", role: "administrativo" });
    await request(app).get("/api/auth/me").set("Cookie", `clinivista_session=${userSession}`).expect(200)
      .then((r) => expect(r.body.authenticated).toBe(true));

    const res = await request(app)
      .post("/api/director/centers/clinic-a/users/clinic-a-staff-0/reset-password")
      .set("Cookie", director())
      .expect(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const { temporaryPassword } = res.body;
    expect(temporaryPassword).toMatch(/^[A-Za-z0-9]{12}$/);

    await request(app).post("/api/auth/login").send({ email: "staff0@clinic-a.cl", password: "password123" }).expect(401);
    await request(app).post("/api/auth/login").send({ email: "staff0@clinic-a.cl", password: temporaryPassword }).expect(200);
    await request(app).get("/api/auth/me").set("Cookie", `clinivista_session=${userSession}`).expect(200)
      .then((r) => expect(r.body.authenticated).toBe(false));
  });

  it("generates a different password each time", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    const reset = () => request(app).post("/api/director/centers/clinic-a/users/clinic-a-staff-0/reset-password").set("Cookie", director()).expect(200);
    const [a, b] = [(await reset()).body.temporaryPassword, (await reset()).body.temporaryPassword];
    expect(a).not.toBe(b);
  });

  it("refuses a user that belongs to another clinic, and directors", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    await seedClinic("clinic-b", { staff: 1 });
    await request(app).post("/api/director/centers/clinic-a/users/clinic-b-staff-0/reset-password").set("Cookie", director()).expect(404);

    await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, role, center_id)
      VALUES ('dir-1', 'd@x.cl', 'd@x.cl', 'x:y', 'director', 'clinic-a');`);
    await request(app).post("/api/director/centers/clinic-a/users/dir-1/reset-password").set("Cookie", director()).expect(404);
    await request(app).post("/api/director/centers/clinic-a/users/missing/reset-password").set("Cookie", director()).expect(404);
  });
});

describe("bloqueo de usuarios de clínica", () => {
  const director = () => `clinivista_session=${directorSession()}`;

  it("blocks and unblocks one user independently of the others", async () => {
    await seedClinic("clinic-a", { staff: 2 });

    const blocked = await request(app).patch("/api/director/centers/clinic-a/users/clinic-a-staff-0")
      .set("Cookie", director()).send({ active: false }).expect(200);
    expect(blocked.body).toMatchObject({ id: "clinic-a-staff-0", active: false });
    expect(JSON.stringify(blocked.body)).not.toMatch(/password|hash/i);

    await request(app).post("/api/auth/login").send({ email: "staff0@clinic-a.cl", password: "password123" }).expect(401);
    await request(app).post("/api/auth/login").send({ email: "staff1@clinic-a.cl", password: "password123" }).expect(200);

    await request(app).patch("/api/director/centers/clinic-a/users/clinic-a-staff-0")
      .set("Cookie", director()).send({ active: true }).expect(200);
    await request(app).post("/api/auth/login").send({ email: "staff0@clinic-a.cl", password: "password123" }).expect(200);
  });

  it("closes the blocked user's open session immediately", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    const session = createSession({ userId: "clinic-a-staff-0", centerId: "clinic-a", role: "administrativo" });
    await request(app).patch("/api/director/centers/clinic-a/users/clinic-a-staff-0")
      .set("Cookie", director()).send({ active: false }).expect(200);
    await request(app).get("/api/auth/me").set("Cookie", `clinivista_session=${session}`).expect(200)
      .then((r) => expect(r.body.authenticated).toBe(false));
  });

  it("is director-only and scoped to the clinic in the URL", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    await seedClinic("clinic-b", { staff: 1 });
    const patch = (url: string, cookie?: string) => {
      const r = request(app).patch(url).send({ active: false });
      return cookie ? r.set("Cookie", cookie) : r;
    };
    await patch("/api/director/centers/clinic-a/users/clinic-a-staff-0").expect(401);
    const admin = createSession({ userId: "sa", centerId: null, role: "supra_admin" });
    await patch("/api/director/centers/clinic-a/users/clinic-a-staff-0", `clinivista_session=${admin}`).expect(403);
    await patch("/api/director/centers/clinic-a/users/clinic-b-staff-0", director()).expect(404);
    await request(app).patch("/api/director/centers/clinic-a/users/clinic-a-staff-0").set("Cookie", director()).send({}).expect(400);
  });
});

describe("equipo del panel de supra-control", () => {
  const director = () => `clinivista_session=${directorSession()}`;
  const newAdmin = { email: "Ana@Clinivista.cl", name: "Ana Soporte", password: "password-ana" };

  async function seedDirector() {
    await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id)
      VALUES ('director-1', 'jose@clinivista.cl', 'jose@clinivista.cl', '${hashPassword("director-pass")}', 'Jose', 'director', NULL);`);
  }

  it("only directors can see or manage the team", async () => {
    const admin = createSession({ userId: "sa", centerId: null, role: "supra_admin" });
    const staff = createSession({ userId: "s1", centerId: "clinic-a", role: "medico" });
    for (const cookie of [undefined, `clinivista_session=${admin}`, `clinivista_session=${staff}`]) {
      const status = cookie ? undefined : 401;
      const get = request(app).get("/api/director/team");
      const post = request(app).post("/api/director/team").send(newAdmin);
      for (const r of [get, post]) {
        const res = cookie ? await r.set("Cookie", cookie) : await r;
        expect(res.status).toBe(status ?? 403);
      }
    }
  });

  it("creates a supra_admin who can log in, is not tied to a clinic and never exposes hashes", async () => {
    const res = await request(app).post("/api/director/team").set("Cookie", director()).send(newAdmin).expect(201);
    expect(res.body).toMatchObject({ email: "Ana@Clinivista.cl", name: "Ana Soporte", role: "supra_admin", active: true });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);

    const login = await request(app).post("/api/auth/login").send({ email: "ana@clinivista.cl", password: "password-ana" }).expect(200);
    expect(login.body.user).toMatchObject({ role: "supra_admin", centerId: null });
  });

  it("lists directors first and administrators after, with their roles", async () => {
    await seedDirector();
    await request(app).post("/api/director/team").set("Cookie", director()).send(newAdmin).expect(201);
    const res = await request(app).get("/api/director/team").set("Cookie", director()).expect(200);
    expect(res.body.users.map((u: { role: string }) => u.role)).toEqual(["director", "supra_admin"]);
  });

  it("validates the new administrator and rejects duplicate emails", async () => {
    const post = (body: unknown) => request(app).post("/api/director/team").set("Cookie", director()).send(body);
    await post({ email: "no-es-correo", password: "password-ana" }).expect(400);
    await post({ email: "a@b.cl", password: "corta" }).expect(400);
    await post(newAdmin).expect(201);
    await post({ ...newAdmin, email: "ANA@clinivista.cl" }).expect(409);
    await seedClinic("clinic-a", { staff: 1 });
    await post({ ...newAdmin, email: "staff0@clinic-a.cl" }).expect(409);
  });

  it("blocks and unblocks an administrator, closing their session", async () => {
    const created = await request(app).post("/api/director/team").set("Cookie", director()).send(newAdmin).expect(201);
    const id = created.body.id;
    const session = createSession({ userId: id, centerId: null, role: "supra_admin" });

    await request(app).patch(`/api/director/team/${id}`).set("Cookie", director()).send({ active: false }).expect(200)
      .then((r) => expect(r.body.active).toBe(false));
    await request(app).get("/api/auth/me").set("Cookie", `clinivista_session=${session}`).expect(200)
      .then((r) => expect(r.body.authenticated).toBe(false));
    await request(app).post("/api/auth/login").send({ email: "ana@clinivista.cl", password: "password-ana" }).expect(401);

    await request(app).patch(`/api/director/team/${id}`).set("Cookie", director()).send({ active: true }).expect(200);
    await request(app).post("/api/auth/login").send({ email: "ana@clinivista.cl", password: "password-ana" }).expect(200);
  });

  it("resets an administrator's password to a one-time generated one", async () => {
    const created = await request(app).post("/api/director/team").set("Cookie", director()).send(newAdmin).expect(201);
    const res = await request(app).post(`/api/director/team/${created.body.id}/reset-password`).set("Cookie", director()).expect(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.temporaryPassword).toMatch(/^[A-Za-z0-9]{12}$/);
    await request(app).post("/api/auth/login").send({ email: "ana@clinivista.cl", password: "password-ana" }).expect(401);
    await request(app).post("/api/auth/login").send({ email: "ana@clinivista.cl", password: res.body.temporaryPassword }).expect(200);
  });

  it("never lets directors or clinic users be touched through the team endpoints", async () => {
    await seedDirector();
    await seedClinic("clinic-a", { staff: 1 });
    for (const id of ["director-1", "clinic-a-staff-0", "missing"]) {
      await request(app).patch(`/api/director/team/${id}`).set("Cookie", director()).send({ active: false }).expect(404);
      await request(app).post(`/api/director/team/${id}/reset-password`).set("Cookie", director()).expect(404);
    }
    // The director is untouched and can still log in.
    await request(app).post("/api/auth/login").send({ email: "jose@clinivista.cl", password: "director-pass" }).expect(200);
  });
});

describe("operating the panel as a supra_admin", () => {
  const admin = () => `clinivista_session=${createSession({ userId: "sa", centerId: null, role: "supra_admin" })}`;

  it("can list, suspend, record payments, export and create clinics", async () => {
    await seedClinic("clinic-a", { patients: 1, staff: 1 });
    await request(app).get("/api/director/centers").set("Cookie", admin()).expect(200);
    await request(app).patch("/api/director/centers/clinic-a").set("Cookie", admin()).send({ active: false }).expect(200);
    await request(app).post("/api/director/centers/clinic-a/payments").set("Cookie", admin())
      .send({ paidUntil: new Date(Date.now() + 86_400_000).toISOString() }).expect(200);
    await request(app).get("/api/director/centers/clinic-a/export").set("Cookie", admin()).expect(200);
    await request(app).post("/api/director/centers").set("Cookie", admin()).send({ name: "Clínica Nueva" }).expect(201);
  });

  it("cannot see users, block them, or reset passwords", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    const cookie = admin();
    await request(app).get("/api/director/centers/clinic-a/users").set("Cookie", cookie).expect(403);
    await request(app).patch("/api/director/centers/clinic-a/users/clinic-a-staff-0").set("Cookie", cookie).send({ active: false }).expect(403);
    await request(app).post("/api/director/centers/clinic-a/users/clinic-a-staff-0/reset-password").set("Cookie", cookie).expect(403);
  });

  it("is not a clinic account: clinic-scoped routes stay closed", async () => {
    await request(app).get("/api/leads").set("Cookie", admin()).expect(403);
    await request(app).post("/api/invitations").set("Cookie", admin()).send({ name: "X" }).expect(403);
  });
});

describe("crear usuarios de una clínica existente", () => {
  const director = () => `clinivista_session=${directorSession()}`;
  const body = { email: "Nueva@Clinica.cl", name: "Dra. Nueva", password: "password-nueva", role: "medico" };

  it("is director-only", async () => {
    await seedClinic("clinic-a");
    await request(app).post("/api/director/centers/clinic-a/users").send(body).expect(401);
    const admin = createSession({ userId: "sa", centerId: null, role: "supra_admin" });
    await request(app).post("/api/director/centers/clinic-a/users").set("Cookie", `clinivista_session=${admin}`).send(body).expect(403);
    const staff = createSession({ userId: "s1", centerId: "clinic-a", role: "administrativo" });
    await request(app).post("/api/director/centers/clinic-a/users").set("Cookie", `clinivista_session=${staff}`).send(body).expect(403);
  });

  it("creates a user that logs in scoped to that clinic and shows up in the list and counts", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    await seedClinic("clinic-b");
    const res = await request(app).post("/api/director/centers/clinic-a/users").set("Cookie", director()).send(body).expect(201);
    expect(res.body).toMatchObject({ email: "Nueva@Clinica.cl", name: "Dra. Nueva", role: "medico", active: true });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);

    const login = await request(app).post("/api/auth/login").send({ email: "nueva@clinica.cl", password: "password-nueva" }).expect(200);
    expect(login.body.user).toMatchObject({ role: "medico", centerId: "clinic-a" });

    const list = await request(app).get("/api/director/centers/clinic-a/users").set("Cookie", director()).expect(200);
    expect(list.body.users).toHaveLength(2);
    const centers = await request(app).get("/api/director/centers").set("Cookie", director()).expect(200);
    const byId = Object.fromEntries(centers.body.centers.map((c: { id: string }) => [c.id, c]));
    expect(byId["clinic-a"].staffCount).toBe(2);
    expect(byId["clinic-b"].staffCount).toBe(0);
  });

  it("works for a clinic that only exists implicitly (via its leads)", async () => {
    await pglite.exec(`INSERT INTO leads (id, token, name, center_id) VALUES ('l1', 't1', 'X', 'implicit-clinic');`);
    await request(app).post("/api/director/centers/implicit-clinic/users").set("Cookie", director()).send(body).expect(201);
  });

  it("404 for an unknown clinic, 409 for a taken email, 400 for invalid data or a non-clinic role", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    const post = (id: string, b: unknown) => request(app).post(`/api/director/centers/${id}/users`).set("Cookie", director()).send(b);
    await post("nope", body).expect(404);
    await post("clinic-a", { ...body, email: "STAFF0@clinic-a.cl" }).expect(409);
    await post("clinic-a", { ...body, email: "no-es-correo" }).expect(400);
    await post("clinic-a", { ...body, password: "corta" }).expect(400);
    await post("clinic-a", { ...body, role: "director" }).expect(400);
    await post("clinic-a", { ...body, role: "supra_admin" }).expect(400);
  });
});

describe("identidad de la clínica (nombre y logo para sus pacientes)", () => {
  const director = () => `clinivista_session=${directorSession()}`;
  const admin = () => `clinivista_session=${createSession({ userId: "sa", centerId: null, role: "supra_admin" })}`;

  async function pngDataUrl(width = 600, height = 300) {
    const sharp = (await import("sharp")).default;
    const bytes = await sharp({ create: { width, height, channels: 3, background: "#336699" } }).png().toBuffer();
    return `data:image/png;base64,${bytes.toString("base64")}`;
  }
  const put = (id: string, body: unknown, cookie: string) =>
    request(app).put(`/api/director/centers/${id}/identity`).set("Cookie", cookie).send(body);

  it("lets directors and supra admins set it; clinic staff and anonymous cannot", async () => {
    await seedClinic("clinic-a");
    await request(app).put("/api/director/centers/clinic-a/identity").send({ name: "Nombre Nuevo" }).expect(401);
    const staff = createSession({ userId: "s1", centerId: "clinic-a", role: "medico" });
    await put("clinic-a", { name: "Nombre Nuevo" }, `clinivista_session=${staff}`).expect(403);
    await put("clinic-a", { name: "Nombre Nuevo" }, director()).expect(200);
    await put("clinic-a", { name: "Otro Nombre" }, admin()).expect(200);
  });

  it("renames the clinic and stores a logo re-encoded to a PNG of at most 256 px", async () => {
    await seedClinic("clinic-a");
    const res = await put("clinic-a", { name: "  Estecapelli  ", logoDataUrl: await pngDataUrl() }, director()).expect(200);
    expect(res.body.name).toBe("Estecapelli");
    expect(res.body.logoDataUrl).toMatch(/^data:image\/png;base64,/);

    const sharp = (await import("sharp")).default;
    const meta = await sharp(Buffer.from(res.body.logoDataUrl.split(",")[1], "base64")).metadata();
    expect(meta.format).toBe("png");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(256);
    expect(meta.width).toBe(256); // 600x300 -> 256x128, aspect kept
    expect(meta.height).toBe(128);

    const list = await request(app).get("/api/director/centers").set("Cookie", director()).expect(200);
    expect(list.body.centers.find((c: { id: string }) => c.id === "clinic-a")).toMatchObject({ name: "Estecapelli" });
  });

  it("keeps the logo when omitted and removes it when null", async () => {
    await seedClinic("clinic-a");
    await put("clinic-a", { name: "Clínica A", logoDataUrl: await pngDataUrl() }, director()).expect(200);
    const kept = await put("clinic-a", { name: "Clínica A2" }, director()).expect(200);
    expect(kept.body.logoDataUrl).toMatch(/^data:image\/png/);
    const removed = await put("clinic-a", { name: "Clínica A2", logoDataUrl: null }, director()).expect(200);
    expect(removed.body.logoDataUrl).toBeNull();
  });

  it("rejects bad names, non-images, SVG, oversized and corrupt logos, without changing anything", async () => {
    await seedClinic("clinic-a");
    await put("clinic-a", { name: "ab" }, director()).expect(400);
    await put("clinic-a", { name: "Clínica A", logoDataUrl: "no es una imagen" }, director()).expect(400);
    const svg = `data:image/svg+xml;base64,${Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>").toString("base64")}`;
    await put("clinic-a", { name: "Clínica A", logoDataUrl: svg }, director()).expect(400);
    await put("clinic-a", { name: "Clínica A", logoDataUrl: `data:image/png;base64,${Buffer.from("esto no es un png").toString("base64")}` }, director()).expect(400);
    const huge = `data:image/png;base64,${Buffer.alloc(400 * 1024, 1).toString("base64")}`;
    await put("clinic-a", { name: "Clínica A", logoDataUrl: huge }, director()).expect(400);

    const list = await request(app).get("/api/director/centers").set("Cookie", director()).expect(200);
    expect(list.body.centers.find((c: { id: string }) => c.id === "clinic-a")).toMatchObject({ name: "Clínica clinic-a", logoDataUrl: null });
  });

  it("lets the public address (slug) be edited: normalized, unique, validated, kept when omitted", async () => {
    await seedClinic("clinic-a");
    await seedClinic("clinic-b");
    await put("clinic-a", { name: "Clínica A" }, director()).expect(200);
    const resolve = (slug: string) => request(app).get(`/api/clinics/${slug}`);
    await resolve("clinic-a").expect(200); // omitted: keeps the current slug

    await put("clinic-a", { name: "Clínica A", slug: "  EsteCapelli " }, director()).expect(200);
    await resolve("estecapelli").expect(200);
    await resolve("clinic-a").expect(404);

    await put("clinic-b", { name: "Clínica B", slug: "estecapelli" }, director()).expect(409);
    await put("clinic-b", { name: "Clínica B", slug: "Mala URL!" }, director()).expect(400);
    await put("clinic-b", { name: "Clínica B", slug: "ab" }, director()).expect(400);
    await resolve("clinic-b").expect(200); // unchanged after the rejections

    // Re-sending its own slug is not a conflict.
    await put("clinic-a", { name: "Clínica A", slug: "estecapelli" }, director()).expect(200);
    await put("clinic-a", { name: "Clínica A" }, director()).expect(200);
    await resolve("estecapelli").expect(200);
  });

  it("gives an implicit clinic the requested slug", async () => {
    await pglite.exec(`INSERT INTO leads (id, token, name, center_id) VALUES ('l9', 't9', 'X', 'default-center');`);
    await put("default-center", { name: "Estecapelli", slug: "estecapelli" }, director()).expect(200);
    const res = await request(app).get("/api/clinics/estecapelli").expect(200);
    expect(res.body.name).toBe("Estecapelli");
  });

  it("404 for an unknown clinic, and creates the row for an implicit one", async () => {
    await put("nope", { name: "Nombre Nuevo" }, director()).expect(404);
    await pglite.exec(`INSERT INTO leads (id, token, name, center_id) VALUES ('l1', 't1', 'X', 'implicit-clinic');`);
    const res = await put("implicit-clinic", { name: "Clínica Implícita", logoDataUrl: await pngDataUrl(100, 100) }, director()).expect(200);
    expect(res.body).toMatchObject({ id: "implicit-clinic", name: "Clínica Implícita" });
  });
});

describe("representante legal en usuarios de clínica (supra-control)", () => {
  it("lets the director create a user as legal representative and shows the flag in the list", async () => {
    await seedClinic("clinic-a");
    const cookie = `clinivista_session=${directorSession()}`;
    const created = await request(app).post("/api/director/centers/clinic-a/users").set("Cookie", cookie)
      .send({ email: "rep@clinic-a.cl", name: "Rep", password: "password123", role: "medico", legalRepresentative: true }).expect(201);
    expect(created.body.legalRepresentative).toBe(true);
    await request(app).post("/api/director/centers/clinic-a/users").set("Cookie", cookie)
      .send({ email: "doc@clinic-a.cl", password: "password123", role: "medico" }).expect(201);
    const list = await request(app).get("/api/director/centers/clinic-a/users").set("Cookie", cookie).expect(200);
    const flags = Object.fromEntries(list.body.users.map((u: { email: string; legalRepresentative: boolean }) => [u.email, u.legalRepresentative]));
    expect(flags).toEqual({ "rep@clinic-a.cl": true, "doc@clinic-a.cl": false });
  });
});

describe("marcar representante legal desde supra-control", () => {
  it("sets and clears the flag on an existing clinic user, independently of blocking", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    const cookie = `clinivista_session=${directorSession()}`;
    const url = "/api/director/centers/clinic-a/users/clinic-a-staff-0";
    const on = await request(app).patch(url).set("Cookie", cookie).send({ legalRepresentative: true }).expect(200);
    expect(on.body).toMatchObject({ legalRepresentative: true, active: true });
    const blocked = await request(app).patch(url).set("Cookie", cookie).send({ active: false }).expect(200);
    expect(blocked.body).toMatchObject({ legalRepresentative: true, active: false }); // flag untouched by blocking
    const both = await request(app).patch(url).set("Cookie", cookie).send({ active: true, legalRepresentative: false }).expect(200);
    expect(both.body).toMatchObject({ legalRepresentative: false, active: true });
    await request(app).patch(url).set("Cookie", cookie).send({}).expect(400);
  });

  it("is not available to a supra administrator (people management is director-only) nor across clinics", async () => {
    await seedClinic("clinic-a", { staff: 1 });
    await seedClinic("clinic-b");
    const admin = `clinivista_session=${createSession({ userId: "sa", centerId: null, role: "supra_admin" })}`;
    await request(app).patch("/api/director/centers/clinic-a/users/clinic-a-staff-0").set("Cookie", admin).send({ legalRepresentative: true }).expect(403);
    await request(app).patch("/api/director/centers/clinic-b/users/clinic-a-staff-0").set("Cookie", `clinivista_session=${directorSession()}`).send({ legalRepresentative: true }).expect(404);
  });
});

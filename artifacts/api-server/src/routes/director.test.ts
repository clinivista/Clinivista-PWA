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
import { createSession } from "../lib/sessions";
import { hashPassword } from "@workspace/db";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json());
app.use("/api", directorRouter);
app.use("/api", authRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, paid_until timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
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
      protocol_id text DEFAULT 'capillary-initial'
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
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
});

beforeEach(async () => {
  await pglite.exec(`
    TRUNCATE clinical_centers, leads, users;
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

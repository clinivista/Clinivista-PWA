import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

// Replace the real Postgres-backed db with an in-memory PGlite instance so
// tests exercise real SQL (including the partial unique index) without
// touching any real data. No real patient data is used in any fixture.
vi.mock("@workspace/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../../../lib/db/src/schema/index");
  const client = new PGlite();
  const db = drizzle(client, { schema });
  return { ...schema, db, pool: client, __pglite: client };
});

import * as mockedDb from "@workspace/db";
import patientsRouter from "./patients";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use("/api", patientsRouter);

// Fixture data only — not a real person.
const VALID_BODY = {
  name: "Paciente De Prueba",
  phone: "+56911111111",
  documentId: "12.345.678-5",
  email: "prueba@example.com",
  city: "Santiago",
  consent: true,
};

beforeAll(async () => {
  await pglite.exec(`
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
      is_demo boolean DEFAULT false
    );
    CREATE UNIQUE INDEX IF NOT EXISTS leads_document_normalized_unique
      ON leads (document_normalized)
      WHERE document_normalized IS NOT NULL AND document_normalized <> '';
  `);
});

beforeEach(async () => {
  await pglite.exec("DELETE FROM leads;");
});

async function countLeads(): Promise<number> {
  const res = (await pglite.exec("SELECT count(*)::int AS n FROM leads;")) as Array<{
    rows: Array<{ n: number }>;
  }>;
  return res[0].rows[0].n;
}

describe("POST /api/patients", () => {
  it("creates a lead and returns 201 with a token", async () => {
    const res = await request(app).post("/api/patients").send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.lead.token).toBe("string");
    expect(res.body.lead.token.length).toBeGreaterThan(20);
    // RUT stored formatted; photos are never echoed in the summary
    expect(res.body.lead.documentId).toBe("12.345.678-5");
    expect(res.body.lead.photos).toBeUndefined();
    expect(await countLeads()).toBe(1);
  });

  it("returns 400 when consent field is missing entirely", async () => {
    const { consent, ...withoutConsent } = VALID_BODY;
    const res = await request(app).post("/api/patients").send(withoutConsent);
    expect(res.status).toBe(400);
    expect(await countLeads()).toBe(0);
  });

  it("rejects consent explicitly set to false (422)", async () => {
    const res = await request(app)
      .post("/api/patients")
      .send({ ...VALID_BODY, consent: false });
    expect(res.status).toBe(422);
    expect(await countLeads()).toBe(0);
  });

  it("returns 400 for an invalid RUT check digit", async () => {
    const res = await request(app)
      .post("/api/patients")
      .send({ ...VALID_BODY, documentId: "12.345.678-9" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/RUT/);
    expect(await countLeads()).toBe(0);
  });

  it("returns 409 for a duplicate RUT (unformatted variant) and creates no second record", async () => {
    const first = await request(app).post("/api/patients").send(VALID_BODY);
    expect(first.status).toBe(201);

    const res = await request(app).post("/api/patients").send({
      ...VALID_BODY,
      documentId: "12345678-5", // same RUT, different formatting
      phone: "+56922222222",
      email: "otra@example.com",
    });
    expect(res.status).toBe(409);
    expect(res.body.duplicate).toBe(true);
    // The 409 must never leak the existing lead's token (bearer credential)
    expect(JSON.stringify(res.body)).not.toContain(first.body.lead.token);
    expect(await countLeads()).toBe(1);
  });

  it("returns 409 for a duplicate phone", async () => {
    await request(app).post("/api/patients").send(VALID_BODY);
    const res = await request(app).post("/api/patients").send({
      ...VALID_BODY,
      documentId: "20.347.878-K",
      email: "otra@example.com",
    });
    expect(res.status).toBe(409);
    expect(await countLeads()).toBe(1);
  });
});

describe("GET /api/patients/:token", () => {
  it("returns 404 for an unknown token", async () => {
    const res = await request(app).get("/api/patients/invalid-token-000000");
    expect(res.status).toBe(404);
  });

  it("returns the lead summary (without photos) for a valid token", async () => {
    const created = await request(app).post("/api/patients").send(VALID_BODY);
    const res = await request(app).get(`/api/patients/${created.body.lead.token}`);
    expect(res.status).toBe(200);
    expect(res.body.lead.name).toBe(VALID_BODY.name);
    expect(res.body.lead.photos).toBeUndefined();
    expect(res.body.lead.photoKeys).toEqual([]);
  });
});

describe("PUT /api/patients/:token", () => {
  it("returns 404 for an unknown token", async () => {
    const res = await request(app)
      .put("/api/patients/invalid-token-000000")
      .send(VALID_BODY);
    expect(res.status).toBe(404);
  });

  it("returns 409 when updating to another lead's RUT", async () => {
    await request(app).post("/api/patients").send(VALID_BODY);
    const second = await request(app).post("/api/patients").send({
      ...VALID_BODY,
      documentId: "20.347.878-K",
      phone: "+56922222222",
      email: "otra@example.com",
    });
    expect(second.status).toBe(201);

    const res = await request(app)
      .put(`/api/patients/${second.body.lead.token}`)
      .send({ ...VALID_BODY, phone: "+56922222222", email: "otra@example.com" });
    expect(res.status).toBe(409);
  });

  it("updates the lead's own data without a false duplicate", async () => {
    const created = await request(app).post("/api/patients").send(VALID_BODY);
    const res = await request(app)
      .put(`/api/patients/${created.body.lead.token}`)
      .send({ ...VALID_BODY, city: "Valparaíso" });
    expect(res.status).toBe(200);
    expect(res.body.lead.city).toBe("Valparaíso");
  });
});

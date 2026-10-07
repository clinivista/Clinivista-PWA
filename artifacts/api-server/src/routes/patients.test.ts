import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createHash } from "node:crypto";
import sharp from "sharp";

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

import { eq } from "drizzle-orm";
import * as mockedDb from "@workspace/db";
import patientsRouter from "./patients";
import leadsRouter from "./leads";
import leadPhasesRouter from "./lead-phases";
import diagnosisRouter from "./diagnosis";
import { createSession } from "../lib/sessions";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";

const typedMockedDb = mockedDb as unknown as {
  db: typeof mockedDb.db;
  evaluationsTable: typeof mockedDb.evaluationsTable;
  protocolsTable: typeof mockedDb.protocolsTable;
};

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use("/api", patientsRouter);
app.use("/api", leadsRouter);
app.use("/api", leadPhasesRouter);
app.use("/api", diagnosisRouter);

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
       is_demo boolean DEFAULT false,
       center_id text DEFAULT 'default-center',
       protocol_id text DEFAULT 'capillary-initial'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS leads_center_document_unique
      ON leads (center_id, document_normalized)
      WHERE document_normalized IS NOT NULL AND document_normalized <> '';
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
     CREATE TABLE IF NOT EXISTS clinical_evaluations (
       id text PRIMARY KEY, lead_id text NOT NULL UNIQUE, center_id text NOT NULL DEFAULT 'default-center',
       protocol_id text NOT NULL DEFAULT 'capillary-initial', status text NOT NULL DEFAULT 'draft',
       clinical_data jsonb NOT NULL DEFAULT '{}',
       created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinical_photos (
       id text PRIMARY KEY, evaluation_id text NOT NULL, view_id text NOT NULL, status text NOT NULL DEFAULT 'draft',
       original_object_path text NOT NULL, derivative_object_path text, original_mime_type text NOT NULL,
       original_bytes integer NOT NULL, original_sha256 text NOT NULL, width integer, height integer,
       source text NOT NULL DEFAULT 'upload', capture_metadata jsonb NOT NULL DEFAULT '{}',
       edit_params jsonb, note text, created_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz,
       discarded_at timestamptz
     );
     CREATE TABLE IF NOT EXISTS clinical_diagnoses (
       id text PRIMARY KEY, evaluation_id text NOT NULL UNIQUE, response_text text NOT NULL DEFAULT '',
       status text NOT NULL DEFAULT 'draft', closed_at timestamptz, closed_by_user_id text, closed_by_name text,
       created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinical_diagnosis_events (
       id text PRIMARY KEY, diagnosis_id text NOT NULL, action text NOT NULL, actor_user_id text, actor_name text,
       created_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinical_photo_annotations (
       id text PRIMARY KEY, photo_id text NOT NULL UNIQUE, object_path text NOT NULL, mime_type text NOT NULL,
       strokes jsonb NOT NULL DEFAULT '[]', updated_by_user_id text, updated_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS users (
       id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL,
       password_hash text NOT NULL, name text NOT NULL DEFAULT '', role text NOT NULL,
       center_id text, active boolean NOT NULL DEFAULT true,
       legal_representative boolean NOT NULL DEFAULT false,
       created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinical_photo_audit_events (
       id text PRIMARY KEY, photo_id text NOT NULL, evaluation_id text NOT NULL, action text NOT NULL,
       actor_type text NOT NULL, actor_id text, details jsonb NOT NULL DEFAULT '{}',
       created_at timestamptz NOT NULL DEFAULT now()
     );
  `);
});

beforeEach(async () => {
  await pglite.exec(`
    DELETE FROM clinical_photo_audit_events;
    DELETE FROM clinical_photo_annotations;
    DELETE FROM clinical_diagnosis_events;
    DELETE FROM clinical_diagnoses;
    DELETE FROM clinical_photos;
    DELETE FROM clinical_evaluations;
    DELETE FROM clinical_protocol_phases;
    DELETE FROM clinical_protocol_views;
    DELETE FROM clinical_protocols;
    DELETE FROM clinical_centers;
    DELETE FROM leads;
  `);
});

async function countLeads(): Promise<number> {
  const res = (await pglite.exec("SELECT count(*)::int AS n FROM leads;")) as Array<{
    rows: Array<{ n: number }>;
  }>;
  return res[0].rows[0].n;
}

async function createPatient(overrides: Record<string, unknown> = {}) {
  const res = await request(app).post("/api/patients").send({ ...VALID_BODY, ...overrides });
  expect(res.status).toBe(201);
  return res.body.lead as { id: string; token: string };
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

  it("mirrors capilar-specific fields into the evaluation's specialty-tagged clinicalData (Fase 5)", async () => {
    const res = await request(app).post("/api/patients").send({
      ...VALID_BODY,
      hairLossTime: "2 años",
      pattern: "vertex",
    });
    expect(res.status).toBe(201);

    const [evaluation] = await typedMockedDb.db.select()
      .from(typedMockedDb.evaluationsTable)
      .where(eq(typedMockedDb.evaluationsTable.leadId, res.body.lead.id));
    expect(evaluation.clinicalData).toMatchObject({ hairLossTime: "2 años", pattern: "vertex" });

    const [protocol] = await typedMockedDb.db.select()
      .from(typedMockedDb.protocolsTable)
      .where(eq(typedMockedDb.protocolsTable.id, evaluation.protocolId));
    expect(protocol.specialty).toBe("capilar");
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
    expect(res.body.resumable).toBe(true);
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

  it("flags a phone/email duplicate of an in-progress evaluation as resumable without leaking its token", async () => {
    const first = await request(app).post("/api/patients").send(VALID_BODY);
    expect(first.body.lead.status).toBe("incompleto");

    for (const retry of [
      { documentId: "20.347.878-K", email: "otra@example.com" }, // same phone
      { documentId: "20.347.878-K", phone: "+56922222222" }, // same email
    ]) {
      const res = await request(app).post("/api/patients").send({ ...VALID_BODY, ...retry });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ duplicate: true, resumable: true });
      expect(JSON.stringify(res.body)).not.toContain(first.body.lead.token);
      expect(res.body.lead).toBeUndefined();
    }
    expect(await countLeads()).toBe(1);
  });

  it("flags a duplicate of a finished evaluation as not resumable", async () => {
    const first = await request(app).post("/api/patients").send(VALID_BODY);
    await pglite.exec(`UPDATE leads SET status = 'listo' WHERE id = '${first.body.lead.id}'`);

    const byPhone = await request(app).post("/api/patients").send({
      ...VALID_BODY,
      documentId: "20.347.878-K",
      email: "otra@example.com",
    });
    expect(byPhone.status).toBe(409);
    expect(byPhone.body).toMatchObject({ duplicate: true, resumable: false });

    const byRut = await request(app).post("/api/patients").send({
      ...VALID_BODY,
      phone: "+56922222222",
      email: "otra@example.com",
    });
    expect(byRut.status).toBe(409);
    expect(byRut.body).toMatchObject({ duplicate: true, resumable: false });
    expect(await countLeads()).toBe(1);
  });
});

describe("resuming an in-progress evaluation with its own token", () => {
  it("restores the saved data and keeps saving progress into the same lead", async () => {
    const created = await request(app).post("/api/patients").send(VALID_BODY);
    const { token, id } = created.body.lead;

    // The patient leaves and comes back on the same device (stored token).
    const resumed = await request(app).get(`/api/patients/${token}`);
    expect(resumed.status).toBe(200);
    expect(resumed.body.lead).toMatchObject({ id, name: VALID_BODY.name, phone: VALID_BODY.phone, status: "incompleto" });

    // Continuing with the same phone/email/RUT is an update, never a duplicate.
    const saved = await request(app).put(`/api/patients/${token}`).send({ ...VALID_BODY, city: "Concepción" });
    expect(saved.status).toBe(200);
    expect(saved.body.lead).toMatchObject({ id, city: "Concepción", status: "incompleto" });
    expect(await countLeads()).toBe(1);
  });

  it("does not let a fresh registration take over the in-progress lead", async () => {
    const created = await request(app).post("/api/patients").send(VALID_BODY);
    const retry = await request(app).post("/api/patients").send({ ...VALID_BODY, name: "Otra Persona" });
    expect(retry.status).toBe(409);

    const lead = await request(app).get(`/api/patients/${created.body.lead.token}`);
    expect(lead.body.lead.name).toBe(VALID_BODY.name);
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

  it("refuses finalization until all five distinct required views are confirmed", async () => {
    const lead = await createPatient();
    const image = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==",
      "base64",
    );
    for (let index = 0; index < 5; index += 1) {
      const draft = await request(app).post(`/api/patients/${lead.token}/photos`)
        .set("Content-Type", "image/jpeg").set("x-photo-key", "frontal").set("x-photo-source", "upload").send(image);
      await request(app).post(`/api/patients/${lead.token}/photos/${draft.body.id}/confirm`).expect(200);
    }
    const res = await request(app).put(`/api/patients/${lead.token}`).send({ ...VALID_BODY, submit: true });
    expect(res.status).toBe(422);
  });
});

describe("Clinical photo API", () => {
  const JPEG_BYTES = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==",
    "base64",
  );

  async function uploadDraft(token: string, key = "frontal", bytes = JPEG_BYTES) {
    const res = await request(app)
      .post(`/api/patients/${token}/photos`)
      .set("Content-Type", "image/jpeg")
      .set("x-photo-key", key)
      .set("x-photo-source", "upload")
      .send(bytes);
    expect(res.status).toBe(201);
    return res.body as { id: string; originalObjectPath?: string; dataUrl?: string };
  }

  it("stores binary photo metadata outside lead JSON and never returns image bytes", async () => {
    const lead = await createPatient();
    const photo = await uploadDraft(lead.token);
    expect(photo.dataUrl).toBeUndefined();
    expect(photo.originalObjectPath).toBeUndefined();

    const status = await request(app).get(`/api/patients/${lead.token}/photos`);
    expect(status.status).toBe(200);
    expect(status.body.photos).toHaveLength(1);
    expect(JSON.stringify(status.body)).not.toContain("base64");
    expect(JSON.stringify(status.body)).not.toContain("data:image");

    const leadRow = (await pglite.exec("SELECT photos, photo_count FROM leads LIMIT 1;")) as Array<{
      rows: Array<{ photos: unknown; photo_count: string }>;
    }>;
    expect(leadRow[0].rows[0].photos).toEqual([]);
    expect(leadRow[0].rows[0].photo_count).toBe("0");
  });

  it("removes confirmed captures and private references when the patient restarts", async () => {
    const lead = await createPatient();
    const draft = await uploadDraft(lead.token, "frontal");
    await request(app).post(`/api/patients/${lead.token}/photos/${draft.id}/confirm`).expect(200);

    const discarded = await request(app).delete(`/api/patients/${lead.token}/photos`).expect(200);
    expect(discarded.body.lead.photoCount).toBe(0);
    expect(discarded.body.lead.status).toBe("incompleto");
    await request(app).get(`/api/patients/${lead.token}/photos`).expect(200).expect(({ body }) => {
      expect(body.photos).toEqual([]);
    });
    const rows = await pglite.exec("SELECT count(*)::int AS n FROM clinical_photos;") as Array<{ rows: Array<{ n: number }> }>;
    expect(rows[0].rows[0].n).toBe(0);
  });

  it("removes legacy photo JSON before a restart can migrate it again", async () => {
    const lead = await createPatient();
    const legacyDataUrl = `data:image/jpeg;base64,${JPEG_BYTES.toString("base64")}`;
    await pglite.exec(`UPDATE leads SET photos = '${JSON.stringify([{ key: "frontal", dataUrl: legacyDataUrl }]).replace(/'/g, "''")}'::jsonb WHERE token = '${lead.token}';`);

    await request(app).delete(`/api/patients/${lead.token}/photos`).expect(200).expect(({ body }) => {
      expect(body.lead.photoCount).toBe(0);
      expect(body.lead.status).toBe("incompleto");
      expect(body.lead.photoKeys).toEqual([]);
    });
    await request(app).get(`/api/patients/${lead.token}/photos`).expect(200).expect(({ body }) => {
      expect(body.photos).toEqual([]);
    });
    const rows = await pglite.exec(`SELECT photos FROM leads WHERE token = '${lead.token}';`) as Array<{ rows: Array<{ photos: unknown }> }>;
    expect(rows[0].rows[0].photos).toEqual([]);
    const clinical = await pglite.exec("SELECT count(*)::int AS n FROM clinical_photos;") as Array<{ rows: Array<{ n: number }> }>;
    expect(clinical[0].rows[0].n).toBe(0);
  });

  it("rejects arbitrary, truncated, and MIME-mismatched image bytes before storage", async () => {
    const lead = await createPatient();
    for (const body of [
      Buffer.from("not an image"),
      JPEG_BYTES.subarray(0, 20),
      Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQAAAAA3bvkk", "base64"),
    ]) {
      await request(app)
        .post(`/api/patients/${lead.token}/photos`)
        .set("Content-Type", "image/jpeg")
        .set("x-photo-key", "frontal")
        .set("x-photo-source", "upload")
        .send(body)
        .expect(400);
    }
    await request(app).get(`/api/patients/${lead.token}/photos`).expect(200).expect((response) => {
      expect(response.body.photos).toEqual([]);
    });
  });

  it("migrates a historical Base64 photo only after a verified private reference exists", async () => {
    const lead = await createPatient();
    const dataUrl = `data:image/jpeg;base64,${JPEG_BYTES.toString("base64")}`;
    await pglite.exec(`
      UPDATE leads
         SET photos = '${JSON.stringify([{ key: "frontal", dataUrl }]).replace(/'/g, "''")}'::jsonb
       WHERE token = '${lead.token}';
    `);

    const result = await request(app).get(`/api/patients/${lead.token}/photos`);
    expect(result.status).toBe(200);
    expect(result.body.photos).toHaveLength(1);
    expect(JSON.stringify(result.body)).not.toContain("base64");

    const rows = (await pglite.exec(`
      SELECT photos FROM leads WHERE token = '${lead.token}';
      SELECT original_object_path, original_sha256 FROM clinical_photos LIMIT 1;
    `)) as Array<{ rows: Array<Record<string, unknown>> }>;
    expect(rows[0].rows[0].photos).toEqual([expect.objectContaining({
      key: "frontal",
      migratedPhotoId: expect.any(String),
    })]);
    expect(JSON.stringify(rows[0].rows[0].photos)).not.toContain("dataUrl");
    expect(rows[1].rows[0].original_object_path).toBeTruthy();
    expect(rows[1].rows[0].original_sha256).toHaveLength(64);
  });

  it("removes every legacy Base64 payload, quarantining duplicate or unknown views", async () => {
    const lead = await createPatient();
    const validDataUrl = `data:image/jpeg;base64,${JPEG_BYTES.toString("base64")}`;
    await pglite.exec(`
      UPDATE leads
         SET photos = '${JSON.stringify([
           { key: "frontal", dataUrl: validDataUrl },
           { key: "frontal", dataUrl: validDataUrl },
           { key: "unknown-view", dataUrl: validDataUrl },
           { key: "broken", dataUrl: "data:image/jpeg;base64,not-valid***" },
         ]).replace(/'/g, "''")}'::jsonb
       WHERE token = '${lead.token}';
    `);
    await request(app).get(`/api/patients/${lead.token}/photos`).expect(200);

    const rows = (await pglite.exec(`
      SELECT photos FROM leads WHERE token = '${lead.token}';
      SELECT status, count(*)::int AS n FROM clinical_photos GROUP BY status ORDER BY status;
    `)) as Array<{ rows: Array<Record<string, unknown>> }>;
    expect(JSON.stringify(rows[0].rows[0].photos)).not.toContain("dataUrl");
    expect(rows[0].rows[0].photos).toEqual(expect.arrayContaining([
      expect.objectContaining({ migrationDisposition: "migrated" }),
      expect.objectContaining({ migrationDisposition: "quarantined" }),
      expect.objectContaining({ migrationDisposition: "redacted_invalid_legacy_payload" }),
    ]));
    expect(rows[1].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "confirmed", n: 1 }),
      expect.objectContaining({ status: "quarantined", n: 2 }),
    ]));
  });

  it("keeps the original immutable while adding a separately-audited adjusted derivative", async () => {
    const lead = await createPatient();
    const technicalOriginal = await sharp({ create: { width: 100, height: 80, channels: 3, background: "#888888" } }).jpeg().toBuffer();
    const draft = await uploadDraft(lead.token, "frontal", technicalOriginal);
    const confirmed = await request(app).post(`/api/patients/${lead.token}/photos/${draft.id}/confirm`);
    expect(confirmed.status).toBe(200);

    const derivative = await request(app)
      .post(`/api/patients/${lead.token}/photos/${draft.id}/adjusted`)
      .set("Content-Type", "image/jpeg")
      .set("x-edit-params", JSON.stringify({
        version: 1,
        crop: { x: 0, y: 0, width: 100, height: 80, aspectRatio: 1.25 },
        rotation: 0, exposure: 0, brightness: 8, contrast: 0, highlights: 0, shadows: 0,
        temperature: 0, saturation: 0, clarity: 0, sharpness: 0, noiseReduction: 0,
      }))
      .send(JPEG_BYTES);
    expect(derivative.status).toBe(201);

    const rows = (await pglite.exec(`
      SELECT original_object_path, derivative_object_path, original_sha256, edit_params
      FROM clinical_photos WHERE id = '${draft.id}';
      SELECT action FROM clinical_photo_audit_events WHERE photo_id = '${draft.id}' ORDER BY created_at;
    `)) as Array<{ rows: Array<Record<string, unknown>> }>;
    expect(rows[0].rows[0].original_object_path).toBeTruthy();
    expect(rows[0].rows[0].derivative_object_path).toBeTruthy();
    expect(rows[0].rows[0].original_sha256).toHaveLength(64);
    expect(rows[0].rows[0].edit_params).toEqual(expect.objectContaining({
      version: 1,
      brightness: 8,
      original: expect.objectContaining({ sha256: expect.any(String) }),
      derivative: expect.objectContaining({ sha256: expect.any(String) }),
    }));
    expect((rows[0].rows[0].edit_params as { derivative: { sha256: string } }).derivative.sha256)
      .not.toBe(createHash("sha256").update(JPEG_BYTES).digest("hex"));
    expect(rows[1].rows.map((row) => row.action)).toEqual([
      "uploaded",
      "confirmed",
      "adjusted_version_created",
    ]);

    const original = await request(app).get(`/api/patients/${lead.token}/photos/${draft.id}/original`);
    expect(original.status).toBe(200);
    expect(original.headers["cache-control"]).toBe("private, no-store");
    expect(original.headers["content-type"]).toContain("image/jpeg");

    const adjusted = await request(app).get(`/api/patients/${lead.token}/photos/${draft.id}/adjusted`);
    expect(adjusted.status).toBe(200);
    expect(adjusted.headers["cache-control"]).toBe("private, no-store");
    expect(adjusted.headers["content-type"]).toContain("image/jpeg");

    await request(app).delete(`/api/patients/${lead.token}/photos/${draft.id}/adjusted`).expect(200);
    const afterDiscard = (await pglite.exec(`
      SELECT original_object_path, derivative_object_path, original_sha256, edit_params
      FROM clinical_photos WHERE id = '${draft.id}';
      SELECT action FROM clinical_photo_audit_events WHERE photo_id = '${draft.id}' ORDER BY created_at;
    `)) as Array<{ rows: Array<Record<string, unknown>> }>;
    expect(afterDiscard[0].rows[0].original_object_path).toBe(rows[0].rows[0].original_object_path);
    expect(afterDiscard[0].rows[0].original_sha256).toBe(rows[0].rows[0].original_sha256);
    expect(afterDiscard[0].rows[0].derivative_object_path).toBeNull();
    expect(afterDiscard[0].rows[0].edit_params).toBeNull();
    expect(afterDiscard[1].rows.map((row) => row.action)).toContain("adjusted_version_discarded");
  });

  it("rejects an adjusted upload with values outside the conservative technical limits", async () => {
    const lead = await createPatient();
    const technicalOriginal = await sharp({ create: { width: 100, height: 80, channels: 3, background: "#888888" } }).jpeg().toBuffer();
    const draft = await uploadDraft(lead.token, "frontal", technicalOriginal);
    await request(app).post(`/api/patients/${lead.token}/photos/${draft.id}/confirm`).expect(200);

    const result = await request(app)
      .post(`/api/patients/${lead.token}/photos/${draft.id}/adjusted`)
      .set("Content-Type", "image/jpeg")
      .set("x-edit-params", JSON.stringify({
        version: 1,
        crop: { x: 0, y: 0, width: 100, height: 80 },
        rotation: 45, exposure: 0, brightness: 0, contrast: 0, highlights: 0, shadows: 0,
        temperature: 0, saturation: 0, clarity: 0, sharpness: 0, noiseReduction: 0,
      }))
      .send(JPEG_BYTES);
    expect(result.status).toBe(400);

    const rows = (await pglite.exec(`
      SELECT derivative_object_path, edit_params FROM clinical_photos WHERE id = '${draft.id}';
    `)) as Array<{ rows: Array<Record<string, unknown>> }>;
    expect(rows[0].rows[0].derivative_object_path).toBeNull();
    expect(rows[0].rows[0].edit_params).toBeNull();

    const extremeCrop = await request(app)
      .post(`/api/patients/${lead.token}/photos/${draft.id}/adjusted`)
      .set("Content-Type", "image/jpeg")
      .set("x-edit-params", JSON.stringify({
        version: 1,
        crop: { x: 0, y: 0, width: 1, height: 1 },
        rotation: 0, exposure: 0, brightness: 0, contrast: 0, highlights: 0, shadows: 0,
        temperature: 0, saturation: 0, clarity: 0, sharpness: 0, noiseReduction: 0,
      }))
      .send(JPEG_BYTES);
    expect(extremeCrop.status).toBe(400);
  });

  it("rejects access across patient tokens and only discards the requested draft", async () => {
    const first = await createPatient();
    const second = await createPatient({
      documentId: "20.347.878-K",
      phone: "+56922222222",
      email: "otra@example.com",
    });
    const firstDraft = await uploadDraft(first.token);
    const secondDraft = await uploadDraft(second.token);

    const crossRead = await request(app).get(`/api/patients/${second.token}/photos`);
    expect(crossRead.status).toBe(200);
    expect(crossRead.body.photos.map((photo: { id: string }) => photo.id)).toEqual([secondDraft.id]);

    const crossDiscard = await request(app).delete(`/api/patients/${second.token}/photos/${firstDraft.id}`);
    expect(crossDiscard.status).toBe(404);

    const discard = await request(app).delete(`/api/patients/${first.token}/photos/${firstDraft.id}`);
    expect(discard.status).toBe(200);
    const firstStatus = await request(app).get(`/api/patients/${first.token}/photos`);
    expect(firstStatus.body.photos).toEqual([]);
    const secondStatus = await request(app).get(`/api/patients/${second.token}/photos`);
    expect(secondStatus.body.photos).toHaveLength(1);
  });

  it("does not allow a confirmed original to be discarded by the patient", async () => {
    const lead = await createPatient();
    const draft = await uploadDraft(lead.token);
    await request(app).post(`/api/patients/${lead.token}/photos/${draft.id}/confirm`).expect(200);
    await request(app).delete(`/api/patients/${lead.token}/photos/${draft.id}`).expect(404);
    await request(app).get(`/api/patients/${lead.token}/photos`).expect(200);
  });
});

describe("Clinical center isolation", () => {
  it("does not list or reveal cases belonging to another center", async () => {
    const ownLead = await createPatient();
    const otherLead = await createPatient({
      documentId: "20.347.878-K",
      phone: "+56922222222",
      email: "otro-centro@example.com",
    });
    await pglite.exec(`
      UPDATE leads
         SET center_id = 'other-center', protocol_id = 'other-center-capillary-initial'
       WHERE id = '${otherLead.id}';
    `);
    const session = createSession({ userId: "test-staff-user", centerId: DEFAULT_CENTER_ID, role: "administrativo" });

    const list = await request(app)
      .get("/api/leads")
      .set("Cookie", `clinivista_session=${session}`);
    expect(list.status).toBe(200);
    expect(list.body.leads.map((lead: { id: string }) => lead.id)).toEqual([ownLead.id]);
    expect(JSON.stringify(list.body)).not.toContain(otherLead.id);

    await request(app)
      .get(`/api/leads/${otherLead.id}`)
      .set("Cookie", `clinivista_session=${session}`)
      .expect(404);
  });

  it("does not treat a RUT/phone/email already used at another clinic as a duplicate", async () => {
    const otherClinicLead = await createPatient();
    await pglite.exec(`
      UPDATE leads
         SET center_id = 'other-center', protocol_id = 'other-center-capillary-initial'
       WHERE id = '${otherClinicLead.id}';
    `);

    // Same RUT, phone and email as otherClinicLead, but this clinic (the
    // default center) has never seen this patient — it must not be rejected
    // as a duplicate just because another clinic already has that record.
    const res = await request(app).post("/api/patients").send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.lead.id).not.toBe(otherClinicLead.id);
  });

  it("stops accepting new patients while the clinic is suspended", async () => {
    await pglite.exec(`
      INSERT INTO clinical_centers (id, name, slug, active)
      VALUES ('${DEFAULT_CENTER_ID}', 'Centro principal', '${DEFAULT_CENTER_ID}', false)
      ON CONFLICT (id) DO UPDATE SET active = false;
    `);

    const res = await request(app).post("/api/patients").send(VALID_BODY);
    expect(res.status).toBe(403);

    await pglite.exec(`UPDATE clinical_centers SET active = true WHERE id = '${DEFAULT_CENTER_ID}';`);
    const resumed = await request(app).post("/api/patients").send(VALID_BODY);
    expect(resumed.status).toBe(201);
  });
});

describe("GET /api/patients/:token/clinic (identidad de la clínica para el paciente)", () => {
  it("shows the clinic's own name and logo, not another clinic's", async () => {
    const created = await createPatient();
    const token = created.token;
    await pglite.exec(`UPDATE clinical_centers SET name = 'Estecapelli', logo_data_url = 'data:image/png;base64,AAAA' WHERE id = '${DEFAULT_CENTER_ID}';`);
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug, logo_data_url) VALUES ('otra', 'Otra Clínica', 'otra', 'data:image/png;base64,BBBB');`);

    const res = await request(app).get(`/api/patients/${token}/clinic`).expect(200);
    expect(res.body).toEqual({ name: "Estecapelli", logoDataUrl: "data:image/png;base64,AAAA" });
    expect(JSON.stringify(res.body)).not.toContain("Otra");
  });

  it("falls back to the clinic name with no logo, and works before any identity was set", async () => {
    const created = await createPatient();
    const res = await request(app).get(`/api/patients/${created.token}/clinic`).expect(200);
    expect(res.body.logoDataUrl).toBeNull();
    expect(typeof res.body.name).toBe("string");
    expect(res.body.name.length).toBeGreaterThan(0);
  });

  it("404 for an unknown token", async () => {
    await request(app).get("/api/patients/nope-nope-nope/clinic").expect(404);
  });
});

describe("URL propia de cada clínica (/c/:slug)", () => {
  async function seedClinic(id: string, slug: string, name: string, active = true) {
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug, active) VALUES ('${id}', '${name}', '${slug}', ${active});`);
  }
  const register = (slug: string, overrides: Record<string, unknown> = {}) =>
    request(app).post(`/api/clinics/${slug}/patients`).send({ ...VALID_BODY, ...overrides });
  const centerOf = async (leadId: string) => {
    const rows = (await pglite.exec(`SELECT center_id, protocol_id FROM leads WHERE id = '${leadId}';`)) as Array<{ rows: Array<{ center_id: string; protocol_id: string }> }>;
    return rows[0].rows[0];
  };

  it("registers the patient in the clinic that owns the address, not the main one", async () => {
    await seedClinic("clinic-b", "clinica-demo", "Clínica Demo");
    const res = await register("clinica-demo").expect(201);
    expect(await centerOf(res.body.lead.id)).toEqual({ center_id: "clinic-b", protocol_id: "clinic-b-capillary-initial" });

    const identity = await request(app).get(`/api/patients/${res.body.lead.token}/clinic`).expect(200);
    expect(identity.body.name).toBe("Clínica Demo");
  });

  it("lets one person be evaluated at several clinics, each through its own address", async () => {
    await seedClinic("clinic-a", "estecapelli", "Estecapelli");
    await seedClinic("clinic-b", "clinica-demo", "Clínica Demo");
    const first = await register("estecapelli").expect(201);
    const second = await register("clinica-demo").expect(201);
    expect(first.body.lead.id).not.toBe(second.body.lead.id);
    expect(first.body.lead.token).not.toBe(second.body.lead.token);
    expect((await centerOf(first.body.lead.id)).center_id).toBe("clinic-a");
    expect((await centerOf(second.body.lead.id)).center_id).toBe("clinic-b");

    // Repeating at the SAME clinic is still a duplicate.
    await register("estecapelli").expect(409);
    await register("clinica-demo").expect(409);
  });

  it("keeps each clinic's patients private to that clinic's staff", async () => {
    await seedClinic("clinic-a", "estecapelli", "Estecapelli");
    await seedClinic("clinic-b", "clinica-demo", "Clínica Demo");
    await register("estecapelli").expect(201);
    const staffA = createSession({ userId: "a", centerId: "clinic-a", role: "administrativo" });
    const staffB = createSession({ userId: "b", centerId: "clinic-b", role: "administrativo" });
    const seenBy = async (session: string) =>
      (await request(app).get("/api/leads").set("Cookie", `clinivista_session=${session}`).expect(200)).body.leads.length;
    expect(await seenBy(staffA)).toBe(1);
    expect(await seenBy(staffB)).toBe(0);
  });

  it("refuses new patients at a suspended clinic, creating nothing", async () => {
    await seedClinic("clinic-b", "clinica-demo", "Clínica Demo", false);
    await register("clinica-demo").expect(403);
    expect(await countLeads()).toBe(0);
  });

  it("404s for an unknown address, and matches the address case-insensitively", async () => {
    await seedClinic("clinic-a", "estecapelli", "Estecapelli");
    await request(app).get("/api/clinics/no-existe").expect(404);
    await register("no-existe").expect(404);
    expect(await countLeads()).toBe(0);
    const res = await request(app).get("/api/clinics/Estecapelli").expect(200);
    expect(res.body.name).toBe("Estecapelli");
    await register("ESTECAPELLI").expect(201);
  });

  it("validates the registration the same way as the generic form", async () => {
    await seedClinic("clinic-a", "estecapelli", "Estecapelli");
    await register("estecapelli", { documentId: "12.345.678-9" }).expect(400);
    await register("estecapelli", { consent: false }).expect(422);
    expect(await countLeads()).toBe(0);
  });

  it("keeps the legacy /patient registration working for the main clinic", async () => {
    const res = await request(app).post("/api/patients").send(VALID_BODY).expect(201);
    expect((await centerOf(res.body.lead.id)).center_id).toBe(DEFAULT_CENTER_ID);
  });

  it("tells staff their own clinic's address", async () => {
    await seedClinic("clinic-b", "clinica-demo", "Clínica Demo");
    const staffB = createSession({ userId: "b", centerId: "clinic-b", role: "medico" });
    const res = await request(app).get("/api/clinic/me").set("Cookie", `clinivista_session=${staffB}`).expect(200);
    expect(res.body).toMatchObject({ name: "Clínica Demo", slug: "clinica-demo", logoDataUrl: null });
    await request(app).get("/api/clinic/me").expect(401);
    const director = createSession({ userId: "d", centerId: null, role: "director" });
    await request(app).get("/api/clinic/me").set("Cookie", `clinivista_session=${director}`).expect(403);
  });

  it("gives a clinic with no row yet an address on first ask", async () => {
    const staff = createSession({ userId: "a", centerId: DEFAULT_CENTER_ID, role: "administrativo" });
    const res = await request(app).get("/api/clinic/me").set("Cookie", `clinivista_session=${staff}`).expect(200);
    expect(res.body.slug).toBe(DEFAULT_CENTER_ID);
    await request(app).get(`/api/clinics/${res.body.slug}`).expect(200);
  });
});

describe("descripción opcional de cada fotografía", () => {
  const image = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==",
    "base64",
  );
  async function draftPhoto(token: string, key = "frontal") {
    const draft = await request(app).post(`/api/patients/${token}/photos`)
      .set("Content-Type", "image/jpeg").set("x-photo-key", key).set("x-photo-source", "upload").send(image);
    return draft.body.id as string;
  }

  it("stores the note on confirm, trimmed, and returns it to the patient and to staff", async () => {
    const lead = await createPatient();
    const id = await draftPhoto(lead.token);
    const confirmed = await request(app).post(`/api/patients/${lead.token}/photos/${id}/confirm`)
      .send({ note: "  Me duele al tocar esta zona\u0000  " }).expect(200);
    expect(confirmed.body.note).toBe("Me duele al tocar esta zona");

    const status = await request(app).get(`/api/patients/${lead.token}/photos`).expect(200);
    expect(status.body.photos[0].note).toBe("Me duele al tocar esta zona");

    const staff = createSession({ userId: "s1", centerId: DEFAULT_CENTER_ID, role: "medico" });
    const detail = await request(app).get(`/api/leads/${lead.id}`).set("Cookie", `clinivista_session=${staff}`).expect(200);
    expect(detail.body.photos.find((p: { id: string }) => p.id === id).note).toBe("Me duele al tocar esta zona");
  });

  it("keeps the note optional: omitted, empty or whitespace-only means no note", async () => {
    const lead = await createPatient();
    const a = await draftPhoto(lead.token, "frontal");
    const b = await draftPhoto(lead.token, "vertex");
    const c = await draftPhoto(lead.token, "donor");
    expect((await request(app).post(`/api/patients/${lead.token}/photos/${a}/confirm`).expect(200)).body.note).toBeNull();
    expect((await request(app).post(`/api/patients/${lead.token}/photos/${b}/confirm`).send({ note: "" }).expect(200)).body.note).toBeNull();
    expect((await request(app).post(`/api/patients/${lead.token}/photos/${c}/confirm`).send({ note: "   " }).expect(200)).body.note).toBeNull();
  });

  it("rejects notes over 500 characters or of the wrong type, leaving the photo as a draft", async () => {
    const lead = await createPatient();
    const id = await draftPhoto(lead.token);
    await request(app).post(`/api/patients/${lead.token}/photos/${id}/confirm`).send({ note: "x".repeat(501) }).expect(400);
    await request(app).post(`/api/patients/${lead.token}/photos/${id}/confirm`).send({ note: 42 }).expect(400);
    const ok = await request(app).post(`/api/patients/${lead.token}/photos/${id}/confirm`).send({ note: "x".repeat(500) }).expect(200);
    expect(ok.body.note).toHaveLength(500);
  });
});

describe("Fases del proceso: captura del personal después de la pre-evaluación", () => {
  const JPEG = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==",
    "base64",
  );
  const KEYS = ["frontal", "vertex", "temporalRight", "temporalLeft", "donor"];
  const staff = (centerId = DEFAULT_CENTER_ID, role: "medico" | "administrativo" = "medico") =>
    `clinivista_session=${createSession({ userId: "staff-1", centerId, role })}`;

  async function patientWithPreEvaluation(complete = true, overrides: Record<string, unknown> = {}) {
    const lead = await createPatient(overrides);
    for (const key of complete ? KEYS : KEYS.slice(0, 2)) {
      const draft = await request(app).post(`/api/patients/${lead.token}/photos`)
        .set("Content-Type", "image/jpeg").set("x-photo-key", key).set("x-photo-source", "upload").send(JPEG).expect(201);
      await request(app).post(`/api/patients/${lead.token}/photos/${draft.body.id}/confirm`).expect(200);
    }
    return lead;
  }
  type PhaseRow = {
    id: string; name: string; kind: string; enabled: boolean; complete: boolean; patientCaptured: boolean;
    views: Array<{ id: string; key: string; required: boolean; photo: { id: string } | null }>;
  };
  const phases = async (leadId: string, cookie = staff()) =>
    (await request(app).get(`/api/leads/${leadId}/phases`).set("Cookie", cookie).expect(200)).body.phases as PhaseRow[];
  const capture = (leadId: string, viewId: string, cookie = staff()) =>
    request(app).post(`/api/leads/${leadId}/views/${viewId}/photo`).set("Cookie", cookie).set("Content-Type", "image/jpeg").send(JPEG);
  const closeDiagnosis = async (leadId: string) => {
    await request(app).put(`/api/leads/${leadId}/diagnosis`).set("Cookie", staff()).send({ responseText: "Candidato a injerto." }).expect(200);
    await request(app).post(`/api/leads/${leadId}/diagnosis/close`).set("Cookie", staff()).send({}).expect(200);
  };
  /** A patient whose diagnosis is closed, so the clinic's own phases are open. */
  async function patientReadyForCapture() {
    const lead = await patientWithPreEvaluation();
    await closeDiagnosis(lead.id);
    return lead;
  }

  it("lists the six phases; each opens only when the previous one is complete", async () => {
    const lead = await patientWithPreEvaluation(false);
    let list = await phases(lead.id);
    expect(list.map((p) => p.name)).toEqual(["Pre-evaluación", "Diagnóstico", "Pre-operatorio", "Post-operatorio", "Control médico 1", "Control médico 2"]);
    expect(list.map((p) => p.enabled)).toEqual([true, false, false, false, false, false]);
    expect(list[0].patientCaptured).toBe(true);
    expect(list[1].kind).toBe("diagnosis");
    expect((await capture(lead.id, list[2].views[0].id)).status).toBe(409);

    for (const key of KEYS.slice(2)) {
      const draft = await request(app).post(`/api/patients/${lead.token}/photos`)
        .set("Content-Type", "image/jpeg").set("x-photo-key", key).set("x-photo-source", "upload").send(JPEG).expect(201);
      await request(app).post(`/api/patients/${lead.token}/photos/${draft.body.id}/confirm`).expect(200);
    }
    list = await phases(lead.id);
    expect(list[0].complete).toBe(true);
    expect(list[1].enabled).toBe(true);
    expect(list[1].complete).toBe(false); // open until the doctor closes it
    expect(list[2].enabled).toBe(false);
  });

  it("staff capture a phase in order; completing it opens the next", async () => {
    const lead = await patientReadyForCapture();
    let list = await phases(lead.id);
    expect(list[2].enabled).toBe(true);
    for (const view of list[2].views.slice(0, 4)) await capture(lead.id, view.id).expect(201);
    list = await phases(lead.id);
    expect(list[2].complete).toBe(false);
    expect(list[3].enabled).toBe(false);
    const res = await capture(lead.id, list[2].views[4].id).expect(201);
    expect(res.body).toMatchObject({ status: "confirmed" });
    list = await phases(lead.id);
    expect(list[2].complete).toBe(true);
    expect(list[3].enabled).toBe(true);
    await capture(lead.id, list[3].views[0].id).expect(201);
  });

  it("the patient never sees nor counts the clinic's later-phase photos", async () => {
    const lead = await patientReadyForCapture();
    const list = await phases(lead.id);
    const photo = (await capture(lead.id, list[2].views[0].id).expect(201)).body as { id: string };
    const status = await request(app).get(`/api/patients/${lead.token}/photos`).expect(200);
    expect(status.body.photos).toHaveLength(5);
    expect(status.body.photos.map((p: { id: string }) => p.id)).not.toContain(photo.id);
    await request(app).get(`/api/patients/${lead.token}/photos/${photo.id}/original`).expect(404);
    await request(app).delete(`/api/patients/${lead.token}/photos/${photo.id}`).expect(404);
    const detail = await request(app).get(`/api/leads/${lead.id}`).set("Cookie", staff()).expect(200);
    expect(detail.body.photos).toHaveLength(5);
    const summary = (await request(app).get("/api/leads").set("Cookie", staff()).expect(200)).body.leads[0];
    expect(summary.photoCount).toBe(5);
    // staff can still open the file
    await request(app).get(`/api/leads/${lead.id}/photos/${photo.id}`).set("Cookie", staff()).expect(200);
  });

  it("the patient restarting their evaluation keeps the clinic's phases", async () => {
    const lead = await patientReadyForCapture();
    const list = await phases(lead.id);
    await capture(lead.id, list[2].views[0].id).expect(201);
    await request(app).delete(`/api/patients/${lead.token}/photos`).expect(200);
    const after = await phases(lead.id);
    expect(after[0].views.every((v) => v.photo === null)).toBe(true);
    expect(after[2].views[0].photo).not.toBeNull();
  });

  it("a new capture replaces the previous one; staff can remove their own photo but not the patient's", async () => {
    const lead = await patientReadyForCapture();
    const list = await phases(lead.id);
    const first = (await capture(lead.id, list[2].views[0].id).expect(201)).body as { id: string };
    const second = (await capture(lead.id, list[2].views[0].id).expect(201)).body as { id: string };
    expect((await phases(lead.id))[2].views[0].photo?.id).toBe(second.id);
    expect(first.id).not.toBe(second.id);
    await request(app).delete(`/api/leads/${lead.id}/phase-photos/${second.id}`).set("Cookie", staff()).expect(204);
    expect((await phases(lead.id))[2].views[0].photo).toBeNull();
    const patientPhoto = list[0].views[0].photo!.id;
    await request(app).delete(`/api/leads/${lead.id}/phase-photos/${patientPhoto}`).set("Cookie", staff()).expect(400);
    expect((await capture(lead.id, list[0].views[0].id)).status).toBe(400);
  });

  it("is limited to the clinic's own staff", async () => {
    const lead = await patientReadyForCapture();
    const list = await phases(lead.id);
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-z', 'Z', 'z');`);
    const other = staff("clinic-z");
    await request(app).get(`/api/leads/${lead.id}/phases`).set("Cookie", other).expect(404);
    await capture(lead.id, list[2].views[0].id, other).expect(404);
    await request(app).get(`/api/leads/${lead.id}/phases`).expect(401);
    await request(app).post(`/api/leads/${lead.id}/views/${list[2].views[0].id}/photo`).set("Content-Type", "image/jpeg").send(JPEG).expect(401);
    await capture(lead.id, "no-existe").expect(404);
  });

  it("rejects things that are not images", async () => {
    const lead = await patientReadyForCapture();
    const list = await phases(lead.id);
    const res = await request(app).post(`/api/leads/${lead.id}/views/${list[2].views[0].id}/photo`)
      .set("Cookie", staff()).set("Content-Type", "image/jpeg").send(Buffer.from("no soy una imagen"));
    expect(res.status).toBe(400);
  });

  describe("Diagnóstico del médico", () => {
    const STROKES = [
      { type: "pen", color: "#ff0000", width: 0.004, points: [[0.1, 0.1], [0.2, 0.25]] },
      { type: "ellipse", color: "#00a9a5", width: 0.004, points: [[0.3, 0.3], [0.5, 0.45]] },
      { type: "text", color: "#ffffff", width: 0.03, points: [[0.2, 0.8]], text: "Zona receptora" },
    ];
    const dataUrl = (bytes: Buffer = JPEG) => `data:image/jpeg;base64,${bytes.toString("base64")}`;
    const diagnosis = (leadId: string, cookie = staff()) => request(app).get(`/api/leads/${leadId}/diagnosis`).set("Cookie", cookie);
    const annotate = (leadId: string, photoId: string, body: unknown, cookie = staff()) =>
      request(app).put(`/api/leads/${leadId}/photos/${photoId}/annotation`).set("Cookie", cookie).send(body as object);

    it("lists the patient's photos to mark up; everyone in the clinic reads it, only the médico edits", async () => {
      const lead = await patientWithPreEvaluation();
      const res = await diagnosis(lead.id, staff(DEFAULT_CENTER_ID, "administrativo")).expect(200);
      expect(res.body).toMatchObject({ status: "draft", responseText: "", readyToDiagnose: true, canEdit: false });
      expect(res.body.photos).toHaveLength(5);
      expect((await diagnosis(lead.id).expect(200)).body.canEdit).toBe(true);
      const admin = staff(DEFAULT_CENTER_ID, "administrativo");
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", admin).send({ responseText: "x" }).expect(403);
      await request(app).post(`/api/leads/${lead.id}/diagnosis/close`).set("Cookie", admin).send({}).expect(403);
      await annotate(lead.id, res.body.photos[0].photoId, { image: dataUrl(), strokes: STROKES }, admin).expect(403);
      await request(app).get(`/api/leads/${lead.id}/diagnosis`).expect(401);
    });

    it("saves a drawing over a patient photo without touching the original, and can edit it again", async () => {
      const lead = await patientWithPreEvaluation();
      const photos = (await diagnosis(lead.id).expect(200)).body.photos as Array<{ photoId: string; strokes: unknown[] }>;
      const target = photos[0].photoId;
      const saved = await annotate(lead.id, target, { image: dataUrl(), strokes: STROKES }).expect(200);
      const marked = saved.body.photos.find((p: { photoId: string }) => p.photoId === target);
      expect(marked).toMatchObject({ hasAnnotation: true });
      expect(marked.strokes).toEqual(STROKES);
      expect(saved.body.photos.filter((p: { hasAnnotation: boolean }) => p.hasAnnotation)).toHaveLength(1);
      const file = await request(app).get(`/api/leads/${lead.id}/photos/${target}/annotation`).set("Cookie", staff()).expect(200);
      expect(file.headers["content-type"]).toContain("image/jpeg");
      // the patient's original is still there, and the patient cannot reach the drawing
      await request(app).get(`/api/leads/${lead.id}/photos/${target}`).set("Cookie", staff()).expect(200);
      await request(app).get(`/api/leads/${lead.id}/photos/${target}/annotation`).expect(401);
      // editing again replaces the drawing
      const again = await annotate(lead.id, target, { image: dataUrl(), strokes: STROKES.slice(0, 1) }).expect(200);
      expect(again.body.photos.find((p: { photoId: string }) => p.photoId === target).strokes).toHaveLength(1);
      await request(app).delete(`/api/leads/${lead.id}/photos/${target}/annotation`).set("Cookie", staff()).expect(204);
      await request(app).get(`/api/leads/${lead.id}/photos/${target}/annotation`).set("Cookie", staff()).expect(404);
    });

    it("rejects invalid drawings and photos that are not the patient's", async () => {
      const lead = await patientReadyForCapture();
      const list = await phases(lead.id);
      const photoId = list[0].views[0].photo!.id;
      await request(app).post(`/api/leads/${lead.id}/diagnosis/reopen`).set("Cookie", staff()).expect(200);
      const bad = [
        { image: dataUrl(Buffer.from("no soy imagen")), strokes: STROKES },
        { image: "data:text/html;base64,PGI+", strokes: STROKES },
        { image: dataUrl(), strokes: [{ type: "pen", color: "rojo", width: 0.004, points: [[0.1, 0.1]] }] },
        { image: dataUrl(), strokes: [{ type: "pen", color: "#ff0000", width: 0.004, points: [[1.5, 0.1]] }] },
        { image: dataUrl(), strokes: [{ type: "text", color: "#ff0000", width: 0.03, points: [[0.1, 0.1]], text: "" }] },
        { image: dataUrl(), strokes: "nada" },
        { strokes: STROKES },
      ];
      for (const body of bad) await annotate(lead.id, photoId, body).expect(400);
      await annotate(lead.id, "otra-foto", { image: dataUrl(), strokes: STROKES }).expect(404);
    });

    it("needs the patient's pre-evaluation and a written answer before closing", async () => {
      const incomplete = await patientWithPreEvaluation(false, { documentId: "11.111.111-1", phone: "+56933333333", email: "otro@example.com" });
      await request(app).put(`/api/leads/${incomplete.id}/diagnosis`).set("Cookie", staff()).send({ responseText: "Hola" }).expect(200);
      await request(app).post(`/api/leads/${incomplete.id}/diagnosis/close`).set("Cookie", staff()).send({}).expect(409);
      const lead = await patientWithPreEvaluation();
      const empty = await request(app).post(`/api/leads/${lead.id}/diagnosis/close`).set("Cookie", staff()).send({});
      expect(empty.status).toBe(400);
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff()).send({ responseText: "x".repeat(8001) }).expect(400);
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff()).send({ responseText: 5 }).expect(400);
    });

    it("closing locks it read-only and opens the next phase; reopening is possible and leaves a record", async () => {
      const lead = await patientWithPreEvaluation();
      const photoId = (await diagnosis(lead.id).expect(200)).body.photos[0].photoId as string;
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff()).send({ responseText: "Borrador" }).expect(200);
      const closed = await request(app).post(`/api/leads/${lead.id}/diagnosis/close`).set("Cookie", staff())
        .send({ responseText: "Candidato a injerto capilar, 2500 unidades." }).expect(200);
      expect(closed.body).toMatchObject({ status: "closed", responseText: "Candidato a injerto capilar, 2500 unidades." });
      expect(closed.body.closedAt).toBeTruthy();
      expect((await phases(lead.id))[1].complete).toBe(true);
      expect((await phases(lead.id))[2].enabled).toBe(true);

      // read-only while closed
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff()).send({ responseText: "otra" }).expect(409);
      await annotate(lead.id, photoId, { image: dataUrl(), strokes: STROKES }).expect(409);
      await request(app).delete(`/api/leads/${lead.id}/photos/${photoId}/annotation`).set("Cookie", staff()).expect(409);
      await request(app).post(`/api/leads/${lead.id}/diagnosis/close`).set("Cookie", staff()).send({}).expect(409);

      // reopen: editable again, next phase locks again, and it is on the record
      const reopened = await request(app).post(`/api/leads/${lead.id}/diagnosis/reopen`).set("Cookie", staff()).expect(200);
      expect(reopened.body.status).toBe("draft");
      expect(reopened.body.events.map((e: { action: string }) => e.action)).toEqual(["saved", "closed", "reopened"]);
      expect((await phases(lead.id))[2].enabled).toBe(false);
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff()).send({ responseText: "Corregido" }).expect(200);
      await request(app).post(`/api/leads/${lead.id}/diagnosis/reopen`).set("Cookie", staff()).expect(409);
    });

    it("is limited to the clinic's own médicos", async () => {
      const lead = await patientWithPreEvaluation();
      await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-y', 'Y', 'y');`);
      await diagnosis(lead.id, staff("clinic-y")).expect(404);
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff("clinic-y")).send({ responseText: "x" }).expect(404);
    });

    it("the patient restarting their evaluation also erases the drawings on those photos", async () => {
      const lead = await patientWithPreEvaluation();
      const photoId = (await diagnosis(lead.id).expect(200)).body.photos[0].photoId as string;
      await annotate(lead.id, photoId, { image: dataUrl(), strokes: STROKES }).expect(200);
      await request(app).delete(`/api/patients/${lead.token}/photos`).expect(200);
      const rows = (await pglite.exec("SELECT count(*)::int AS n FROM clinical_photo_annotations;")) as Array<{ rows: Array<{ n: number }> }>;
      expect(rows[0].rows[0].n).toBe(0);
    });
  });
});

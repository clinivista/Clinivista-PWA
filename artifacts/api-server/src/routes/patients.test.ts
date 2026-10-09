import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
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
  const passwords = await import("../../../../lib/db/src/passwords");
  return { ...schema, ...passwords, db, pool: client, __pglite: client };
});

import { eq } from "drizzle-orm";
import * as mockedDb from "@workspace/db";
import patientsRouter from "./patients";
import leadsRouter from "./leads";
import leadPhasesRouter from "./lead-phases";
import diagnosisRouter from "./diagnosis";
import resultsRouter from "./results";
import portalRouter from "./portal";
import { createSession } from "../lib/sessions";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";
import { resetThrottleForTests } from "../lib/patient-accounts";
import { toMailLanguage } from "../lib/mail-i18n";

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
app.use("/api", resultsRouter);
app.use("/api", portalRouter);

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
       protocol_id text DEFAULT 'capillary-initial',
       delivery_channel text DEFAULT '',
       language text DEFAULT '',
       patient_account_id text,
       clinical_data jsonb NOT NULL DEFAULT '{}'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS leads_center_document_unique
      ON leads (center_id, document_normalized)
      WHERE document_normalized IS NOT NULL AND document_normalized <> '';
     CREATE TABLE IF NOT EXISTS clinical_centers (
       id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
       active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar',
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
     CREATE TABLE IF NOT EXISTS patient_accounts (
       id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL UNIQUE, password_hash text,
       name text NOT NULL DEFAULT '', email_verified boolean NOT NULL DEFAULT false,
       token_hash text, token_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
       updated_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinical_result_deliveries (
       id text PRIMARY KEY, lead_id text NOT NULL, token text NOT NULL UNIQUE, object_path text NOT NULL,
       channel text NOT NULL, recipient text NOT NULL DEFAULT '', status text NOT NULL, error text,
       created_by_user_id text, created_by_name text, created_at timestamptz NOT NULL DEFAULT now(),
       expires_at timestamptz NOT NULL
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
       reset_token_hash text, reset_token_expires_at timestamptz,
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
    DELETE FROM clinical_result_deliveries;
    DELETE FROM patient_accounts;
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
    expect(res.body).toEqual({ name: "Estecapelli", logoDataUrl: "data:image/png;base64,AAAA", specialty: "capilar" });
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

describe("Cirugía plástica (segunda especialidad)", () => {
  const answers = { procedure: "rhinoplasty", concern: "  Perfil de la nariz  ", timeframe: "m3to6", smoking: "yes", conditions: "Hipertensión", hacker: "x", previousSurgeries: "" };
  const register = (slug: string, body: Record<string, unknown> = {}) =>
    request(app).post(`/api/clinics/${slug}/patients`).send({ ...VALID_BODY, ...body });

  beforeEach(async () => {
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug, specialty) VALUES ('plastica-a', 'Clínica Plástica', 'plastica-a', 'plastica') ON CONFLICT DO NOTHING;`);
  });

  it("the clinic's specialty reaches the patient form", async () => {
    expect((await request(app).get("/api/clinics/plastica-a").expect(200)).body.specialty).toBe("plastica");
    const lead = (await register("plastica-a", { clinicalData: answers }).expect(201)).body.lead;
    expect((await request(app).get(`/api/patients/${lead.token}/clinic`).expect(200)).body.specialty).toBe("plastica");
  });

  it("saves only this specialty's answers, trimmed, with unlisted options and unknown questions dropped", async () => {
    const created = await register("plastica-a", { clinicalData: answers }).expect(201);
    expect(created.body.lead.clinicalData).toEqual({ procedure: "rhinoplasty", concern: "Perfil de la nariz", timeframe: "m3to6", smoking: "yes", conditions: "Hipertensión" });
    const token = created.body.lead.token as string;
    // an update without answers keeps them; invalid selections are discarded
    const kept = await request(app).put(`/api/patients/${token}`).send({ ...VALID_BODY }).expect(200);
    expect(kept.body.lead.clinicalData.procedure).toBe("rhinoplasty");
    const cleaned = await request(app).put(`/api/patients/${token}`).send({ ...VALID_BODY, clinicalData: { procedure: "magia", smoking: "no", concern: "  " } }).expect(200);
    expect(cleaned.body.lead.clinicalData).toEqual({ smoking: "no" });
  });

  it("starts the clinic with the plastic surgery photo protocol and phases, not the hair one", async () => {
    const lead = (await register("plastica-a", { clinicalData: answers }).expect(201)).body.lead;
    const protocol = await request(app).get(`/api/patients/${lead.token}/protocol`).expect(200);
    expect(protocol.body.views.map((v: { key: string }) => v.key)).toEqual(["plasticFront", "plasticProfileRight", "plasticProfileLeft", "plasticObliqueRight", "plasticObliqueLeft"]);
    const phases = (await pglite.exec(`SELECT name, kind FROM clinical_protocol_phases WHERE protocol_id LIKE 'plastica-a%' ORDER BY position;`)) as Array<{ rows: Array<{ name: string; kind: string }> }>;
    expect(phases[0].rows.map((r) => r.name)).toEqual(["Pre-evaluación", "Diagnóstico", "Pre-operatorio", "Post-operatorio", "Control médico 1", "Control médico 2"]);
    const protocols = (await pglite.exec(`SELECT specialty FROM clinical_protocols WHERE center_id = 'plastica-a';`)) as Array<{ rows: Array<{ specialty: string }> }>;
    expect(protocols[0].rows[0].specialty).toBe("plastica");
  });

  it("a hair clinic ignores those answers and keeps its own columns", async () => {
    const created = await request(app).post("/api/patients").send({ ...VALID_BODY, hairLossTime: "1 a 3 años", clinicalData: answers }).expect(201);
    expect(created.body.lead.hairLossTime).toBe("1 a 3 años");
    expect(created.body.lead.clinicalData ?? {}).toEqual({});
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
  async function patientReadyForCapture(documentId?: string, email?: string, phone?: string) {
    const lead = await patientWithPreEvaluation(true, documentId ? { documentId, email, phone } : {});
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
  describe("Entrega de resultados al paciente", () => {
    const results = (leadId: string, cookie = staff()) => request(app).get(`/api/leads/${leadId}/results`).set("Cookie", cookie);
    const deliver = (leadId: string, channel: unknown, cookie = staff()) =>
      request(app).post(`/api/leads/${leadId}/results/deliver`).set("Cookie", cookie).send({ channel });
    const pdfOf = (body: Buffer) => Buffer.isBuffer(body) && body.subarray(0, 5).toString() === "%PDF-";
    const binary = (res: request.Response) => res.body as Buffer;

    afterEach(() => {
      vi.unstubAllGlobals();
      delete process.env.RESEND_API_KEY;
      delete process.env.MAIL_FROM;
      delete process.env.PUBLIC_APP_URL;
    });

    it("the patient picks how to receive results in phase 1 and the clinic sees it; email needs an email", async () => {
      const created = await request(app).post("/api/patients").send({ ...VALID_BODY, deliveryChannel: "whatsapp" }).expect(201);
      expect(created.body.lead.deliveryChannel).toBe("whatsapp");
      const token = created.body.lead.token as string;
      // an update that omits the choice keeps it; an unknown value is cleared
      const kept = await request(app).put(`/api/patients/${token}`).send({ ...VALID_BODY }).expect(200);
      expect(kept.body.lead.deliveryChannel).toBe("whatsapp");
      const noEmail = await request(app).put(`/api/patients/${token}`).send({ ...VALID_BODY, email: "", deliveryChannel: "email" });
      expect(noEmail.status).toBe(422);
      const bogus = await request(app).put(`/api/patients/${token}`).send({ ...VALID_BODY, deliveryChannel: "paloma" }).expect(200);
      expect(bogus.body.lead.deliveryChannel).toBe("");
      await request(app).post("/api/patients").send({ ...VALID_BODY, documentId: "20.347.878-K", phone: "+56933333333", email: "", deliveryChannel: "email" }).expect(422);
      await request(app).put(`/api/patients/${token}`).send({ ...VALID_BODY, deliveryChannel: "email" }).expect(200);
      const state = await results(created.body.lead.id).expect(200);
      expect(state.body).toMatchObject({ preferredChannel: "email", email: "prueba@example.com", emailConfigured: false, deliveries: [] });
    });

    it("builds the PDF only once the diagnosis is closed, for staff of that clinic only", async () => {
      const lead = await patientWithPreEvaluation();
      await request(app).get(`/api/leads/${lead.id}/results/pdf`).set("Cookie", staff()).expect(409);
      await deliver(lead.id, "whatsapp").expect(409);
      await closeDiagnosis(lead.id);
      const pdf = await request(app).get(`/api/leads/${lead.id}/results/pdf`).set("Cookie", staff()).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      }).expect(200);
      expect(pdf.headers["content-type"]).toContain("application/pdf");
      expect(pdfOf(binary(pdf))).toBe(true);
      await request(app).get(`/api/leads/${lead.id}/results/pdf`).expect(401);
      await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-z', 'Z', 'z');`);
      await request(app).get(`/api/leads/${lead.id}/results/pdf`).set("Cookie", staff("clinic-z")).expect(404);
      await deliver(lead.id, "whatsapp", staff("clinic-z")).expect(404);
      await deliver(lead.id, "paloma").expect(400);
    });

    it("WhatsApp: returns a wa.me link with a secret PDF link that the patient opens without signing in", async () => {
      process.env.PUBLIC_APP_URL = "https://app.example.cl/";
      const lead = await patientReadyForCapture();
      const res = await deliver(lead.id, "whatsapp").expect(200);
      expect(res.body).toMatchObject({ channel: "whatsapp", status: "link", recipient: "+56911111111" });
      expect(res.body.link).toMatch(/^https:\/\/app\.example\.cl\/api\/results\/[0-9a-f]{48}$/);
      expect(res.body.whatsappUrl).toContain("https://wa.me/56911111111?text=");
      expect(decodeURIComponent(res.body.whatsappUrl)).toContain(res.body.link);
      const token = (res.body.link as string).split("/").pop()!;
      const file = await request(app).get(`/api/results/${token}`).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      }).expect(200);
      expect(pdfOf(binary(file))).toBe(true);
      expect(file.headers["cache-control"]).toContain("no-store");
      await request(app).get(`/api/results/${"0".repeat(48)}`).expect(404);
      await request(app).get("/api/results/corto").expect(404);
      const history = (await results(lead.id).expect(200)).body.deliveries;
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ channel: "whatsapp", status: "link" });
      // an expired link stops working
      await pglite.exec(`UPDATE clinical_result_deliveries SET expires_at = now() - interval '1 day';`);
      await request(app).get(`/api/results/${token}`).expect(404);
    });

    it("WhatsApp message is written in the patient's language", async () => {
      process.env.PUBLIC_APP_URL = "https://app.example.cl";
      const lead = await patientReadyForCapture();
      await pglite.exec(`UPDATE leads SET language = 'de' WHERE id = '${lead.id}';`);
      const res = await deliver(lead.id, "whatsapp").expect(200);
      const text = decodeURIComponent(String(res.body.whatsappUrl).split("text=")[1]);
      expect(text).toContain(res.body.link);
      expect(text).not.toMatch(/Hola/);
    });

    it("email: sends the link through the mail service, and says so plainly when it is not configured", async () => {
      process.env.PUBLIC_APP_URL = "https://app.example.cl";
      const lead = await patientReadyForCapture();
      const missing = await deliver(lead.id, "email");
      expect(missing.status).toBe(503);
      expect(missing.body.error).toMatch(/no está configurado/);
      let history = (await results(lead.id).expect(200)).body.deliveries;
      expect(history[0]).toMatchObject({ channel: "email", status: "failed" });

      process.env.RESEND_API_KEY = "re_test_key";
      process.env.MAIL_FROM = "Clínica <resultados@example.cl>";
      const sent: Array<{ url: string; init: RequestInit }> = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
        sent.push({ url, init });
        return new Response(JSON.stringify({ id: "1" }), { status: 200 });
      }));
      const ok = await deliver(lead.id, "email").expect(200);
      expect(ok.body).toMatchObject({ channel: "email", status: "sent", recipient: "prueba@example.com", whatsappUrl: null });
      expect(sent).toHaveLength(1);
      expect(sent[0].url).toBe("https://api.resend.com/emails");
      expect((sent[0].init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
      const payload = JSON.parse(String(sent[0].init.body)) as { to: string[]; text: string };
      expect(payload.to).toEqual(["prueba@example.com"]);
      expect(payload.text).toContain(ok.body.link);

      vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 422 })));
      const rejected = await deliver(lead.id, "email");
      expect(rejected.status).toBe(502);
      history = (await results(lead.id).expect(200)).body.deliveries;
      expect(history.map((h: { status: string }) => h.status).sort()).toEqual(["failed", "failed", "sent"]);
      // a failed attempt never leaves a working link behind
      const failedTokens = (await pglite.exec("SELECT token FROM clinical_result_deliveries WHERE status = 'failed';")) as Array<{ rows: Array<{ token: string }> }>;
      for (const row of failedTokens[0].rows) await request(app).get(`/api/results/${row.token}`).expect(404);
    });

    it("rejects a channel the patient has no contact for", async () => {
      const lead = await patientReadyForCapture();
      await pglite.exec(`UPDATE leads SET email = '', phone = '123';`);
      expect((await deliver(lead.id, "email")).status).toBe(422);
      expect((await deliver(lead.id, "whatsapp")).status).toBe(422);
    });

    it("the PDF includes the doctor's drawing when there is one, and the patient's photo otherwise", async () => {
      const lead = await patientWithPreEvaluation();
      const photos = (await request(app).get(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff()).expect(200)).body.photos as Array<{ photoId: string }>;
      await request(app).put(`/api/leads/${lead.id}/photos/${photos[0].photoId}/annotation`).set("Cookie", staff())
        .send({ image: `data:image/jpeg;base64,${JPEG.toString("base64")}`, strokes: [{ type: "line", color: "#ff0000", width: 0.004, points: [[0.1, 0.1], [0.4, 0.4]] }] }).expect(200);
      await closeDiagnosis(lead.id);
      const res = await request(app).get(`/api/leads/${lead.id}/results/pdf`).set("Cookie", staff()).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      }).expect(200);
      expect(pdfOf(binary(res))).toBe(true);
      expect(binary(res).length).toBeGreaterThan(5_000);
    });

    it("erasing the patient's evaluation removes the delivered PDFs", async () => {
      process.env.PUBLIC_APP_URL = "https://app.example.cl";
      const lead = await patientReadyForCapture();
      const res = await deliver(lead.id, "whatsapp").expect(200);
      const token = (res.body.link as string).split("/").pop()!;
      await request(app).delete(`/api/leads/${lead.id}`).set("Cookie", staff());
      const rows = (await pglite.exec("SELECT count(*)::int AS n FROM clinical_result_deliveries;")) as Array<{ rows: Array<{ n: number }> }>;
      expect(rows[0].rows[0].n).toBe(0);
      await request(app).get(`/api/results/${token}`).expect(404);
    });
  });
  describe("Cuenta del paciente (correo y clave)", () => {
    const sent: Array<{ to: string[]; subject: string; text: string }> = [];
    const mailOn = () => {
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.MAIL_FROM = "Clínica <resultados@example.cl>";
      process.env.PUBLIC_APP_URL = "https://app.example.cl";
      sent.length = 0;
      vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
        sent.push(JSON.parse(String(init.body)));
        return new Response("{}", { status: 200 });
      }));
    };
    const tokenFromMail = (index = sent.length - 1) => /token=([0-9a-f]{64})/.exec(sent[index].text)![1];
    const accountCount = async () => ((await pglite.exec("SELECT count(*)::int AS n FROM patient_accounts;")) as Array<{ rows: Array<{ n: number }> }>)[0].rows[0].n;
    const login = (email: string, password: string) => request(app).post("/api/portal/login").send({ email, password });
    const cookieOf = (res: request.Response) => String(res.headers["set-cookie"]).split(";")[0];

    beforeEach(() => resetThrottleForTests());
    afterEach(() => {
      vi.unstubAllGlobals();
      delete process.env.RESEND_API_KEY;
      delete process.env.MAIL_FROM;
      delete process.env.PUBLIC_APP_URL;
    });

    it("registering the data form creates the account and emails the link to choose a password", async () => {
      mailOn();
      const lead = await createPatient();
      await vi.waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0].to).toEqual(["prueba@example.com"]);
      expect(sent[0].text).toContain("https://app.example.cl/paciente/clave?token=");
      expect(await accountCount()).toBe(1);
      const row = (await pglite.exec(`SELECT patient_account_id FROM leads WHERE id = '${lead.id}';`)) as Array<{ rows: Array<{ patient_account_id: string | null }> }>;
      expect(row[0].rows[0].patient_account_id).toBeTruthy();
      // later saves of the same form do not send more mail
      await request(app).put(`/api/patients/${lead.token}`).send({ ...VALID_BODY }).expect(200);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(sent).toHaveLength(1);
      // the patient summary never exposes the account id
      const summary = await request(app).get(`/api/patients/${lead.token}`).expect(200);
      expect(JSON.stringify(summary.body)).not.toContain("patientAccountId");
    });

    it("the evaluation goes on when the mail service is not configured", async () => {
      const lead = await createPatient();
      await vi.waitFor(async () => expect(await accountCount()).toBe(1));
      expect(lead.token).toBeTruthy();
    });

    it("the link sets the password once, signs the patient in, and expires", async () => {
      mailOn();
      await createPatient();
      await vi.waitFor(() => expect(sent).toHaveLength(1));
      const token = tokenFromMail();
      await request(app).post("/api/portal/setup").send({ token, password: "corta" }).expect(400);
      await request(app).post("/api/portal/setup").send({ token: "a".repeat(64), password: "clave-segura-1" }).expect(400);
      const ok = await request(app).post("/api/portal/setup").send({ token, password: "clave-segura-1" }).expect(200);
      expect(String(ok.headers["set-cookie"])).toContain("clinivista_patient=");
      await request(app).get("/api/portal/me").set("Cookie", cookieOf(ok)).expect(200);
      await request(app).post("/api/portal/setup").send({ token, password: "otra-clave-9" }).expect(400);
      await login("prueba@example.com", "clave-segura-1").expect(200);

      mailOn();
      await request(app).post("/api/portal/forgot").send({ email: "prueba@example.com" }).expect(200);
      await vi.waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0].subject).toMatch(/Recupera/);
      await pglite.exec("UPDATE patient_accounts SET token_expires_at = now() - interval '1 minute';");
      await request(app).post("/api/portal/setup").send({ token: tokenFromMail(), password: "clave-nueva-22" }).expect(400);
    });

    it("mails and the WhatsApp message follow the patient's language; an invalid language falls back to Spanish", async () => {
      mailOn();
      const created = await request(app).post("/api/patients").send({ ...VALID_BODY, language: "fr" }).expect(201);
      expect(created.body.lead.language).toBe("fr");
      await vi.waitFor(() => expect(sent).toHaveLength(1));
      expect(sent[0].subject).toMatch(/^Créez votre mot de passe - /);
      const bad = await request(app).put(`/api/patients/${created.body.lead.token}`).send({ ...VALID_BODY, language: "xx" }).expect(200);
      expect(bad.body.lead.language).toBe("");
      expect(toMailLanguage("xx")).toBe("es");
      expect(toMailLanguage("ar")).toBe("ar");
      await pglite.exec("UPDATE patient_accounts SET password_hash = 'x';");
      await request(app).post("/api/portal/forgot").send({ email: "prueba@example.com", language: "de" }).expect(200);
      await vi.waitFor(() => expect(sent).toHaveLength(2));
      expect(sent[1].subject).toBe("Passwort zurücksetzen - Clinivista");
    });

    it("login: wrong data looks the same whether the account exists or not, and repeated failures are throttled", async () => {
      mailOn();
      await createPatient();
      await vi.waitFor(() => expect(sent).toHaveLength(1));
      await request(app).post("/api/portal/setup").send({ token: tokenFromMail(), password: "clave-segura-1" }).expect(200);
      const wrong = await login("prueba@example.com", "mala-clave-1").expect(401);
      const ghost = await login("nadie@example.com", "mala-clave-1").expect(401);
      expect(wrong.body.error).toBe(ghost.body.error);
      // an account whose password was never set cannot sign in either
      await pglite.exec("UPDATE patient_accounts SET password_hash = NULL;");
      await login("prueba@example.com", "clave-segura-1").expect(401);
      for (let i = 0; i < 6; i += 1) await login("prueba@example.com", "mala").expect(401);
      await login("prueba@example.com", "mala").expect(429);
    });

    it("forgot-password answers the same for unknown emails and sends nothing", async () => {
      mailOn();
      await request(app).post("/api/portal/forgot").send({ email: "nadie@example.com" }).expect(200);
      await request(app).post("/api/portal/forgot").send({}).expect(200);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(sent).toHaveLength(0);
    });

    it("the portal lists only the signed-in patient's delivered results and serves only their PDFs", async () => {
      mailOn();
      const mine = await patientReadyForCapture();
      await vi.waitFor(() => expect(sent).toHaveLength(1));
      await request(app).post("/api/portal/setup").send({ token: tokenFromMail(), password: "clave-segura-1" }).expect(200);
      const other = await patientReadyForCapture("20.347.878-K", "otra@example.com", "+56933333333");
      await vi.waitFor(() => expect(sent).toHaveLength(2));
      await request(app).post("/api/portal/setup").send({ token: tokenFromMail(), password: "clave-segura-2" }).expect(200);

      await request(app).post(`/api/leads/${mine.id}/results/deliver`).set("Cookie", staff()).send({ channel: "whatsapp" }).expect(200);
      await request(app).post(`/api/leads/${other.id}/results/deliver`).set("Cookie", staff()).send({ channel: "whatsapp" }).expect(200);

      const session = cookieOf(await login("prueba@example.com", "clave-segura-1").expect(200));
      const me = await request(app).get("/api/portal/me").set("Cookie", session).expect(200);
      expect(me.body.email).toBe("prueba@example.com");
      expect(me.body.cases).toHaveLength(1);
      expect(me.body.cases[0]).toMatchObject({ leadId: mine.id, patientName: "Paciente De Prueba" });
      expect(me.body.cases[0].results).toHaveLength(1);
      expect(JSON.stringify(me.body)).not.toContain("objectPath");
      const pdf = await request(app).get(`/api/portal/results/${me.body.cases[0].results[0].id}`).set("Cookie", session).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      }).expect(200);
      expect(pdf.headers["content-type"]).toContain("application/pdf");
      expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe("%PDF-");

      const theirs = (await pglite.exec(`SELECT id FROM clinical_result_deliveries WHERE lead_id = '${other.id}';`)) as Array<{ rows: Array<{ id: string }> }>;
      await request(app).get(`/api/portal/results/${theirs[0].rows[0].id}`).set("Cookie", session).expect(404);
      await request(app).get("/api/portal/me").expect(401);
      await request(app).get(`/api/portal/results/${me.body.cases[0].results[0].id}`).expect(401);
      await request(app).post("/api/portal/logout").set("Cookie", session).expect(200);
      await request(app).get("/api/portal/me").set("Cookie", session).expect(401);
    });

    describe("Google", () => {
      const idToken = (claims: Record<string, unknown>) =>
        `x.${Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: "client-123", exp: Math.floor(Date.now() / 1000) + 600, email_verified: true, ...claims })).toString("base64url")}.y`;
      const googleOn = (claims: Record<string, unknown> = {}) => {
        process.env.GOOGLE_CLIENT_ID = "client-123";
        process.env.GOOGLE_CLIENT_SECRET = "secret-456";
        process.env.PUBLIC_APP_URL = "https://app.example.cl";
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id_token: idToken({ email: "Paciente.G@gmail.com", name: "Paciente Google", ...claims }) }), { status: 200 })));
      };
      afterEach(() => {
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;
      });
      const start = (next?: string) => request(app).get("/api/portal/google/start").query(next ? { next } : {});
      const stateCookie = (res: request.Response) => String(res.headers["set-cookie"]).split(";")[0];
      const stateOfRedirect = (res: request.Response) => new URL(res.headers.location).searchParams.get("state")!;

      it("reports whether Google is available", async () => {
        expect((await request(app).get("/api/portal/options").expect(200)).body).toEqual({ googleEnabled: false, profile: null });
        const off = await start("/c/demo-clinica").expect(302);
        expect(off.headers.location).toBe("/c/demo-clinica?google=off");
        googleOn();
        expect((await request(app).get("/api/portal/options").expect(200)).body.googleEnabled).toBe(true);
      });

      it("sends the patient to Google and back, creating a verified account and signing in", async () => {
        googleOn();
        const go = await start("/c/demo-clinica").expect(302);
        const target = new URL(go.headers.location);
        expect(target.origin + target.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
        expect(target.searchParams.get("client_id")).toBe("client-123");
        expect(target.searchParams.get("redirect_uri")).toBe("https://app.example.cl/api/portal/google/callback");
        expect(target.searchParams.get("scope")).toBe("openid email profile");
        const back = await request(app).get("/api/portal/google/callback").query({ code: "abc", state: stateOfRedirect(go) }).set("Cookie", stateCookie(go)).expect(302);
        expect(back.headers.location).toBe("/c/demo-clinica?google=ok");
        const session = String(back.headers["set-cookie"]).match(/clinivista_patient=[0-9a-f]+/)![0];
        const options = await request(app).get("/api/portal/options").set("Cookie", session).expect(200);
        expect(options.body.profile).toEqual({ email: "Paciente.G@gmail.com", name: "Paciente Google" });
        await request(app).get("/api/portal/me").set("Cookie", session).expect(200);
        const row = (await pglite.exec("SELECT email_verified, password_hash FROM patient_accounts;")) as Array<{ rows: Array<{ email_verified: boolean; password_hash: string | null }> }>;
        expect(row[0].rows).toEqual([{ email_verified: true, password_hash: null }]);
      });

      it("a patient who registered with Google gets no password email", async () => {
        googleOn();
        const go = await start("/c/demo-clinica").expect(302);
        await request(app).get("/api/portal/google/callback").query({ code: "abc", state: stateOfRedirect(go) }).set("Cookie", stateCookie(go)).expect(302);
        const calls = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
        process.env.RESEND_API_KEY = "re_x";
        process.env.MAIL_FROM = "C <r@example.cl>";
        await createPatient({ email: "paciente.g@gmail.com" });
        await vi.waitFor(async () => expect(await accountCount()).toBe(1));
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
        const link = (await pglite.exec("SELECT count(*)::int AS n FROM leads WHERE patient_account_id IS NOT NULL;")) as Array<{ rows: Array<{ n: number }> }>;
        expect(link[0].rows[0].n).toBe(1);
      });

      it("rejects a wrong state, a missing code, an unverified email or a token meant for another app", async () => {
        googleOn();
        const go = await start().expect(302);
        const good = { code: "abc", state: stateOfRedirect(go) };
        await request(app).get("/api/portal/google/callback").query({ ...good, state: "otro" }).set("Cookie", stateCookie(go)).expect(302).expect("Location", "/paciente?google=error");
        await request(app).get("/api/portal/google/callback").query({ state: good.state }).set("Cookie", stateCookie(go)).expect(302).expect("Location", "/paciente?google=error");
        await request(app).get("/api/portal/google/callback").query(good).expect(302).expect("Location", "/paciente?google=error");
        for (const bad of [{ email_verified: false }, { aud: "otra-app" }, { exp: 1 }, { iss: "https://evil.example" }]) {
          googleOn(bad);
          const res = await request(app).get("/api/portal/google/callback").query(good).set("Cookie", stateCookie(go)).expect(302);
          expect(res.headers.location).toBe("/paciente?google=error");
          expect(String(res.headers["set-cookie"])).not.toContain("clinivista_patient=");
        }
        expect(await accountCount()).toBe(0);
      });

      it("only returns to the clinic page or the portal", async () => {
        googleOn();
        const go = await start("https://evil.example/robo").expect(302);
        const back = await request(app).get("/api/portal/google/callback").query({ code: "abc", state: stateOfRedirect(go) }).set("Cookie", stateCookie(go)).expect(302);
        expect(back.headers.location).toBe("/paciente?google=ok");
      });
    });

    it("changing the email moves the case to the account of the new email", async () => {
      mailOn();
      const lead = await createPatient();
      await vi.waitFor(() => expect(sent).toHaveLength(1));
      await request(app).put(`/api/patients/${lead.token}`).send({ ...VALID_BODY, email: "nuevo@example.com" }).expect(200);
      await vi.waitFor(() => expect(sent).toHaveLength(2));
      expect(sent[1].to).toEqual(["nuevo@example.com"]);
      expect(await accountCount()).toBe(2);
    });
  });
});

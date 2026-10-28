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
import staffPatientsRouter from "./staff-patients";
import diagnosisRouter from "./diagnosis";
import resultsRouter from "./results";
import evolutionRouter from "./evolution";
import portalRouter from "./portal";
import transcriptionRouter from "./transcription";
import captureSessionsRouter from "./capture-sessions";
import measurementsRouter from "./measurements";
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
app.use("/api", staffPatientsRouter);
app.use("/api", diagnosisRouter);
app.use("/api", resultsRouter);
app.use("/api", evolutionRouter);
app.use("/api", portalRouter);
app.use("/api", transcriptionRouter);
app.use("/api", captureSessionsRouter);
app.use("/api", measurementsRouter);

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
    CREATE UNIQUE INDEX IF NOT EXISTS leads_center_document_unique
      ON leads (center_id, document_normalized)
      WHERE document_normalized IS NOT NULL AND document_normalized <> '';
     CREATE TABLE IF NOT EXISTS clinical_centers (
       id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
       active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar', plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'unlimited', 'titanium')),
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
     CREATE TABLE IF NOT EXISTS clinical_photo_transcriptions (
       photo_id text PRIMARY KEY, text text NOT NULL DEFAULT '', tier text NOT NULL DEFAULT 'basic', model text NOT NULL DEFAULT '',
       transcribed_by_user_id text, transcribed_by_name text, transcribed_at timestamptz NOT NULL DEFAULT now(),
       edited_by_name text, edited_at timestamptz
     );
     CREATE TABLE IF NOT EXISTS capture_sessions (
       token_hash text PRIMARY KEY, lead_id text NOT NULL, center_id text NOT NULL, phase_id text NOT NULL,
       created_by_user_id text NOT NULL, expires_at timestamptz NOT NULL, closed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinic_transcription_settings (
       center_id text PRIMARY KEY, monthly_quota integer NOT NULL DEFAULT 100, advanced_enabled boolean NOT NULL DEFAULT false,
       updated_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinic_transcription_usage (
       id text PRIMARY KEY, center_id text NOT NULL, photo_id text NOT NULL, tier text NOT NULL, model text NOT NULL,
       units integer NOT NULL DEFAULT 1, input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0,
       created_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinical_photo_annotations (
       id text PRIMARY KEY, photo_id text NOT NULL UNIQUE, object_path text NOT NULL, mime_type text NOT NULL,
       strokes jsonb NOT NULL DEFAULT '[]', updated_by_user_id text, updated_at timestamptz NOT NULL DEFAULT now()
     );
    CREATE TABLE IF NOT EXISTS users (
       id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL,
       password_hash text NOT NULL, name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', role text NOT NULL,
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
    DELETE FROM clinical_photo_transcriptions;
    DELETE FROM capture_sessions;
    DELETE FROM clinic_transcription_settings;
    DELETE FROM clinic_transcription_usage;
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

describe("Dermatología (tercera especialidad)", () => {
  const answers = { reason: "mole", area: "  Espalda alta  ", duration: "m1to6", changes: "colorShape", sun: "high", skinType: "light", hacker: "x", history: "" };
  const register = (body: Record<string, unknown> = {}) =>
    request(app).post("/api/clinics/derma-a/patients").send({ ...VALID_BODY, ...body });

  beforeEach(async () => {
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug, specialty) VALUES ('derma-a', 'Clínica Derma', 'derma-a', 'dermatologia') ON CONFLICT DO NOTHING;`);
  });

  it("reconoce la especialidad y guarda solo sus respuestas, limpias", async () => {
    expect((await request(app).get("/api/clinics/derma-a").expect(200)).body.specialty).toBe("dermatologia");
    const created = await register({ clinicalData: answers }).expect(201);
    expect(created.body.lead.clinicalData).toEqual({ reason: "mole", area: "Espalda alta", duration: "m1to6", changes: "colorShape", sun: "high", skinType: "light" });
    const cleaned = await request(app).put(`/api/patients/${created.body.lead.token}`).send({ ...VALID_BODY, clinicalData: { reason: "magia", sun: "low" } }).expect(200);
    expect(cleaned.body.lead.clinicalData).toEqual({ sun: "low" });
  });

  it("parte con fotos de lesión (la dermatoscopía es opcional) y las etapas de dermatología", async () => {
    const lead = (await register({ clinicalData: answers }).expect(201)).body.lead;
    const protocol = await request(app).get(`/api/patients/${lead.token}/protocol`).expect(200);
    expect(protocol.body.views).toEqual([
      { key: "dermOverview", label: "Vista panorámica", required: true, measure: false, video: false },
      { key: "dermClose", label: "Primer plano con referencia", required: true, measure: false, video: false },
      { key: "dermDermoscopy", label: "Dermatoscopía", required: false, measure: false, video: false },
    ]);
    const phases = (await pglite.exec(`SELECT name FROM clinical_protocol_phases WHERE protocol_id LIKE 'derma-a%' ORDER BY position;`)) as Array<{ rows: Array<{ name: string }> }>;
    expect(phases[0].rows.map((r) => r.name)).toEqual(["Pre-evaluación", "Diagnóstico", "Tratamiento", "Control 1", "Control 2"]);
  });

  it("completar el tratamiento marca al paciente como «operado» (se muestra «Tratado»)", async () => {
    const { deriveStatus } = await import("../lib/lead-status-rules");
    const phases = (done: number) => ["preevaluacion", "diagnostico", "tratamiento", "control-1", "control-2"].map((key, index) => ({
      key, kind: (key === "diagnostico" ? "diagnosis" : "capture") as "capture" | "diagnosis", complete: index < done,
    }));
    expect(deriveStatus("contactar", "", phases(2))).toBe("contactar");
    expect(deriveStatus("contactar", "", phases(3))).toBe("operado");
    expect(deriveStatus("operado", "", phases(5))).toBe("completado");
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
  const listPhases = async (leadId: string, cookie = staff()) =>
    (await request(app).get(`/api/leads/${leadId}/phases`).set("Cookie", cookie).expect(200)).body.phases as Array<PhaseRow & { attentionRequired: boolean; attention: { date: string; agendaId: string } | null }>;
  /** Registra la fecha de atención de las fases abiertas que la piden (sin ella no se cierra el diagnóstico ni se suben fotos). */
  const attendOpenPhases = async (leadId: string, cookie = staff()) => {
    for (const phase of await listPhases(leadId, cookie)) {
      if (phase.attentionRequired && phase.enabled && !phase.attention) {
        await request(app).put(`/api/leads/${leadId}/phases/${phase.id}/attention`).set("Cookie", cookie).send({ date: "2026-01-15", agendaId: "A-1" }).expect(200);
      }
    }
  };
  const phases = async (leadId: string, cookie = staff()) => {
    await attendOpenPhases(leadId, cookie);
    return (await listPhases(leadId, cookie)) as PhaseRow[];
  };
  const capture = (leadId: string, viewId: string, cookie = staff()) =>
    request(app).post(`/api/leads/${leadId}/views/${viewId}/photo`).set("Cookie", cookie).set("Content-Type", "image/jpeg").send(JPEG);
  const closeDiagnosis = async (leadId: string) => {
    await attendOpenPhases(leadId);
    await request(app).put(`/api/leads/${leadId}/diagnosis`).set("Cookie", staff()).send({ responseText: "Candidato a injerto." }).expect(200);
    await request(app).post(`/api/leads/${leadId}/diagnosis/close`).set("Cookie", staff()).send({}).expect(200);
  };
  /** A patient whose diagnosis is closed, so the clinic's own phases are open. */
  async function patientReadyForCapture(documentId?: string, email?: string, phone?: string) {
    const lead = await patientWithPreEvaluation(true, documentId ? { documentId, email, phone } : {});
    await closeDiagnosis(lead.id);
    return lead;
  }

  const statusOf = async (leadId: string) =>
    (await request(app).get(`/api/leads/${leadId}`).set("Cookie", staff()).expect(200)).body.status as string;
  const completePhase = async (leadId: string, index: number) => {
    for (const view of (await phases(leadId))[index].views) await capture(leadId, view.id).expect(201);
  };

  describe("medir la lesión con una moneda de referencia", () => {
    const REF = [{ x: 100, y: 100 }, { x: 360, y: 100 }]; // 260 px = una moneda de $500 (26 mm) → 10 px por mm
    const body = (over: Record<string, unknown> = {}) => ({
      referenceId: "clp-500", referencePoints: REF, lesionPoints: [{ x: 100, y: 300 }, { x: 220, y: 300 }], imageWidth: 1000, imageHeight: 800, ...over,
    });
    async function frontalPhotoId(token: string) {
      const list = await request(app).get(`/api/patients/${token}/photos`).expect(200);
      return (list.body.photos ?? list.body).find((photo: { key: string }) => photo.key === "frontal").id as string;
    }
    const markMeasure = (key = "frontal") =>
      pglite.exec(`UPDATE clinical_protocol_views SET requirements = requirements || '{"measure": true}'::jsonb WHERE key = '${key}'`);

    it("el paciente mide su foto: el servidor calcula la medida y la muestra en su lista", async () => {
      const lead = await patientWithPreEvaluation();
      await markMeasure();
      const photoId = await frontalPhotoId(lead.token);
      const saved = await request(app).put(`/api/patients/${lead.token}/photos/${photoId}/measurement`).send(body()).expect(200);
      expect(saved.body.measurement).toMatchObject({ referenceId: "clp-500", referenceMm: 26, lengthMm: 12, by: "patient" });
      expect(saved.body.measurement.uncertaintyPct).toBeGreaterThanOrEqual(5);
      expect((await request(app).get(`/api/patients/${lead.token}/photos`)).body).toBeDefined();
      const staffView = (await listPhases(lead.id))[0].views.find((view) => view.key === "frontal") as unknown as { measure: boolean; photo: { measurement: { lengthMm: number } } };
      expect(staffView.measure).toBe(true);
      expect(staffView.photo.measurement.lengthMm).toBe(12);
      const protocol = await request(app).get(`/api/patients/${lead.token}/protocol`).expect(200);
      expect(protocol.body.views.find((view: { key: string }) => view.key === "frontal").measure).toBe(true);
      expect(protocol.body.views.find((view: { key: string }) => view.key === "vertex").measure).toBe(false);
      await request(app).delete(`/api/patients/${lead.token}/photos/${photoId}/measurement`).expect(200);
      expect((await listPhases(lead.id))[0].views.find((view) => view.key === "frontal")?.photo).toMatchObject({ measurement: null });
    });

    it("una moneda que se ve ovalada (foto inclinada) amplía el margen de error y queda registrado cómo se ubicó", async () => {
      const lead = await patientWithPreEvaluation();
      await markMeasure();
      const photoId = await frontalPhotoId(lead.token);
      const put = (extra: Record<string, unknown>) => request(app).put(`/api/patients/${lead.token}/photos/${photoId}/measurement`).send(body(extra)).expect(200);
      const flat = await put({ detection: { auto: true, axisRatio: 1 } });
      expect(flat.body.measurement.detection).toEqual({ auto: true, axisRatio: 1 });
      const base = flat.body.measurement.uncertaintyPct as number;
      const tilted = await put({ detection: { auto: true, axisRatio: 0.85 } });
      expect(tilted.body.measurement.uncertaintyPct).toBe(base + 15);
      // Valores absurdos del cliente se acotan y un texto no cuenta como "automática".
      const odd = await put({ detection: { auto: "sí", axisRatio: -3 } });
      expect(odd.body.measurement.detection).toEqual({ auto: false });
      expect(odd.body.measurement.uncertaintyPct).toBe(base);
    });

    it("rechaza lo que no sirve: foto sin la marca, moneda desconocida, puntos fuera de la foto o referencia propia del paciente", async () => {
      const lead = await patientWithPreEvaluation();
      await markMeasure();
      const photoId = await frontalPhotoId(lead.token);
      const put = (payload: unknown, id = photoId) => request(app).put(`/api/patients/${lead.token}/photos/${id}/measurement`).send(payload as object);
      expect((await put(body({ referenceId: "clp-1" }))).status).toBe(400);
      expect((await put(body({ referenceId: "custom", referenceMm: 10 }))).status).toBe(400);
      expect((await put(body({ lesionPoints: [{ x: 5000, y: 0 }, { x: 10, y: 10 }] }))).status).toBe(400);
      expect((await put(body({ referencePoints: [{ x: 10, y: 10 }, { x: 15, y: 10 }] }))).status).toBe(400);
      expect((await put({ referenceId: "clp-500" })).status).toBe(400);
      const other = (await request(app).get(`/api/patients/${lead.token}/photos`).expect(200)).body;
      const vertex = (other.photos ?? other).find((photo: { key: string }) => photo.key === "vertex").id as string;
      expect((await put(body(), vertex)).status).toBe(400); // la vista «vertex» no está marcada para medir
      expect((await request(app).put(`/api/patients/token-que-no-existe-1/photos/${photoId}/measurement`).send(body())).status).toBe(404);
    });

    it("el personal mide o corrige cualquier foto marcada de su clínica, también con una regla propia", async () => {
      const lead = await patientWithPreEvaluation();
      await markMeasure();
      const photoId = await frontalPhotoId(lead.token);
      await request(app).put(`/api/leads/${lead.id}/photos/${photoId}/measurement`).send(body()).expect(401);
      const staffSaved = await request(app).put(`/api/leads/${lead.id}/photos/${photoId}/measurement`).set("Cookie", staff())
        .send(body({ referenceId: "custom", referenceMm: 10, referencePoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }], lesionPoints: [{ x: 0, y: 50 }, { x: 250, y: 50 }] })).expect(200);
      expect(staffSaved.body.measurement).toMatchObject({ by: "staff", referenceMm: 10, lengthMm: 25 });
      expect((await request(app).put(`/api/leads/${lead.id}/photos/${photoId}/measurement`).set("Cookie", staff("otra-clinica")).send(body())).status).toBe(404);
      await request(app).delete(`/api/leads/${lead.id}/photos/${photoId}/measurement`).set("Cookie", staff()).expect(200);
    });
  });

  describe("continuar en el celular", () => {
    const open = async (leadId: string, phaseId: string, cookie = staff()) =>
      request(app).post(`/api/leads/${leadId}/phases/${phaseId}/capture-session`).set("Cookie", cookie);

    it("el celular fotografía una sola fase con el enlace, y la tablet ve las fotos", async () => {
      const lead = await patientReadyForCapture();
      const phase = (await phases(lead.id))[2];
      const created = await (await open(lead.id, phase.id)).body;
      expect(created.path).toBe(`/captura/${created.token}`);

      const info = await request(app).get(`/api/capture/${created.token}`).expect(200);
      expect(info.body.views).toHaveLength(phase.views.length);
      expect(JSON.stringify(info.body)).not.toContain(lead.email ?? "@");
      expect(info.body.views.every((view: { taken: boolean }) => !view.taken)).toBe(true);

      const target = phase.views[0];
      await request(app).post(`/api/capture/${created.token}/views/${target.id}/photo`).set("Content-Type", "image/jpeg").send(JPEG).expect(201);
      const after = (await phases(lead.id))[2];
      expect(after.views.find((view) => view.id === target.id)?.photo).not.toBeNull();
      expect((await request(app).get(`/api/capture/${created.token}`)).body.views.find((view: { id: string }) => view.id === target.id).taken).toBe(true);

      // Not a view of this phase → rejected.
      const other = (await phases(lead.id))[0].views[0];
      await request(app).post(`/api/capture/${created.token}/views/${other.id}/photo`).set("Content-Type", "image/jpeg").send(JPEG).expect(404);

      await request(app).post(`/api/capture/${created.token}/finish`).expect(200);
      await request(app).get(`/api/capture/${created.token}`).expect(410);
      await request(app).post(`/api/capture/${created.token}/views/${target.id}/photo`).set("Content-Type", "image/jpeg").send(JPEG).expect(410);
    });

    it("solo el personal de la clínica abre el enlace, y solo para fases que se pueden fotografiar", async () => {
      const lead = await patientReadyForCapture();
      const list = await phases(lead.id);
      await request(app).post(`/api/leads/${lead.id}/phases/${list[2].id}/capture-session`).expect(401);
      expect((await open(lead.id, list[2].id, staff("otra-clinica"))).status).toBe(404);
      expect((await open(lead.id, "no-existe")).status).toBe(404);
      const diagnosis = list.find((phase) => phase.kind === "diagnosis");
      if (diagnosis) expect((await open(lead.id, diagnosis.id)).status).toBe(400);
      // Una fase todavía bloqueada no se puede abrir en el celular.
      const locked = list.find((phase) => !phase.enabled);
      if (locked) expect((await open(lead.id, locked.id)).status).toBe(409);
    });

    it("un enlace nuevo reemplaza al anterior; uno inventado o vencido no sirve", async () => {
      const lead = await patientReadyForCapture();
      const phase = (await phases(lead.id))[2];
      const first = (await open(lead.id, phase.id)).body;
      const second = (await open(lead.id, phase.id)).body;
      await request(app).get(`/api/capture/${first.token}`).expect(410);
      await request(app).get(`/api/capture/${second.token}`).expect(200);
      await request(app).get(`/api/capture/${"x".repeat(43)}`).expect(410);
      await request(app).get("/api/capture/corto").expect(410);
      await pglite.exec(`UPDATE capture_sessions SET expires_at = now() - interval '1 minute'`);
      await request(app).get(`/api/capture/${second.token}`).expect(410);
    });
  });

  it("los estados cambian solos con cada etapa: incompleto → listo → contactar → agendado → operado → completado", async () => {
    const lead = await patientWithPreEvaluation(false);
    expect(await statusOf(lead.id)).toBe("incompleto");

    for (const key of KEYS.slice(2)) {
      const draft = await request(app).post(`/api/patients/${lead.token}/photos`)
        .set("Content-Type", "image/jpeg").set("x-photo-key", key).set("x-photo-source", "upload").send(JPEG).expect(201);
      await request(app).post(`/api/patients/${lead.token}/photos/${draft.body.id}/confirm`).expect(200);
    }
    await request(app).put(`/api/patients/${lead.token}`).send({ ...VALID_BODY, submit: true }).expect(200);
    expect(await statusOf(lead.id)).toBe("listo");

    await closeDiagnosis(lead.id);
    expect(await statusOf(lead.id)).toBe("contactar");
    // The staff filters and counters follow the new statuses.
    const inFilter = async (status: string) =>
      ((await request(app).get(`/api/leads?status=${status}`).set("Cookie", staff()).expect(200)).body.leads as Array<{ id: string }>).map((l) => l.id);
    expect(await inFilter("contactar")).toEqual([lead.id]);
    expect(await inFilter("listo")).toEqual([]);
    expect((await request(app).get("/api/leads/stats").set("Cookie", staff()).expect(200)).body.counts).toMatchObject({ contactar: 1 });

    // Booking an appointment after the contact makes the patient "agendado".
    await request(app).patch(`/api/leads/${lead.id}`).set("Cookie", staff("default-center", "administrativo"))
      .send({ appointmentAt: "2026-11-02T15:00:00.000Z" }).expect(200);
    expect(await statusOf(lead.id)).toBe("agendado");

    await completePhase(lead.id, 2); // pre-operatorio
    expect(await statusOf(lead.id)).toBe("agendado");
    await completePhase(lead.id, 3); // post-operatorio (fase 4)
    expect(await statusOf(lead.id)).toBe("operado");
    expect(await inFilter("operado")).toEqual([lead.id]);
    expect(await inFilter("agendado")).toEqual([]);
    await completePhase(lead.id, 4);
    expect(await statusOf(lead.id)).toBe("operado");
    await completePhase(lead.id, 5);
    expect(await statusOf(lead.id)).toBe("completado");
  });

  it("contactado si el administrativo contactó y no se agendó; reabrir el diagnóstico no pierde el contacto", async () => {
    const lead = await patientReadyForCapture();
    expect(await statusOf(lead.id)).toBe("contactar");
    await request(app).patch(`/api/leads/${lead.id}`).set("Cookie", staff("default-center", "administrativo")).send({ status: "contactado" }).expect(200);
    expect(await statusOf(lead.id)).toBe("contactado");
    await request(app).post(`/api/leads/${lead.id}/diagnosis/reopen`).set("Cookie", staff()).expect(200);
    expect(await statusOf(lead.id)).toBe("contactado");
  });

  it("el resumen de /leads trae la miniatura (coverPhotoId) solo a la clínica del paciente", async () => {
    const withPhotos = await patientWithPreEvaluation(false);
    const withoutPhotos = await createPatient({ documentId: "11.111.111-1", phone: "+56933333333", email: "otro@example.com" });
    const own = (await request(app).get("/api/leads").set("Cookie", staff()).expect(200)).body.leads as Array<{ id: string; coverPhotoId: string | null }>;
    const confirmed = (await request(app).get(`/api/leads/${withPhotos.id}`).set("Cookie", staff()).expect(200)).body.photos as Array<{ id: string; key: string; status: string }>;
    const frontal = confirmed.find((photo) => photo.key === "frontal")!;
    expect(frontal.status).toBe("confirmed");
    expect(own.find((lead) => lead.id === withPhotos.id)?.coverPhotoId).toBe(frontal.id); // la primera confirmada
    expect(own.find((lead) => lead.id === withoutPhotos.id)?.coverPhotoId).toBeNull();
    // Se sirve con el endpoint existente, sin caché compartida.
    const image = await request(app).get(`/api/leads/${withPhotos.id}/photos/${frontal.id}`).set("Cookie", staff()).expect(200);
    expect(image.headers["cache-control"]).toBe("private, no-store");

    // Otra clínica no ve al paciente, ni su miniatura, ni puede pedir la foto.
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug, active) VALUES ('clinic-b', 'Clínica B', 'clinica-b', true);`);
    const other = await request(app).get("/api/leads").set("Cookie", staff("clinic-b")).expect(200);
    expect(other.body.leads).toEqual([]);
    expect(JSON.stringify(other.body)).not.toContain(frontal.id);
    await request(app).get(`/api/leads/${withPhotos.id}/photos/${frontal.id}`).set("Cookie", staff("clinic-b")).expect(404);
    // Sin sesión de personal, nada.
    await request(app).get("/api/leads").expect(401);
  });

  describe("video por vista (plan Titanium)", () => {
    // Contenedores mínimos con la cabecera real de cada formato (no son videos reproducibles, pero sí detectables).
    const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom", "latin1"), Buffer.alloc(4000, 7)]);
    const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]), Buffer.from("\x01B\x82\x84webm", "latin1"), Buffer.alloc(2000, 3)]);
    const setPlan = (plan: string, centerId = DEFAULT_CENTER_ID) =>
      pglite.exec(`INSERT INTO clinical_centers (id, name, slug, plan) VALUES ('${centerId}', 'Clínica ${centerId}', '${centerId}', '${plan}')
        ON CONFLICT (id) DO UPDATE SET plan = EXCLUDED.plan;`);
    const markVideo = (viewId: string) => pglite.exec(`UPDATE clinical_protocol_views SET requirements = requirements || '{"video": true}'::jsonb WHERE id = '${viewId}';`);
    const videoRows = async () => ((await pglite.exec(`SELECT id, original_object_path, original_mime_type, status FROM clinical_photos WHERE original_mime_type LIKE 'video/%' ORDER BY created_at;`)) as Array<{ rows: Array<{ id: string; original_object_path: string; original_mime_type: string; status: string }> }>)[0].rows;
    const staffVideo = (leadId: string, viewId: string, body: Buffer, type = "video/mp4", cookie = staff()) =>
      request(app).post(`/api/leads/${leadId}/views/${viewId}/video`).set("Cookie", cookie).set("Content-Type", type).set("x-video-duration-ms", "12000").send(body);
    /** Paciente listo para que el personal registre la fase 3, con su primera vista marcada como video. */
    async function staffVideoView() {
      const lead = await patientReadyForCapture();
      const view = (await phases(lead.id))[2].views[0];
      await markVideo(view.id);
      return { lead, viewId: view.id };
    }

    it("sin el plan Titanium no se acepta el video (403) y no se guarda nada", async () => {
      const { lead, viewId } = await staffVideoView();
      const res = await staffVideo(lead.id, viewId, MP4).expect(403);
      expect(res.body.error).toMatch(/Titanium/);
      expect(await videoRows()).toEqual([]);
    });

    it("con Titanium se graba, cuenta como capturada y se reproduce por tramos (Range) con cabeceras privadas", async () => {
      await setPlan("titanium");
      const { lead, viewId } = await staffVideoView();
      const saved = (await staffVideo(lead.id, viewId, MP4).expect(201)).body;
      expect(saved).toMatchObject({ mimeType: "video/mp4", sizeBytes: MP4.length, durationMs: 12000, width: null, height: null, status: "confirmed" });
      expect(saved.sha256).toBe(createHash("sha256").update(MP4).digest("hex"));
      const view = (await phases(lead.id))[2].views[0];
      expect(view.video).toBe(true);
      expect(view.photo?.id).toBe(saved.id);

      const part = await request(app).get(`/api/leads/${lead.id}/videos/${saved.id}`).set("Cookie", staff()).set("Range", "bytes=0-99")
        .buffer(true).parse((res, done) => { const chunks: Buffer[] = []; res.on("data", (c: Buffer) => chunks.push(c)); res.on("end", () => done(null, Buffer.concat(chunks))); });
      expect(part.status).toBe(206);
      expect(part.headers["content-range"]).toBe(`bytes 0-99/${MP4.length}`);
      expect(part.headers["accept-ranges"]).toBe("bytes");
      expect(part.headers["content-type"]).toBe("video/mp4");
      expect(part.headers["cache-control"]).toBe("private, no-store");
      expect(part.headers["x-content-type-options"]).toBe("nosniff");
      expect(Buffer.compare(part.body as Buffer, MP4.subarray(0, 100))).toBe(0);

      const tail = await request(app).get(`/api/leads/${lead.id}/videos/${saved.id}`).set("Cookie", staff()).set("Range", "bytes=-10");
      expect(tail.status).toBe(206);
      expect(tail.headers["content-range"]).toBe(`bytes ${MP4.length - 10}-${MP4.length - 1}/${MP4.length}`);
      const whole = await request(app).get(`/api/leads/${lead.id}/videos/${saved.id}`).set("Cookie", staff());
      expect(whole.status).toBe(200);
      expect(Number(whole.headers["content-length"])).toBe(MP4.length);
      const outside = await request(app).get(`/api/leads/${lead.id}/videos/${saved.id}`).set("Cookie", staff()).set("Range", `bytes=${MP4.length + 5}-`);
      expect(outside.status).toBe(416);
      expect(outside.headers["content-range"]).toBe(`bytes */${MP4.length}`);
      // El camino de las fotos nunca sirve un video.
      await request(app).get(`/api/leads/${lead.id}/photos/${saved.id}`).set("Cookie", staff()).expect(404);
    });

    it("rechaza el tipo inválido (por cabecera real, no por Content-Type), el tope de 25 MB y fotos en vistas de video", async () => {
      await setPlan("titanium");
      const { lead, viewId } = await staffVideoView();
      await staffVideo(lead.id, viewId, JPEG, "video/mp4").expect(400); // dice mp4, pero es un JPEG
      await staffVideo(lead.id, viewId, WEBM, "video/mp4").expect(400); // dice mp4, pero es WebM
      await staffVideo(lead.id, viewId, MP4, "video/avi").expect(400);
      await staffVideo(lead.id, viewId, WEBM, "video/webm").expect(201);
      const big = await staffVideo(lead.id, viewId, Buffer.concat([MP4, Buffer.alloc(25 * 1024 * 1024)])).expect(413);
      expect(big.body.error).toMatch(/25 MB/);
      await staffVideo(lead.id, viewId, MP4).set("x-video-duration-ms", "60000").expect(400); // más de 20 s
      // Una vista de video no recibe fotos, y una vista de foto no recibe videos.
      await capture(lead.id, viewId).expect(400);
      const photoView = (await phases(lead.id))[2].views[1];
      await staffVideo(lead.id, photoView.id, MP4).expect(400);
      expect((await videoRows()).map((row) => row.original_mime_type)).toEqual(["video/webm"]);
    });

    it("otra clínica no ve ni sube videos de este paciente", async () => {
      await setPlan("titanium");
      await setPlan("titanium", "clinic-b");
      const { lead, viewId } = await staffVideoView();
      const saved = (await staffVideo(lead.id, viewId, MP4).expect(201)).body;
      await request(app).get(`/api/leads/${lead.id}/videos/${saved.id}`).set("Cookie", staff("clinic-b")).expect(404);
      await staffVideo(lead.id, viewId, MP4, "video/mp4", staff("clinic-b")).expect(404);
      await request(app).get(`/api/leads/${lead.id}/videos/${saved.id}`).expect(401);
    });

    it("el paciente graba el video de su pre-evaluación (borrador → confirmado) y solo ve los suyos", async () => {
      await setPlan("titanium");
      const lead = await createPatient();
      const list = await listPhases(lead.id);
      const donor = list[0].views.find((view) => view.key === "donor")!;
      await markVideo(donor.id);
      for (const key of KEYS.filter((key) => key !== "donor")) {
        const draft = await request(app).post(`/api/patients/${lead.token}/photos`)
          .set("Content-Type", "image/jpeg").set("x-photo-key", key).set("x-photo-source", "upload").send(JPEG).expect(201);
        await request(app).post(`/api/patients/${lead.token}/photos/${draft.body.id}/confirm`).expect(200);
      }
      // Una foto no entra en la vista de video.
      await request(app).post(`/api/patients/${lead.token}/photos`).set("Content-Type", "image/jpeg").set("x-photo-key", "donor").set("x-photo-source", "upload").send(JPEG).expect(400);
      const draft = await request(app).post(`/api/patients/${lead.token}/videos`).set("Content-Type", "video/mp4").set("x-photo-key", "donor").set("x-video-duration-ms", "9000").send(MP4).expect(201);
      expect(draft.body.status).toBe("draft");
      await request(app).post(`/api/patients/${lead.token}/photos/${draft.body.id}/confirm`).expect(200);
      expect((await listPhases(lead.id))[0].complete).toBe(true); // el video cuenta como capturado

      const own = await request(app).get(`/api/patients/${lead.token}/videos/${draft.body.id}`).set("Range", "bytes=0-9");
      expect(own.status).toBe(206);
      const other = await createPatient({ documentId: "11.111.111-1", phone: "+56933333333", email: "otro@example.com" });
      await request(app).get(`/api/patients/${other.token}/videos/${draft.body.id}`).expect(404);
      // El camino de las fotos del paciente tampoco sirve el video.
      await request(app).get(`/api/patients/${lead.token}/photos/${draft.body.id}/original`).expect(404);
      // Los videos no se anotan ni van al diagnóstico.
      const diagnosis = (await request(app).get(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff()).expect(200)).body;
      expect(diagnosis.photos.map((photo: { viewKey: string }) => photo.viewKey)).not.toContain("donor");
    });

    it("el PDF de resultados y la evolución no fallan con un video (se omite)", async () => {
      await setPlan("titanium");
      const lead = await createPatient();
      const donor = (await listPhases(lead.id))[0].views.find((view) => view.key === "donor")!;
      await markVideo(donor.id);
      for (const key of KEYS.filter((key) => key !== "donor")) {
        const draft = await request(app).post(`/api/patients/${lead.token}/photos`)
          .set("Content-Type", "image/jpeg").set("x-photo-key", key).set("x-photo-source", "upload").send(JPEG).expect(201);
        await request(app).post(`/api/patients/${lead.token}/photos/${draft.body.id}/confirm`).expect(200);
      }
      const video = await request(app).post(`/api/patients/${lead.token}/videos`).set("Content-Type", "video/mp4").set("x-photo-key", "donor").send(MP4).expect(201);
      await request(app).post(`/api/patients/${lead.token}/photos/${video.body.id}/confirm`).expect(200);
      await closeDiagnosis(lead.id);
      const pdf = await request(app).get(`/api/leads/${lead.id}/results/pdf`).set("Cookie", staff())
        .buffer(true).parse((res, done) => { const chunks: Buffer[] = []; res.on("data", (c: Buffer) => chunks.push(c)); res.on("end", () => done(null, Buffer.concat(chunks))); });
      expect(pdf.status).toBe(200);
      expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");
      const evolution = (await request(app).get(`/api/leads/${lead.id}/evolution`).set("Cookie", staff()).expect(200)).body;
      expect(JSON.stringify(evolution)).not.toContain(video.body.id);
    });

    it("si la clínica baja de plan, los videos se conservan y se siguen viendo; solo se bloquea subir nuevos", async () => {
      await setPlan("titanium");
      const { lead, viewId } = await staffVideoView();
      const saved = (await staffVideo(lead.id, viewId, MP4).expect(201)).body;
      await setPlan("basic");
      expect((await phases(lead.id))[2].views[0].photo?.id).toBe(saved.id);
      await request(app).get(`/api/leads/${lead.id}/videos/${saved.id}`).set("Cookie", staff()).set("Range", "bytes=0-9").expect(206);
      await staffVideo(lead.id, viewId, MP4).expect(403);
      expect((await videoRows()).map((row) => row.status)).toEqual(["confirmed"]);
    });

    it("«Continuar en el celular» graba video en la vista de su fase (y respeta el plan)", async () => {
      const { lead, viewId } = await staffVideoView();
      const phaseId = (await phases(lead.id))[2].id;
      const { token } = (await request(app).post(`/api/leads/${lead.id}/phases/${phaseId}/capture-session`).set("Cookie", staff()).expect(201)).body;
      const info = (await request(app).get(`/api/capture/${token}`).expect(200)).body;
      expect(info.views.find((view: { id: string }) => view.id === viewId).video).toBe(true);
      const post = () => request(app).post(`/api/capture/${token}/views/${viewId}/video`).set("Content-Type", "video/mp4").send(MP4);
      await post().expect(403);
      await setPlan("titanium");
      await post().expect(201);
      expect((await request(app).get(`/api/capture/${token}`).expect(200)).body.views.find((view: { id: string }) => view.id === viewId).taken).toBe(true);
    });

    it("al borrar el paciente se eliminan también los objetos de video del almacenamiento", async () => {
      await setPlan("titanium");
      const { lead, viewId } = await staffVideoView();
      await staffVideo(lead.id, viewId, MP4).expect(201);
      const [row] = await videoRows();
      const { privatePhotoStorage } = await import("../lib/clinical-photo-storage");
      expect((await privatePhotoStorage.read(row.original_object_path)).bytes.length).toBe(MP4.length);
      await request(app).delete(`/api/leads/${lead.id}`).set("Cookie", staff()).expect(200);
      await expect(privatePhotoStorage.read(row.original_object_path)).rejects.toThrow();
      expect(await videoRows()).toEqual([]);
    });
  });

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
      await attendOpenPhases(lead.id);
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
  describe("Evolución: comparar la misma zona entre fases", () => {
    const evolution = (leadId: string, cookie = staff()) => request(app).get(`/api/leads/${leadId}/evolution`).set("Cookie", cookie);
    const send = (leadId: string, body: object, cookie = staff()) =>
      request(app).post(`/api/leads/${leadId}/evolution/send`).set("Cookie", cookie).send(body);
    const mailOnWithCapture = () => {
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.MAIL_FROM = "Clínica <resultados@example.cl>";
      const calls: Array<Record<string, unknown>> = [];
      vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
        calls.push(JSON.parse(String(init.body)));
        return new Response(JSON.stringify({ id: "1" }), { status: 200 });
      }));
      return calls;
    };
    /** Pre-evaluación + diagnóstico con un dibujo en la foto frontal + pre-operatorio completo. */
    async function patientWithThreePhases() {
      const lead = await patientWithPreEvaluation();
      const [first] = (await request(app).get(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff()).expect(200)).body.photos as Array<{ photoId: string; viewKey: string }>;
      await request(app).put(`/api/leads/${lead.id}/photos/${first.photoId}/annotation`).set("Cookie", staff())
        .send({ image: `data:image/jpeg;base64,${JPEG.toString("base64")}`, strokes: [{ type: "pen", color: "#ff0000", width: 0.004, points: [[0.1, 0.1], [0.2, 0.25]] }] }).expect(200);
      await closeDiagnosis(lead.id);
      await completePhase(lead.id, 2);
      return { lead, annotatedView: first.viewKey };
    }

    it("con solo la pre-evaluación hay una foto por zona y todavía no hay nada que comparar", async () => {
      const lead = await patientWithPreEvaluation();
      const res = await evolution(lead.id).expect(200);
      expect(res.body.zones).toHaveLength(5);
      for (const zone of res.body.zones) expect(zone.cells).toHaveLength(1);
      expect(res.body.phases.map((p: { key: string }) => p.key)).toEqual(["preevaluacion"]);
      expect(res.body.patientEmail).toBe("prueba@example.com");
      const pdf = await request(app).get(`/api/leads/${lead.id}/evolution/pdf`).set("Cookie", staff());
      expect(pdf.status).toBe(409);
      expect(pdf.body.error).toMatch(/dos fases/);
    });

    it("junta la misma zona de cada fase; el diagnóstico aporta la foto con el dibujo del médico", async () => {
      const { lead, annotatedView } = await patientWithThreePhases();
      const res = await evolution(lead.id).expect(200);
      const zone = res.body.zones.find((z: { key: string }) => z.key === annotatedView);
      expect(zone.cells.map((c: { phaseKey: string }) => c.phaseKey)).toEqual(["preevaluacion", "diagnostico", "preoperatorio"]);
      expect(zone.cells.map((c: { edited: boolean }) => c.edited)).toEqual([false, true, false]);
      // las zonas sin dibujo no tienen columna de diagnóstico
      const other = res.body.zones.find((z: { key: string }) => z.key !== annotatedView);
      expect(other.cells.map((c: { phaseKey: string }) => c.phaseKey)).toEqual(["preevaluacion", "preoperatorio"]);
      expect(res.body.phases.map((p: { key: string }) => p.key)).toEqual(["preevaluacion", "diagnostico", "preoperatorio"]);
      // cada celda se puede ver con las rutas de fotos ya existentes
      for (const cell of zone.cells) {
        const url = cell.edited ? `/api/leads/${lead.id}/photos/${cell.photoId}/annotation` : `/api/leads/${lead.id}/photos/${cell.photoId}`;
        await request(app).get(url).set("Cookie", staff()).expect(200);
      }
    });

    it("exporta el PDF (todas las zonas o solo las pedidas) y el personal de otra clínica no lo ve", async () => {
      const { lead, annotatedView } = await patientWithThreePhases();
      const all = await request(app).get(`/api/leads/${lead.id}/evolution/pdf`).set("Cookie", staff()).buffer(true).parse((res, cb) => {
        const chunks: Buffer[] = []; res.on("data", (c: Buffer) => chunks.push(c)); res.on("end", () => cb(null, Buffer.concat(chunks)));
      }).expect(200);
      expect(all.headers["content-type"]).toContain("application/pdf");
      expect(all.headers["cache-control"]).toContain("no-store");
      expect((all.body as Buffer).subarray(0, 5).toString()).toBe("%PDF-");
      await request(app).get(`/api/leads/${lead.id}/evolution/pdf?zones=${annotatedView}`).set("Cookie", staff()).expect(200);
      await request(app).get(`/api/leads/${lead.id}/evolution/pdf?zones=no-existe`).set("Cookie", staff()).expect(409);
      await request(app).get(`/api/leads/${lead.id}/evolution/pdf`).expect(401);
      await request(app).get(`/api/leads/${lead.id}/evolution/pdf`).set("Cookie", staff("otra-clinica")).expect(404);
      await evolution(lead.id, staff("otra-clinica")).expect(404);
    });

    it("correo: al paciente por defecto, a otra dirección si se indica, con el PDF adjunto", async () => {
      const { lead } = await patientWithThreePhases();
      delete process.env.RESEND_API_KEY;
      const missing = await send(lead.id, {});
      expect(missing.status).toBe(503);
      expect(missing.body.error).toMatch(/no está configurado/);

      const calls = mailOnWithCapture();
      const toPatient = await send(lead.id, {}).expect(200);
      expect(toPatient.body).toEqual({ status: "sent", recipient: "prueba@example.com" });
      expect(calls[0].to).toEqual(["prueba@example.com"]);
      const attachment = (calls[0].attachments as Array<{ filename: string; content: string; content_type: string }>)[0];
      expect(attachment).toMatchObject({ filename: "evolucion.pdf", content_type: "application/pdf" });
      expect(Buffer.from(attachment.content, "base64").subarray(0, 5).toString()).toBe("%PDF-");
      expect(String(calls[0].text)).toContain("Paciente De Prueba");

      await send(lead.id, { email: "administracion@clinica.cl" }).expect(200);
      expect(calls[1].to).toEqual(["administracion@clinica.cl"]);
      expect(String(calls[1].text).startsWith("Hola")).toBe(false);

      // el personal administrativo también puede enviarlo
      await send(lead.id, {}, staff(DEFAULT_CENTER_ID, "administrativo")).expect(200);
      expect(calls).toHaveLength(3);
    });

    it("el correo sale en el idioma del paciente", async () => {
      const { lead } = await patientWithThreePhases();
      await pglite.exec(`UPDATE leads SET language = 'en' WHERE id = '${lead.id}';`);
      const calls = mailOnWithCapture();
      await send(lead.id, {}).expect(200);
      expect(calls[0].subject).toMatch(/^Your treatment progress/);
    });

    it("rechaza direcciones inválidas, falta de destinatario y nada que comparar", async () => {
      const { lead } = await patientWithThreePhases();
      const calls = mailOnWithCapture();
      expect((await send(lead.id, { email: "no-es-correo" })).status).toBe(400);
      expect((await send(lead.id, { email: "a@b.cl, c@d.cl" })).status).toBe(400);
      await pglite.exec(`UPDATE leads SET email = '' WHERE id = '${lead.id}';`);
      expect((await send(lead.id, {})).status).toBe(422);
      const soloPre = await patientWithPreEvaluation(true, { documentId: "20.347.878-K", phone: "+56933333333", email: "otro@example.com" });
      expect((await send(soloPre.id, {})).status).toBe(409);
      // ningún intento llegó al servicio de correo con un adjunto (el aviso de cuenta del paciente nuevo es otro correo)
      expect(calls.filter((call) => call.attachments)).toHaveLength(0);
    });
  });
  describe("transcripción de documentos", () => {
    const fetchMock = vi.fn();
    afterEach(() => { vi.unstubAllGlobals(); fetchMock.mockReset(); delete process.env.ANTHROPIC_API_KEY; });
    const anthropicCalls = () => fetchMock.mock.calls.filter((call) => String(call[0]).includes("api.anthropic.com"));
    const claudeReplies = (text = "Ficha técnica\nPaciente: Juan [ilegible]") => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      fetchMock.mockImplementation(async (url: string) => String(url).includes("api.anthropic.com")
        ? new Response(JSON.stringify({ content: [{ type: "text", text }], usage: { input_tokens: 1500, output_tokens: 300 } }), { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response("{}", { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
    };
    /** Un paciente con la primera foto de la fase 3 ya tomada y la vista marcada (o no) como documento. */
    async function documentPhoto(isDocument = true) {
      const lead = await patientReadyForCapture();
      const list = await phases(lead.id);
      const photo = (await capture(lead.id, list[2].views[0].id).expect(201)).body as { id: string };
      if (isDocument) await pglite.exec(`UPDATE clinical_protocol_views SET requirements = requirements || '{"document": true}'::jsonb WHERE id = '${list[2].views[0].id}';`);
      return { lead, photo, viewId: list[2].views[0].id };
    }
    const transcribe = (leadId: string, photoId: string, body: Record<string, unknown> = {}, cookie = staff()) =>
      request(app).post(`/api/leads/${leadId}/phase-photos/${photoId}/transcribe`).set("Cookie", cookie).send(body);
    const status = async () => (await request(app).get("/api/clinic/transcription").set("Cookie", staff()).expect(200)).body;

    it("una foto que no es documento no se transcribe", async () => {
      claudeReplies();
      const { lead, photo } = await documentPhoto(false);
      expect((await transcribe(lead.id, photo.id)).status).toBe(409);
      expect(anthropicCalls()).toHaveLength(0);
    });

    it("transcribe con el modelo económico, muestra el texto bajo la foto y descuenta 1 de la cuota", async () => {
      claudeReplies();
      const { lead, photo, viewId } = await documentPhoto();
      const before = await status();
      expect(before).toMatchObject({ available: true, monthlyQuota: 100, used: 0, advancedEnabled: false });
      const res = await transcribe(lead.id, photo.id);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ text: expect.stringContaining("[ilegible]"), tier: "basic" });
      const sent = JSON.parse(anthropicCalls()[0][1].body as string);
      expect(sent.model).toBe("claude-haiku-5-5");
      expect(sent.messages[0].content[0].source.media_type).toBe("image/jpeg");
      const view = (await listPhases(lead.id))[2].views.find((v) => v.id === viewId) as unknown as { document: boolean; transcription: { text: string; tier: string } | null };
      expect(view.document).toBe(true);
      expect(view.transcription).toMatchObject({ tier: "basic" });
      expect(view.transcription?.text).toContain("Ficha técnica");
      expect((await status()).used).toBe(1);
      // El dashboard de la clínica cuenta solo los documentos transcritos con IA.
      expect((await request(app).get("/api/leads/stats").set("Cookie", staff()).expect(200)).body.transcribedDocuments).toBe(1);
    });

    it("no vuelve a cobrar la misma transcripción y el avanzado exige que la clínica lo tenga habilitado", async () => {
      claudeReplies();
      const { lead, photo } = await documentPhoto();
      await transcribe(lead.id, photo.id).expect(200);
      expect((await transcribe(lead.id, photo.id)).status).toBe(409);
      expect((await transcribe(lead.id, photo.id, { advanced: true })).status).toBe(403);
      await pglite.exec(`INSERT INTO clinic_transcription_settings (center_id, monthly_quota, advanced_enabled) VALUES ('${DEFAULT_CENTER_ID}', 10, true);`);
      const advanced = await transcribe(lead.id, photo.id, { advanced: true });
      expect(advanced.status).toBe(200);
      expect(advanced.body.tier).toBe("advanced");
      expect(JSON.parse(anthropicCalls()[1][1].body as string).model).toBe("claude-sonnet-5-5");
      expect((await status()).used).toBe(3);
      expect((await transcribe(lead.id, photo.id, { advanced: true })).status).toBe(409);
    });

    it("al llegar a la cuota mensual responde 429 sin llamar al modelo", async () => {
      claudeReplies();
      const { lead, photo } = await documentPhoto();
      await pglite.exec(`INSERT INTO clinic_transcription_settings (center_id, monthly_quota, advanced_enabled) VALUES ('${DEFAULT_CENTER_ID}', 0, false);`);
      const res = await transcribe(lead.id, photo.id);
      expect(res.status).toBe(429);
      expect(anthropicCalls()).toHaveLength(0);
      expect((await status()).remaining).toBe(0);
    });

    it("sin ANTHROPIC_API_KEY responde 503 y nada se cobra", async () => {
      const { lead, photo } = await documentPhoto();
      expect((await transcribe(lead.id, photo.id)).status).toBe(503);
      expect((await status()).used).toBe(0);
    });

    it("si el servicio falla no se cobra y se puede reintentar", async () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test";
      fetchMock.mockImplementation(async (url: string) => new Response("{}", { status: String(url).includes("api.anthropic.com") ? 500 : 200 }));
      vi.stubGlobal("fetch", fetchMock);
      const { lead, photo } = await documentPhoto();
      expect((await transcribe(lead.id, photo.id)).status).toBe(502);
      expect((await status()).used).toBe(0);
    });

    it("el personal corrige el texto y queda quién lo editó; también se puede escribir sin IA", async () => {
      claudeReplies();
      const { lead, photo, viewId } = await documentPhoto();
      await request(app).put(`/api/leads/${lead.id}/phase-photos/${photo.id}/transcription`).set("Cookie", staff()).send({ text: "Escrita a mano por el equipo" }).expect(200);
      const view = (await listPhases(lead.id))[2].views.find((v) => v.id === viewId) as unknown as { transcription: { tier: string; text: string; editedByName: string | null } };
      expect(view.transcription).toMatchObject({ tier: "manual", text: "Escrita a mano por el equipo" });
      expect(view.transcription.editedByName).toBeTruthy();
      expect((await request(app).get("/api/leads/stats").set("Cookie", staff()).expect(200)).body.transcribedDocuments).toBe(0);
      await request(app).put(`/api/leads/${lead.id}/phase-photos/${photo.id}/transcription`).set("Cookie", staff()).send({ text: 5 }).expect(422);
      expect((await status()).used).toBe(0);
    });

    it("otra clínica no puede transcribir ni editar la foto", async () => {
      claudeReplies();
      const { lead, photo } = await documentPhoto();
      expect((await transcribe(lead.id, photo.id, {}, staff("clinic-b"))).status).toBe(404);
      await request(app).put(`/api/leads/${lead.id}/phase-photos/${photo.id}/transcription`).set("Cookie", staff("clinic-b")).send({ text: "x" }).expect(404);
    });

    it("borrar la foto borra su transcripción", async () => {
      claudeReplies();
      const { lead, photo } = await documentPhoto();
      await transcribe(lead.id, photo.id).expect(200);
      await request(app).delete(`/api/leads/${lead.id}/phase-photos/${photo.id}`).set("Cookie", staff()).expect(204);
      const rows = (await pglite.exec("SELECT count(*)::int AS n FROM clinical_photo_transcriptions;")) as Array<{ rows: Array<{ n: number }> }>;
      expect(rows[0].rows[0].n).toBe(0);
    });
  });

});

describe("Personal: agregar paciente, omitir etapa y alta médica", () => {
  const JPEG = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==",
    "base64",
  );
  const staff = (role: "medico" | "administrativo" = "administrativo", centerId = DEFAULT_CENTER_ID) =>
    `clinivista_session=${createSession({ userId: "staff-1", centerId, role })}`;
  const NEW_PATIENT = { name: "Paciente Del Personal", phone: "+56922222222", documentId: "12.345.678-5", email: "personal@example.com", consentConfirmed: true };
  type PhaseRow = {
    id: string; name: string; kind: string; enabled: boolean; complete: boolean; skipped: boolean;
    staffCanCapture: boolean; skip: { reason: string; byName: string } | null;
    views: Array<{ id: string; required: boolean; photo: { id: string } | null }>;
  };
  const phases = async (leadId: string) =>
    (await request(app).get(`/api/leads/${leadId}/phases`).set("Cookie", staff()).expect(200)).body.phases as PhaseRow[];
  const statusOf = async (leadId: string) =>
    (await request(app).get(`/api/leads/${leadId}`).set("Cookie", staff()).expect(200)).body.status as string;
  const skip = (leadId: string, phaseId: string, reason: unknown = "Ya traía su evaluación", role: "medico" | "administrativo" = "administrativo") =>
    request(app).put(`/api/leads/${leadId}/phases/${phaseId}/skip`).set("Cookie", staff(role)).send({ reason });
  async function newPatient(overrides: Record<string, unknown> = {}, role: "medico" | "administrativo" = "administrativo") {
    const res = await request(app).post("/api/leads").set("Cookie", staff(role)).send({ ...NEW_PATIENT, ...overrides });
    expect(res.status).toBe(201);
    return res.body.lead as { id: string; token: string };
  }

  it("médicos y administrativos agregan pacientes, con constancia de consentimiento (quién y cuándo)", async () => {
    const lead = await newPatient();
    const full = (await request(app).get(`/api/leads/${lead.id}`).set("Cookie", staff()).expect(200)).body;
    expect(full.consent).toBe(true);
    expect(full.status).toBe("incompleto");
    expect(full.consentRecordedBy).toBe("staff-1");
    expect(full.consentRecordedAt).toBeTruthy();
    const doctor = await newPatient({ documentId: "11.111.111-1", phone: "+56933333333", email: "otro@example.com" }, "medico");
    expect(doctor.id).not.toBe(lead.id);
  });

  it("no guarda sin la constancia de consentimiento, sin sesión o con datos repetidos", async () => {
    await request(app).post("/api/leads").set("Cookie", staff()).send({ ...NEW_PATIENT, consentConfirmed: false }).expect(422);
    await request(app).post("/api/leads").send(NEW_PATIENT).expect(401);
    await request(app).post("/api/leads").set("Cookie", staff()).send({ ...NEW_PATIENT, documentId: "12.345.678-9" }).expect(400);
    await request(app).post("/api/leads").set("Cookie", staff()).send({ ...NEW_PATIENT, name: "" }).expect(422);
    await newPatient();
    const again = await request(app).post("/api/leads").set("Cookie", staff()).send({ ...NEW_PATIENT, phone: "+56944444444", email: "x@example.com" });
    expect(again.status).toBe(409);
    expect(again.body.duplicate).toBe(true);
    const samePhone = await request(app).post("/api/leads").set("Cookie", staff()).send({ ...NEW_PATIENT, documentId: "11.111.111-1" });
    expect(samePhone.status).toBe(409);
  });

  it("el personal registra las vistas de la pre-evaluación de un paciente que agregó, pero no las de uno que se registró solo", async () => {
    const lead = await newPatient();
    const list = await phases(lead.id);
    expect(list[0].staffCanCapture).toBe(true);
    for (const view of list[0].views) {
      await request(app).post(`/api/leads/${lead.id}/views/${view.id}/photo`).set("Cookie", staff()).set("Content-Type", "image/jpeg").send(JPEG).expect(201);
    }
    expect((await phases(lead.id))[0].complete).toBe(true);
    expect(await statusOf(lead.id)).toBe("listo");

    const own = (await request(app).post("/api/patients").send({ ...VALID_BODY, documentId: "11.111.111-1", phone: "+56955555555", email: "solo@example.com" }).expect(201)).body.lead as { id: string };
    const ownList = await phases(own.id);
    expect(ownList[0].staffCanCapture).toBe(false);
    expect((await request(app).post(`/api/leads/${own.id}/views/${ownList[0].views[0].id}/photo`).set("Cookie", staff()).set("Content-Type", "image/jpeg").send(JPEG)).status).toBe(400);
  });

  it("omitir una etapa exige motivo, deja avanzar a la siguiente y se puede deshacer", async () => {
    const lead = await newPatient();
    const [pre, diagnosis, preop] = await phases(lead.id);
    expect(preop.enabled).toBe(false);
    expect((await skip(lead.id, pre.id, "")).status).toBe(422);
    expect((await skip(lead.id, diagnosis.id)).status).toBe(409); // aún no está abierta
    await skip(lead.id, pre.id, "Trae fotos de otra clínica").expect(200);

    let list = await phases(lead.id);
    expect(list[0]).toMatchObject({ skipped: true, complete: false, skip: { reason: "Trae fotos de otra clínica", byName: "staff-1" } });
    expect(list[1].enabled).toBe(true);
    expect(await statusOf(lead.id)).toBe("listo");

    await skip(lead.id, diagnosis.id, "Diagnóstico previo en papel").expect(200);
    list = await phases(lead.id);
    expect(list[2].enabled).toBe(true);
    expect(await statusOf(lead.id)).toBe("contactar");

    // Con la pre-evaluación omitida el médico igual puede cerrar un diagnóstico propio.
    await request(app).delete(`/api/leads/${lead.id}/phases/${diagnosis.id}/skip`).set("Cookie", staff()).expect(204);
    await request(app).put(`/api/leads/${lead.id}/phases/${diagnosis.id}/attention`).set("Cookie", staff("medico")).send({ date: "2026-01-15" }).expect(200);
    await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff("medico")).send({ responseText: "Candidato." }).expect(200);
    await request(app).post(`/api/leads/${lead.id}/diagnosis/close`).set("Cookie", staff("medico")).send({}).expect(200);
    expect((await phases(lead.id))[1].complete).toBe(true);

    await request(app).delete(`/api/leads/${lead.id}/phases/${pre.id}/skip`).set("Cookie", staff()).expect(204);
    expect((await phases(lead.id))[0].skipped).toBe(false);
    await request(app).delete(`/api/leads/${lead.id}/phases/${pre.id}/skip`).set("Cookie", staff()).expect(404);
  });

  describe("fecha e ID de la atención (desde el diagnóstico)", () => {
    const attend = (leadId: string, phaseId: string, body: unknown, cookie = staff("medico")) =>
      request(app).put(`/api/leads/${leadId}/phases/${phaseId}/attention`).set("Cookie", cookie).send(body as object);

    it("la piden el diagnóstico y las fases siguientes, no la pre-evaluación; sin fecha no se cierra el diagnóstico", async () => {
      const lead = await newPatient();
      const [pre, dx, preop] = await phases(lead.id);
      expect(pre).toMatchObject({ attentionRequired: false, attention: null });
      expect(dx).toMatchObject({ attentionRequired: true, attention: null });
      expect(preop).toMatchObject({ attentionRequired: true, attention: null });
      for (const view of pre.views) await request(app).post(`/api/leads/${lead.id}/views/${view.id}/photo`).set("Cookie", staff()).set("Content-Type", "image/jpeg").send(JPEG).expect(201);
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff("medico")).send({ responseText: "Candidato." }).expect(200);
      const blocked = await request(app).post(`/api/leads/${lead.id}/diagnosis/close`).set("Cookie", staff("medico")).send({});
      expect(blocked.status).toBe(409);
      expect(blocked.body.error).toMatch(/fecha de atención/);
      expect((await attend(lead.id, pre.id, { date: "2026-01-15" })).status).toBe(409);
      const saved = await attend(lead.id, dx.id, { date: "2026-01-15", agendaId: "  AG-4587 " }).expect(200);
      expect(saved.body.attention).toMatchObject({ date: "2026-01-15", agendaId: "AG-4587", byName: "staff-1" });
      await request(app).post(`/api/leads/${lead.id}/diagnosis/close`).set("Cookie", staff("medico")).send({}).expect(200);
      expect((await phases(lead.id))[1].attention).toMatchObject({ date: "2026-01-15", agendaId: "AG-4587" });
    });

    it("el ID es opcional y la fecha se puede corregir; el administrativo también las registra", async () => {
      const lead = await newPatient();
      const [, dx] = await phases(lead.id);
      for (const view of (await phases(lead.id))[0].views) await request(app).post(`/api/leads/${lead.id}/views/${view.id}/photo`).set("Cookie", staff()).set("Content-Type", "image/jpeg").send(JPEG).expect(201);
      await attend(lead.id, dx.id, { date: "2026-01-15" }, staff("administrativo")).expect(200);
      expect((await phases(lead.id))[1].attention).toMatchObject({ date: "2026-01-15", agendaId: "" });
      await attend(lead.id, dx.id, { date: "2026-02-01", agendaId: "77" }).expect(200);
      expect((await phases(lead.id))[1].attention).toMatchObject({ date: "2026-02-01", agendaId: "77" });
    });

    it("valida la fecha y el ID, la clínica y que la fase esté abierta", async () => {
      const lead = await newPatient();
      const [, dx, preop] = await phases(lead.id);
      for (const body of [{}, { date: "" }, { date: "15-01-2026" }, { date: "2026-02-30" }, { date: "1999-12-31" }, { date: "2999-01-01" }, { date: 20260115 }]) {
        expect((await attend(lead.id, dx.id, body)).status, JSON.stringify(body)).toBe(422);
      }
      expect((await attend(lead.id, dx.id, { date: "2026-01-15", agendaId: "x".repeat(61) })).status).toBe(422);
      expect((await attend(lead.id, dx.id, { date: "2026-01-15", agendaId: 5 })).status).toBe(422);
      expect((await attend(lead.id, dx.id, { date: "2026-01-15" })).status).toBe(409); // la fase aún está bloqueada
      expect((await attend(lead.id, preop.id, { date: "2026-01-15" })).status).toBe(409);
      expect((await attend(lead.id, "no-existe", { date: "2026-01-15" })).status).toBe(404);
      expect((await attend(lead.id, dx.id, { date: "2026-01-15" }, staff("medico", "otra-clinica"))).status).toBe(404);
      expect((await request(app).put(`/api/leads/${lead.id}/phases/${dx.id}/attention`).send({ date: "2026-01-15" })).status).toBe(401);
    });

    it("sin la fecha de la fase no se suben sus fotografías; con ella sí", async () => {
      const lead = await newPatient();
      for (const view of (await phases(lead.id))[0].views) await request(app).post(`/api/leads/${lead.id}/views/${view.id}/photo`).set("Cookie", staff()).set("Content-Type", "image/jpeg").send(JPEG).expect(201);
      const [, dx] = await phases(lead.id);
      await attend(lead.id, dx.id, { date: "2026-01-15" }).expect(200);
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff("medico")).send({ responseText: "Candidato." }).expect(200);
      await request(app).post(`/api/leads/${lead.id}/diagnosis/close`).set("Cookie", staff("medico")).send({}).expect(200);
      const [, , preop] = await phases(lead.id);
      const blocked = await request(app).post(`/api/leads/${lead.id}/views/${preop.views[0].id}/photo`).set("Cookie", staff()).set("Content-Type", "image/jpeg").send(JPEG);
      expect(blocked.status).toBe(409);
      expect(blocked.body.error).toMatch(/fecha de atención/);
      await attend(lead.id, preop.id, { date: "2026-02-10", agendaId: "AG-9" }).expect(200);
      await request(app).post(`/api/leads/${lead.id}/views/${preop.views[0].id}/photo`).set("Cookie", staff()).set("Content-Type", "image/jpeg").send(JPEG).expect(201);
    });

    it("con el proceso cerrado (alta médica) ya no se cambia", async () => {
      const lead = await newPatient();
      for (const view of (await phases(lead.id))[0].views) await request(app).post(`/api/leads/${lead.id}/views/${view.id}/photo`).set("Cookie", staff()).set("Content-Type", "image/jpeg").send(JPEG).expect(201);
      const [, dx] = await phases(lead.id);
      await attend(lead.id, dx.id, { date: "2026-01-15" }).expect(200);
      await request(app).put(`/api/leads/${lead.id}/diagnosis`).set("Cookie", staff("medico")).send({ responseText: "Candidato." }).expect(200);
      await request(app).post(`/api/leads/${lead.id}/diagnosis/close`).set("Cookie", staff("medico")).send({}).expect(200);
      await request(app).post(`/api/leads/${lead.id}/discharge`).set("Cookie", staff("medico")).send({}).expect(200);
      expect((await attend(lead.id, dx.id, { date: "2026-01-20" })).status).toBe(409);
    });
  });

  it("omitir una etapa solo vale para el personal de la misma clínica", async () => {
    const lead = await newPatient();
    const [pre] = await phases(lead.id);
    expect((await request(app).put(`/api/leads/${lead.id}/phases/${pre.id}/skip`).set("Cookie", staff("medico", "otra-clinica")).send({ reason: "x".repeat(10) })).status).toBe(404);
    expect((await request(app).put(`/api/leads/${lead.id}/phases/${pre.id}/skip`).send({ reason: "motivo" })).status).toBe(401);
  });

  it("alta médica: solo médicos, después del diagnóstico, estado propio y reabrible", async () => {
    const lead = await newPatient();
    const [pre, diagnosis] = await phases(lead.id);
    expect((await request(app).post(`/api/leads/${lead.id}/discharge`).set("Cookie", staff("administrativo")).send({})).status).toBe(403);
    expect((await request(app).post(`/api/leads/${lead.id}/discharge`).set("Cookie", staff("medico")).send({})).status).toBe(409); // antes del diagnóstico

    await skip(lead.id, pre.id).expect(200);
    await skip(lead.id, diagnosis.id).expect(200);
    const done = await request(app).post(`/api/leads/${lead.id}/discharge`).set("Cookie", staff("medico")).send({ note: "Evolución favorable" });
    expect(done.status).toBe(200);
    expect(await statusOf(lead.id)).toBe("alta");
    const full = (await request(app).get(`/api/leads/${lead.id}`).set("Cookie", staff()).expect(200)).body;
    expect(full.dischargeNote).toBe("Evolución favorable");
    expect(full.dischargedAt).toBeTruthy();

    // El estado "alta" gana sobre el calculado y no se cambia a mano ni por la lista.
    expect((await request(app).patch(`/api/leads/${lead.id}`).set("Cookie", staff("administrativo")).send({ status: "listo" })).status).toBe(409);
    expect((await skip(lead.id, (await phases(lead.id))[2].id)).status).toBe(409);
    const inFilter = (await request(app).get("/api/leads?status=alta").set("Cookie", staff()).expect(200)).body.leads as Array<{ id: string }>;
    expect(inFilter.map((l) => l.id)).toEqual([lead.id]);
    expect((await request(app).get("/api/leads/stats").set("Cookie", staff()).expect(200)).body.counts).toMatchObject({ alta: 1 });

    expect((await request(app).delete(`/api/leads/${lead.id}/discharge`).set("Cookie", staff("administrativo"))).status).toBe(403);
    const reopened = await request(app).delete(`/api/leads/${lead.id}/discharge`).set("Cookie", staff("medico")).expect(200);
    expect(reopened.body.status).toBe("contactar");
    expect(await statusOf(lead.id)).toBe("contactar");
  });

  it("nadie puede poner el estado alta con el selector de estado", async () => {
    const lead = await newPatient();
    await request(app).patch(`/api/leads/${lead.id}`).set("Cookie", staff("medico")).send({ status: "alta" });
    expect(await statusOf(lead.id)).not.toBe("alta");
  });
});

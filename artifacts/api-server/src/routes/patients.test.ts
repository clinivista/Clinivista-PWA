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

import * as mockedDb from "@workspace/db";
import patientsRouter from "./patients";
import leadsRouter from "./leads";
import { createSession } from "../lib/sessions";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use("/api", patientsRouter);
app.use("/api", leadsRouter);

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
    CREATE UNIQUE INDEX IF NOT EXISTS leads_document_normalized_unique
      ON leads (document_normalized)
      WHERE document_normalized IS NOT NULL AND document_normalized <> '';
     CREATE TABLE IF NOT EXISTS clinical_centers (
       id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
       active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinical_protocols (
       id text PRIMARY KEY, center_id text NOT NULL DEFAULT 'default-center',
       name text NOT NULL, version text NOT NULL DEFAULT '1', active boolean NOT NULL DEFAULT true,
       created_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinical_protocol_views (
       id text PRIMARY KEY, protocol_id text NOT NULL, key text NOT NULL, label text NOT NULL,
       position integer NOT NULL DEFAULT 0, requirements jsonb NOT NULL DEFAULT '{}',
       active boolean NOT NULL DEFAULT true,
       UNIQUE (protocol_id, key)
     );
     CREATE TABLE IF NOT EXISTS clinical_evaluations (
       id text PRIMARY KEY, lead_id text NOT NULL UNIQUE, center_id text NOT NULL DEFAULT 'default-center',
       protocol_id text NOT NULL DEFAULT 'capillary-initial', status text NOT NULL DEFAULT 'draft',
       created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
     );
     CREATE TABLE IF NOT EXISTS clinical_photos (
       id text PRIMARY KEY, evaluation_id text NOT NULL, view_id text NOT NULL, status text NOT NULL DEFAULT 'draft',
       original_object_path text NOT NULL, derivative_object_path text, original_mime_type text NOT NULL,
       original_bytes integer NOT NULL, original_sha256 text NOT NULL, width integer, height integer,
       source text NOT NULL DEFAULT 'upload', capture_metadata jsonb NOT NULL DEFAULT '{}',
       edit_params jsonb, created_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz,
       discarded_at timestamptz
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
    DELETE FROM clinical_photos;
    DELETE FROM clinical_evaluations;
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
    const session = createSession({ centerId: DEFAULT_CENTER_ID, role: "admin" });

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
});

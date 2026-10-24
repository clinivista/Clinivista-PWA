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
  const passwords = await import("../../../../lib/db/src/passwords");
  return { ...schema, ...passwords, db, pool: client, __pglite: client };
});

import * as mockedDb from "@workspace/db";
import patientsRouter from "./patients";
import clinicProtocolRouter from "./clinic-protocol";
import leadsRouter from "./leads";
import leadPhasesRouter from "./lead-phases";
import staffPatientsRouter from "./staff-patients";
import diagnosisRouter from "./diagnosis";
import resultsRouter from "./results";
import evolutionRouter from "./evolution";
import portalRouter from "./portal";
import { createSession } from "../lib/sessions";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";


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
app.use("/api", clinicProtocolRouter);

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
    DELETE FROM clinical_photo_audit_events; DELETE FROM clinical_result_deliveries; DELETE FROM patient_accounts;
    DELETE FROM clinical_photo_annotations; DELETE FROM clinical_diagnosis_events; DELETE FROM clinical_diagnoses;
    DELETE FROM clinical_photos; DELETE FROM clinical_evaluations; DELETE FROM clinical_protocol_phases;
    DELETE FROM clinical_protocol_views; DELETE FROM clinical_protocols; DELETE FROM clinical_centers; DELETE FROM leads; DELETE FROM users;
  `);
  await pglite.exec(`
    INSERT INTO clinical_centers (id, name, slug, specialty) VALUES ('derma-a', 'Derma A', 'derma-a', 'dermatologia'), ('derma-b', 'Derma B', 'derma-b', 'dermatologia'), ('capilar-a', 'Capilar A', 'capilar-a', 'capilar');
    INSERT INTO users (id, email, email_normalized, password_hash, role, center_id, legal_representative) VALUES
      ('rep-a', 'rep@a.cl', 'rep@a.cl', 'x', 'medico', 'derma-a', true),
      ('doc-a', 'doc@a.cl', 'doc@a.cl', 'x', 'medico', 'derma-a', false),
      ('rep-b', 'rep@b.cl', 'rep@b.cl', 'x', 'medico', 'derma-b', true),
      ('rep-c', 'rep@c.cl', 'rep@c.cl', 'x', 'medico', 'capilar-a', true);
  `);
});

const as = (userId: string, centerId: string, role: "medico" | "administrativo" = "medico") => `clinivista_session=${createSession({ userId, centerId, role })}`;
const rep = () => as("rep-a", "derma-a");
const doc = () => as("doc-a", "derma-a");

const PATIENT = { name: "Paciente Prueba", phone: "+56911111111", documentId: "12.345.678-5", email: "p@example.com", consentConfirmed: true };

async function typeId(templateKey: string, cookie = rep()): Promise<string> {
  const res = await request(app).post("/api/clinic/consult-types").set("Cookie", cookie).send({ templateKey }).expect(201);
  return res.body.types.find((t: { templateKey: string }) => t.templateKey === templateKey).id;
}

describe("tipos de consulta", () => {
  it("un centro de dermatología parte con el proceso base y las 4 plantillas disponibles", async () => {
    const res = await request(app).get("/api/clinic/consult-types").set("Cookie", doc()).expect(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.canEdit).toBe(false);
    expect(res.body.types).toHaveLength(1);
    expect(res.body.types[0]).toMatchObject({ isBase: true, active: true, name: "Consulta general" });
    expect(res.body.templates.map((t: { key: string }) => t.key)).toEqual(["lesiones", "acne", "manchas", "biopsia"]);
  });

  it("solo el representante legal activa plantillas; no se repiten", async () => {
    await request(app).post("/api/clinic/consult-types").set("Cookie", doc()).send({ templateKey: "acne" }).expect(403);
    const id = await typeId("acne");
    const list = (await request(app).get("/api/clinic/consult-types").set("Cookie", doc())).body;
    expect(list.types.map((t: { name: string }) => t.name)).toContain("Acné");
    expect(list.templates.map((t: { key: string }) => t.key)).not.toContain("acne");
    await request(app).post("/api/clinic/consult-types").set("Cookie", rep()).send({ templateKey: "acne" }).expect(400);
    // la estructura del tipo se puede leer y editar aparte del proceso base
    const own = (await request(app).get(`/api/clinic/protocol?typeId=${id}`).set("Cookie", rep()).expect(200)).body;
    expect(own.phases.map((p: { name: string }) => p.name)).toEqual(["Pre-evaluación", "Diagnóstico", "Tratamiento", "Control 1"]);
    expect(own.phases[0].views.map((v: { label: string }) => v.label)).toEqual(["Frente", "Perfil derecho", "Perfil izquierdo"]);
    const base = (await request(app).get("/api/clinic/protocol").set("Cookie", rep()).expect(200)).body;
    expect(base.phases.map((p: { name: string }) => p.name)).toEqual(["Pre-evaluación", "Diagnóstico", "Tratamiento", "Control 1", "Control 2"]);
    const edited = own.phases.map((p: { id: string; name: string; kind: string; views: Array<{ id: string; label: string }> }, i: number) => ({
      id: p.id, name: i === 2 ? "Isotretinoína" : p.name, views: p.kind === "diagnosis" ? [] : p.views.map((v) => ({ id: v.id, label: v.label })),
    }));
    await request(app).put(`/api/clinic/protocol?typeId=${id}`).set("Cookie", rep()).send({ phases: edited }).expect(200);
    const after = (await request(app).get(`/api/clinic/protocol?typeId=${id}`).set("Cookie", rep())).body;
    expect(after.phases[2].name).toBe("Isotretinoína");
    const baseAfter = (await request(app).get("/api/clinic/protocol").set("Cookie", rep())).body;
    expect(baseAfter.phases[2].name).toBe("Tratamiento");
  });

  it("crea tipos propios, los renombra y desactiva; el base no se toca", async () => {
    const created = await request(app).post("/api/clinic/consult-types").set("Cookie", rep()).send({ name: "Alopecia areata" }).expect(201);
    const own = created.body.types.find((t: { name: string }) => t.name === "Alopecia areata");
    expect(own).toMatchObject({ templateKey: "custom", active: true });
    await request(app).post("/api/clinic/consult-types").set("Cookie", rep()).send({ name: "alopecia AREATA" }).expect(400);
    await request(app).post("/api/clinic/consult-types").set("Cookie", rep()).send({ name: "x" }).expect(400);
    await request(app).patch(`/api/clinic/consult-types/${own.id}`).set("Cookie", rep()).send({ name: "Alopecia", active: false }).expect(200);
    const list = (await request(app).get("/api/clinic/consult-types").set("Cookie", rep())).body;
    expect(list.types.find((t: { id: string }) => t.id === own.id)).toMatchObject({ name: "Alopecia", active: false });
    const base = list.types.find((t: { isBase: boolean }) => t.isBase);
    await request(app).patch(`/api/clinic/consult-types/${base.id}`).set("Cookie", rep()).send({ active: false }).expect(400);
  });

  it("un centro no ve ni edita los tipos de otro", async () => {
    const id = await typeId("manchas");
    await request(app).get(`/api/clinic/protocol?typeId=${id}`).set("Cookie", as("x", "derma-b")).expect(404);
    await request(app).patch(`/api/clinic/consult-types/${id}`).set("Cookie", as("rep-b", "derma-b")).send({ active: false }).expect(400);
  });

  it("los centros que no son de dermatología no tienen tipos adicionales", async () => {
    const res = await request(app).get("/api/clinic/consult-types").set("Cookie", as("rep-c", "capilar-a")).expect(200);
    expect(res.body.enabled).toBe(false);
    expect(res.body.types).toHaveLength(1);
    expect(res.body.templates).toEqual([]);
    await request(app).post("/api/clinic/consult-types").set("Cookie", as("rep-c", "capilar-a")).send({ templateKey: "acne" }).expect(400);
  });
});

describe("consultas del paciente", () => {
  async function addPatient(consultTypeId?: string) {
    const res = await request(app).post("/api/leads").set("Cookie", doc()).send({ ...PATIENT, ...(consultTypeId ? { consultTypeId } : {}) });
    expect(res.status).toBe(201);
    return res.body.lead.id as string;
  }

  it("al agregar un paciente se elige el tipo, y su proceso es el de ese tipo", async () => {
    const acne = await typeId("acne");
    const id = await addPatient(acne);
    const phases = (await request(app).get(`/api/leads/${id}/phases`).set("Cookie", doc()).expect(200)).body.phases;
    expect(phases[0].views.map((v: { label: string }) => v.label)).toEqual(["Frente", "Perfil derecho", "Perfil izquierdo"]);
    const lead = (await request(app).get(`/api/leads/${id}`).set("Cookie", doc()).expect(200)).body;
    expect(lead).toMatchObject({ consultTypeName: "Acné", consultCount: 1 });
  });

  it("rechaza un tipo inexistente, desactivado o de otro centro", async () => {
    await request(app).post("/api/leads").set("Cookie", doc()).send({ ...PATIENT, consultTypeId: "nada" }).expect(422);
    const own = (await request(app).post("/api/clinic/consult-types").set("Cookie", rep()).send({ name: "Temporal" })).body.id;
    await request(app).patch(`/api/clinic/consult-types/${own}`).set("Cookie", rep()).send({ active: false }).expect(200);
    await request(app).post("/api/leads").set("Cookie", doc()).send({ ...PATIENT, consultTypeId: own }).expect(422);
    const other = await typeId("biopsia", as("rep-b", "derma-b"));
    await request(app).post("/api/leads").set("Cookie", doc()).send({ ...PATIENT, consultTypeId: other }).expect(422);
  });

  it("agrega otra consulta a la ficha: caso propio, un solo paciente en la lista", async () => {
    const mainId = await addPatient();
    const acne = await typeId("acne");
    const added = await request(app).post(`/api/leads/${mainId}/consultations`).set("Cookie", doc()).send({ consultTypeId: acne }).expect(201);
    const childId = added.body.lead.id as string;
    expect(childId).not.toBe(mainId);

    const list = (await request(app).get("/api/leads").set("Cookie", doc()).expect(200)).body.leads;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: mainId, consultCount: 2 });
    expect((await request(app).get("/api/leads/stats").set("Cookie", doc())).body.total).toBe(1);

    const child = (await request(app).get(`/api/leads/${childId}`).set("Cookie", doc()).expect(200)).body;
    expect(child).toMatchObject({ parentLeadId: mainId, name: PATIENT.name, consultTypeName: "Acné", consultCount: 2 });
    const phases = (await request(app).get(`/api/leads/${childId}/phases`).set("Cookie", doc())).body.phases;
    expect(phases[0].views[0].label).toBe("Frente");

    for (const from of [mainId, childId]) {
      const res = (await request(app).get(`/api/leads/${from}/consultations`).set("Cookie", doc()).expect(200)).body;
      expect(res.currentId).toBe(from);
      expect(res.consultations.map((c: { id: string; isMain: boolean }) => [c.id, c.isMain])).toEqual([[mainId, true], [childId, false]]);
    }
    // el RUT sigue siendo único: registrar de nuevo al paciente sigue avisando de duplicado
    await request(app).post("/api/leads").set("Cookie", doc()).send(PATIENT).expect(409);
  });

  it("no agrega consultas con un tipo inválido, a otro centro ni en centros que no son de dermatología", async () => {
    const mainId = await addPatient();
    await request(app).post(`/api/leads/${mainId}/consultations`).set("Cookie", doc()).send({ consultTypeId: "nada" }).expect(422);
    await request(app).post(`/api/leads/${mainId}/consultations`).set("Cookie", as("x", "derma-b")).send({ consultTypeId: "nada" }).expect(404);
    const capilar = await request(app).post("/api/leads").set("Cookie", as("rep-c", "capilar-a")).send(PATIENT).expect(201);
    await request(app).post(`/api/leads/${capilar.body.lead.id}/consultations`).set("Cookie", as("rep-c", "capilar-a")).send({ consultTypeId: "x" }).expect(409);
  });

  it("borrar la ficha borra también sus consultas adicionales", async () => {
    const mainId = await addPatient();
    const acne = await typeId("acne");
    await request(app).post(`/api/leads/${mainId}/consultations`).set("Cookie", doc()).send({ consultTypeId: acne }).expect(201);
    await request(app).delete(`/api/leads/${mainId}`).set("Cookie", doc()).expect(200);
    const left = (await pglite.exec("SELECT count(*)::int AS n FROM leads;")) as Array<{ rows: Array<{ n: number }> }>;
    expect(left[0].rows[0].n).toBe(0);
  });
});

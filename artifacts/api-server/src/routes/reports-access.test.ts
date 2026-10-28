/**
 * Rutas de los informes PDF con una base PGlite en memoria (datos de prueba, nunca reales):
 * acceso del personal, aislamiento entre clínicas (404 cruzados), que descargar el alta no cambia nada
 * y que la descarga es repetible; el informe de pendientes separa las dos categorías y solo trae su clínica.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { writeFileSync } from "node:fs";
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
import staffPatientsRouter from "./staff-patients";
import clinicReportRouter from "./clinic-report";
import resultsRouter from "./results";
import evolutionRouter from "./evolution";
import { createSession } from "../lib/sessions";
import { pdfText } from "../lib/testing/pdf-text";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown>; query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", staffPatientsRouter);
app.use("/api", clinicReportRouter);
app.use("/api", resultsRouter);
app.use("/api", evolutionRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar', plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'unlimited', 'titanium')),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_protocols (template_key text NOT NULL DEFAULT '',
      id text PRIMARY KEY, center_id text NOT NULL DEFAULT 'default-center', name text NOT NULL, version text NOT NULL DEFAULT '1',
      specialty text NOT NULL DEFAULT 'capilar', active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_protocol_views (
      id text PRIMARY KEY, protocol_id text NOT NULL, key text NOT NULL, label text NOT NULL,
      position integer NOT NULL DEFAULT 0, requirements jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true, phase_id text,
      UNIQUE (protocol_id, key)
    );
    CREATE TABLE IF NOT EXISTS clinical_protocol_phases (
      id text PRIMARY KEY, protocol_id text NOT NULL, key text NOT NULL, name text NOT NULL,
      position integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, kind text NOT NULL DEFAULT 'capture',
      UNIQUE (protocol_id, key)
    );
    CREATE TABLE IF NOT EXISTS leads (parent_lead_id text,
      id text PRIMARY KEY, token text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', document_id text DEFAULT '', document_normalized text DEFAULT '',
      email text DEFAULT '', age text DEFAULT '', city text DEFAULT '', status text NOT NULL DEFAULT 'nuevo',
      consent boolean NOT NULL DEFAULT false, marketing_consent boolean NOT NULL DEFAULT false, photo_count text NOT NULL DEFAULT '0',
      photos jsonb NOT NULL DEFAULT '[]', hair_loss_time text DEFAULT '', pattern text DEFAULT '', previous_treatment text DEFAULT '',
      symptoms text DEFAULT '', surgery_history text DEFAULT '', notes text DEFAULT '', norwood text DEFAULT '', appointment_at text DEFAULT '',
      is_demo boolean DEFAULT false, center_id text DEFAULT 'default-center', protocol_id text DEFAULT 'capillary-initial',
      delivery_channel text DEFAULT '', language text DEFAULT '', patient_account_id text, clinical_data jsonb NOT NULL DEFAULT '{}',
      consent_recorded_by text DEFAULT '', consent_recorded_at timestamptz, skipped_phases jsonb NOT NULL DEFAULT '[]', phase_attentions jsonb NOT NULL DEFAULT '{}',
      discharged_at timestamptz, discharged_by_name text DEFAULT '', discharge_note text DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS clinical_evaluations (id text PRIMARY KEY, lead_id text NOT NULL UNIQUE, center_id text NOT NULL DEFAULT 'default-center', protocol_id text NOT NULL DEFAULT 'capillary-initial', status text NOT NULL DEFAULT 'draft', clinical_data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS clinical_photos (id text PRIMARY KEY, evaluation_id text NOT NULL, view_id text NOT NULL, status text NOT NULL DEFAULT 'draft', original_object_path text NOT NULL, derivative_object_path text, original_mime_type text NOT NULL, original_bytes integer NOT NULL, original_sha256 text NOT NULL, width integer, height integer, source text NOT NULL DEFAULT 'upload', capture_metadata jsonb NOT NULL DEFAULT '{}', edit_params jsonb, note text, created_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz, discarded_at timestamptz);
    CREATE TABLE IF NOT EXISTS clinical_photo_transcriptions (photo_id text PRIMARY KEY, text text NOT NULL DEFAULT '', tier text NOT NULL DEFAULT 'basic', model text NOT NULL DEFAULT '', transcribed_by_user_id text, transcribed_by_name text, transcribed_at timestamptz NOT NULL DEFAULT now(), edited_by_name text, edited_at timestamptz);
    CREATE TABLE IF NOT EXISTS clinical_diagnoses (
      id text PRIMARY KEY, evaluation_id text NOT NULL UNIQUE, response_text text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'draft', closed_at timestamptz, closed_by_user_id text, closed_by_name text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinical_diagnosis_events (id text PRIMARY KEY, diagnosis_id text NOT NULL, action text NOT NULL, actor_user_id text, actor_name text, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS clinical_photo_annotations (id text PRIMARY KEY, photo_id text NOT NULL UNIQUE, object_path text NOT NULL, mime_type text NOT NULL, strokes jsonb NOT NULL DEFAULT '[]', updated_by_user_id text, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS clinical_result_deliveries (id text PRIMARY KEY, lead_id text NOT NULL, token text NOT NULL UNIQUE, object_path text NOT NULL, channel text NOT NULL, recipient text NOT NULL DEFAULT '', status text NOT NULL, error text, created_by_user_id text, created_by_name text, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL);
    CREATE TABLE IF NOT EXISTS clinic_report_settings (
      center_id text PRIMARY KEY, enabled boolean NOT NULL DEFAULT false, recipients text NOT NULL DEFAULT '',
      frequency text NOT NULL DEFAULT 'weekly', weekday integer NOT NULL DEFAULT 1, hour integer NOT NULL DEFAULT 8,
      skip_when_empty boolean NOT NULL DEFAULT true, last_sent_at timestamptz, last_error text, updated_at timestamptz NOT NULL DEFAULT now()
    );
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
  await pglite.exec(`TRUNCATE clinical_centers, clinical_protocols, clinical_protocol_views, clinical_protocol_phases, leads, clinical_evaluations, clinical_photos, clinical_diagnoses, clinical_diagnosis_events, clinical_photo_annotations, clinical_result_deliveries, clinic_report_settings, users;`);
  await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-a', 'Clínica Alfa', 'clinic-a'), ('clinic-b', 'Clínica Beta', 'clinic-b');`);
  await pglite.exec(`
    INSERT INTO leads (id, token, name, document_id, status, center_id, protocol_id, updated_at, discharged_at, discharged_by_name, discharge_note) VALUES
      ('la-alta', 't1', 'Paciente Alfa', '11.111.111-1', 'alta', 'clinic-a', 'clinic-a-capilar', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z', 'Dra. Alfa', 'Control anual.'),
      ('la-open', 't2', 'Paciente Abierto', '', 'listo', 'clinic-a', 'clinic-a-capilar', now() - interval '3 days', NULL, '', ''),
      ('la-done', 't3', 'Paciente Cerrado Sin Envio', '', 'contactar', 'clinic-a', 'clinic-a-capilar', now() - interval '2 days', NULL, '', ''),
      ('la-sent', 't4', 'Paciente Enviado', '', 'contactar', 'clinic-a', 'clinic-a-capilar', now() - interval '1 days', NULL, '', ''),
      ('lb-alta', 't5', 'Paciente Beta', '', 'alta', 'clinic-b', 'clinic-b-capilar', '2026-10-20T12:00:00Z', '2026-10-20T12:00:00Z', 'Dr. Beta', ''),
      ('lb-open', 't6', 'Paciente Beta Pendiente', '', 'listo', 'clinic-b', 'clinic-b-capilar', now(), NULL, '', '');
    INSERT INTO clinical_evaluations (id, lead_id, center_id, protocol_id) VALUES
      ('ev-done', 'la-done', 'clinic-a', 'clinic-a-capilar'), ('ev-sent', 'la-sent', 'clinic-a', 'clinic-a-capilar'), ('ev-open', 'la-open', 'clinic-a', 'clinic-a-capilar');
    INSERT INTO clinical_diagnoses (id, evaluation_id, status, response_text, closed_at, closed_by_name) VALUES
      ('dg-done', 'ev-done', 'closed', 'ok', '2026-10-15T12:00:00Z', 'Dra. Alfa'), ('dg-sent', 'ev-sent', 'closed', 'ok', '2026-10-15T12:00:00Z', 'Dra. Alfa'), ('dg-open', 'ev-open', 'draft', '', NULL, NULL);
    INSERT INTO clinical_result_deliveries (id, lead_id, token, object_path, channel, status, expires_at) VALUES
      ('d1', 'la-sent', 'tok1', 'x', 'email', 'sent', now() + interval '30 days'),
      ('d2', 'la-done', 'tok2', 'x', 'email', 'failed', now() + interval '30 days');
  `);
});

const cookie = (role: "medico" | "administrativo", centerId = "clinic-a") => `clinivista_session=${createSession({ userId: `u-${role}-${centerId}`, centerId, role })}`;
const leadRow = async (id: string) => (await pglite.query(`SELECT status, updated_at, discharged_at, discharged_by_name, discharge_note FROM leads WHERE id = '${id}'`)).rows[0];
const binary = (res: request.Response, callback: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

describe("GET /api/leads/:id/discharge/pdf", () => {
  it("sin sesión responde 401", async () => {
    await request(app).get("/api/leads/la-alta/discharge/pdf").expect(401);
  });

  it("un paciente de otra clínica responde 404, igual que uno sin alta o inexistente", async () => {
    await request(app).get("/api/leads/lb-alta/discharge/pdf").set("Cookie", cookie("medico")).expect(404);
    await request(app).get("/api/leads/la-open/discharge/pdf").set("Cookie", cookie("medico")).expect(404);
    await request(app).get("/api/leads/no-existe/discharge/pdf").set("Cookie", cookie("medico")).expect(404);
    await request(app).get("/api/leads/la-alta/discharge/pdf").set("Cookie", cookie("medico", "clinic-b")).expect(404);
  });

  it("todo el equipo de la clínica lo descarga; descargarlo dos veces da el mismo informe y no cambia al paciente", async () => {
    const before = await leadRow("la-alta");
    const first = await request(app).get("/api/leads/la-alta/discharge/pdf").set("Cookie", cookie("administrativo")).buffer(true).parse(binary).expect(200);
    expect(first.headers["content-type"]).toBe("application/pdf");
    expect(first.headers["cache-control"]).toBe("private, no-store");
    const second = await request(app).get("/api/leads/la-alta/discharge/pdf").set("Cookie", cookie("medico")).buffer(true).parse(binary).expect(200);
    if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/ruta-alta.pdf`, first.body as Buffer);
    const [a, b] = [await pdfText(first.body as Buffer), await pdfText(second.body as Buffer)];
    expect(a).toBe(b);
    for (const expected of ["Clínica Alfa", "Alta médica", "Paciente Alfa", "11.111.111-1", "Alta médica registrada por Dra. Alfa", "Control anual.", "Resumen del proceso"]) expect(a).toContain(expected);
    expect(a).not.toMatch(/Beta/);
    expect(await leadRow("la-alta")).toEqual(before);
  });
});

describe("GET /api/clinic/report/pdf", () => {
  it("sin sesión responde 401", async () => {
    await request(app).get("/api/clinic/report/pdf").expect(401);
  });

  it("trae solo los pacientes de la clínica de la sesión, con evaluación pendiente y resultado sin envío por separado", async () => {
    const res = await request(app).get("/api/clinic/report/pdf").set("Cookie", cookie("administrativo")).buffer(true).parse(binary).expect(200);
    if (process.env.PDF_OUT) writeFileSync(`${process.env.PDF_OUT}/ruta-pendientes.pdf`, res.body as Buffer);
    const text = await pdfText(res.body as Buffer);
    expect(text).toContain("Clínica Alfa");
    expect(text).not.toMatch(/Beta/);
    const pending = text.indexOf("Evaluación pendiente La preevaluación");
    const undelivered = text.indexOf("Resultado listo, pendiente de envío");
    expect(pending).toBeGreaterThan(-1);
    expect(undelivered).toBeGreaterThan(pending);
    // Diagnóstico en borrador → evaluación pendiente; cerrado con un envío fallido → sin envío; cerrado y enviado → fuera.
    expect(text.indexOf("Paciente Abierto")).toBeGreaterThan(pending);
    expect(text.indexOf("Paciente Abierto")).toBeLessThan(undelivered);
    expect(text.indexOf("Paciente Cerrado Sin Envio")).toBeGreaterThan(undelivered);
    expect(text).not.toContain("Paciente Enviado");
    expect(text).not.toContain("Paciente Alfa");
    expect(text).toMatch(/Evaluación pendiente 1 /);
    expect(text).toMatch(/Resultado sin enviar 1 /);
    expect(text).toMatch(/Total en la consulta 2 /);
  });

  it("el listado del panel y el correo siguen siendo los de siempre (solo evaluaciones pendientes)", async () => {
    const res = await request(app).get("/api/clinic/report").set("Cookie", cookie("administrativo")).expect(200);
    expect(res.body.pending.map((p: { name: string }) => p.name)).toEqual(["Paciente Abierto"]);
  });
});

describe("informes existentes: aislamiento entre clínicas", () => {
  it("diagnóstico y evolución de un paciente de otra clínica responden 404; sin diagnóstico cerrado, 409", async () => {
    await request(app).get("/api/leads/lb-open/results/pdf").set("Cookie", cookie("medico")).expect(404);
    await request(app).get("/api/leads/lb-open/evolution/pdf").set("Cookie", cookie("medico")).expect(404);
    await request(app).get("/api/leads/la-open/results/pdf").set("Cookie", cookie("medico")).expect(409);
    await request(app).get("/api/leads/la-open/results/pdf").expect(401);
  });
});

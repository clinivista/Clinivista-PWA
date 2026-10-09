import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
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
import { hashPassword } from "@workspace/db";
import clinicProtocolRouter from "./clinic-protocol";
import { createSession } from "../lib/sessions";
import { getPatientPhaseViews, getRequiredViewKeys } from "../lib/clinical-photos";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json());
app.use("/api", clinicProtocolRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL,
      password_hash text NOT NULL, name text NOT NULL DEFAULT '', role text NOT NULL,
      center_id text, active boolean NOT NULL DEFAULT true,
      legal_representative boolean NOT NULL DEFAULT false,
      reset_token_hash text, reset_token_expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
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
    CREATE TABLE IF NOT EXISTS clinical_photos (
      id text PRIMARY KEY, evaluation_id text NOT NULL, view_id text NOT NULL, status text NOT NULL DEFAULT 'draft',
      original_object_path text NOT NULL, derivative_object_path text, original_mime_type text NOT NULL,
      original_bytes integer NOT NULL, original_sha256 text NOT NULL, width integer, height integer,
      source text NOT NULL DEFAULT 'upload', capture_metadata jsonb NOT NULL DEFAULT '{}',
      edit_params jsonb, note text, created_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz,
      discarded_at timestamptz
    );
  `);
});

beforeEach(async () => {
  await pglite.exec(`TRUNCATE clinical_centers, users, clinical_protocols, clinical_protocol_views, clinical_protocol_phases, clinical_photos;`);
  await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-a', 'Clínica A', 'clinic-a'), ('clinic-b', 'Clínica B', 'clinic-b'), ('default-center', 'Estecapelli', 'estecapelli');`);
});

async function seedUser(id: string, role: string, centerId: string | null, legal = false) {
  await pglite.exec(`
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id, legal_representative)
    VALUES ('${id}', '${id}@x.cl', '${id}@x.cl', '${hashPassword("password123")}', 'N ${id}', '${role}', ${centerId ? `'${centerId}'` : "NULL"}, ${legal});
  `);
}
const as = (id: string, role: string, centerId: string | null) =>
  `clinivista_session=${createSession({ userId: id, centerId, role: role as "medico" })}`;

type Phase = { id: string; name: string; views: Array<{ id: string; label: string; hasPhotos: boolean }> };
const read = async (cookie: string) => (await request(app).get("/api/clinic/protocol").set("Cookie", cookie).expect(200)).body as { canEdit: boolean; phases: Phase[] };
const toInput = (phases: Phase[]) => phases.map((p) => ({ id: p.id, name: p.name, views: p.views.map((v) => ({ id: v.id, label: v.label })) }));

describe("fases de la clínica", () => {
  it("loads the six starting phases with five views each, for any clinic", async () => {
    await seedUser("rep", "medico", "clinic-a", true);
    const { phases, canEdit } = await read(as("rep", "medico", "clinic-a"));
    expect(canEdit).toBe(true);
    expect(phases.map((p) => p.name)).toEqual(["Pre-evaluación", "Diagnóstico", "Pre-operatorio", "Post-operatorio", "Control médico 1", "Control médico 2"]);
    expect(phases.map((p) => p.views.length)).toEqual([5, 0, 5, 5, 5, 5]);
    // The diagnosis is the doctor's: it marks up the patient's photos instead of having its own.
    expect(phases.map((p) => p.kind)).toEqual(["capture", "diagnosis", "capture", "capture", "capture", "capture"]);
  });

  it("seeds the default (Estecapelli) clinic too, and does not duplicate on repeated reads", async () => {
    await seedUser("adm", "administrativo", "default-center");
    await read(as("adm", "administrativo", "default-center"));
    const { phases } = await read(as("adm", "administrativo", "default-center"));
    expect(phases).toHaveLength(6);
    expect(phases.flatMap((p) => p.views)).toHaveLength(25);
  });

  it("only the legal representative can edit; others read it", async () => {
    await seedUser("doc", "medico", "clinic-a");
    await seedUser("adm", "administrativo", "clinic-a");
    const cookie = as("doc", "medico", "clinic-a");
    const { phases, canEdit } = await read(cookie);
    expect(canEdit).toBe(false);
    await request(app).put("/api/clinic/protocol").set("Cookie", cookie).send({ phases: toInput(phases) }).expect(403);
    await request(app).put("/api/clinic/protocol").set("Cookie", as("adm", "administrativo", "clinic-a")).send({ phases: toInput(phases) }).expect(403);
    await request(app).get("/api/clinic/protocol").expect(401);
    await request(app).get("/api/clinic/protocol").set("Cookie", as("dir", "director", null)).expect(403);
  });

  it("renames, adds and removes phases and photos, and keeps the order", async () => {
    await seedUser("rep", "medico", "clinic-a", true);
    const cookie = as("rep", "medico", "clinic-a");
    const { phases } = await read(cookie);
    const next = toInput(phases);
    next[1].name = "Diagnóstico y respuesta";
    next[2].name = "Pre-operatorio y plan";
    next[2].views = [...next[2].views.slice(0, 2), { label: "Zona receptora" } as never];
    next.splice(5, 1); // drop Control médico 2
    next.push({ name: "Control 12 meses", views: [{ label: "Frontal" }] } as never);
    const res = await request(app).put("/api/clinic/protocol").set("Cookie", cookie).send({ phases: next }).expect(200);
    const saved = res.body.phases as Phase[];
    expect(saved.map((p) => p.name)).toEqual(["Pre-evaluación", "Diagnóstico y respuesta", "Pre-operatorio y plan", "Post-operatorio", "Control médico 1", "Control 12 meses"]);
    expect(saved[2].views.map((v) => v.label)).toEqual([phases[2].views[0].label, phases[2].views[1].label, "Zona receptora"]);
    expect(saved[1].views).toHaveLength(0);
    expect(saved[5].views).toHaveLength(1);
  });

  it("hides (never deletes) photos and phases that hold photos", async () => {
    await seedUser("rep", "medico", "clinic-a", true);
    const cookie = as("rep", "medico", "clinic-a");
    const { phases } = await read(cookie);
    const target = phases[5].views[0];
    await pglite.exec(`INSERT INTO clinical_photos (id, evaluation_id, view_id, original_object_path, original_mime_type, original_bytes, original_sha256)
      VALUES ('p1', 'ev', '${target.id}', 'x', 'image/jpeg', 1, 'h');`);
    expect((await read(cookie)).phases[5].views[0].hasPhotos).toBe(true);
    const next = toInput(phases).slice(0, 5);
    await request(app).put("/api/clinic/protocol").set("Cookie", cookie).send({ phases: next }).expect(200);
    const rows = (await pglite.exec(`SELECT id, active FROM clinical_protocol_phases WHERE protocol_id = 'clinic-a-capillary-initial' ORDER BY position;`)) as Array<{ rows: Array<{ id: string; active: boolean }> }>;
    expect(rows[0].rows).toHaveLength(6);
    expect(rows[0].rows.filter((r) => !r.active)).toHaveLength(1);
    const photos = (await pglite.exec(`SELECT count(*)::int AS n FROM clinical_photos;`)) as Array<{ rows: Array<{ n: number }> }>;
    expect(photos[0].rows[0].n).toBe(1);
    expect((await read(cookie)).phases).toHaveLength(5);
    // The phase with no photos was deleted outright, not hidden.
    const views = (await pglite.exec(`SELECT count(*)::int AS n FROM clinical_protocol_views WHERE phase_id = '${phases[5].id}';`)) as Array<{ rows: Array<{ n: number }> }>;
    expect(views[0].rows[0].n).toBe(1);
  });

  it("validates the structure", async () => {
    await seedUser("rep", "medico", "clinic-a", true);
    const cookie = as("rep", "medico", "clinic-a");
    const { phases } = await read(cookie);
    const put = (body: unknown) => request(app).put("/api/clinic/protocol").set("Cookie", cookie).send(body as object);
    await put({ phases: [] }).expect(400);
    await put({ phases: [{ ...toInput(phases)[0], name: "x" }] }).expect(400);
    const dupPhase = toInput(phases);
    dupPhase[3].name = dupPhase[2].name;
    await put({ phases: dupPhase }).expect(400);
    const dupView = toInput(phases);
    dupView[2].views[1].label = dupView[2].views[0].label;
    await put({ phases: dupView }).expect(400);
    const noViews = toInput(phases);
    noViews[2].views = [];
    await put({ phases: noViews }).expect(400);
    const moved = toInput(phases);
    [moved[0], moved[1]] = [moved[1], moved[0]];
    await put({ phases: moved }).expect(400);
    const foreign = toInput(phases);
    foreign[2].views[0].id = phases[3].views[0].id;
    await put({ phases: foreign }).expect(400);
    const tooMany = [toInput(phases)[0], ...Array.from({ length: 12 }, (_, i) => ({ name: `Fase ${i}`, views: [{ label: "Foto" }] }))];
    await put({ phases: tooMany }).expect(400);
    // The doctor's diagnosis phase cannot be removed.
    await put({ phases: toInput(phases).filter((_, index) => index !== 1) }).expect(400);
    await put({ nothing: true }).expect(400);
  });

  it("is scoped to the clinic: one cannot touch another's structure", async () => {
    await seedUser("rep-a", "medico", "clinic-a", true);
    await seedUser("rep-b", "medico", "clinic-b", true);
    const a = await read(as("rep-a", "medico", "clinic-a"));
    await request(app).put("/api/clinic/protocol").set("Cookie", as("rep-b", "medico", "clinic-b")).send({ phases: toInput(a.phases) }).expect(400);
  });

  it("patients capture only the first phase, and required keys follow its configuration", async () => {
    await seedUser("rep", "medico", "clinic-a", true);
    const cookie = as("rep", "medico", "clinic-a");
    const { phases } = await read(cookie);
    expect((await getPatientPhaseViews("clinic-a-capillary-initial")).views.map((v) => v.key)).toEqual(["frontal", "vertex", "temporalRight", "temporalLeft", "donor"]);
    const next = toInput(phases);
    next[0].views = [...next[0].views.slice(0, 2), { label: "Coronilla" } as never];
    await request(app).put("/api/clinic/protocol").set("Cookie", cookie).send({ phases: next }).expect(200);
    const required = await getRequiredViewKeys("clinic-a-capillary-initial");
    expect(required).toHaveLength(3);
    expect(required.slice(0, 2)).toEqual(["frontal", "vertex"]);
  });
});

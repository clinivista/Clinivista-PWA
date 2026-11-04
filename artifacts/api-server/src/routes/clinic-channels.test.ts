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
import clinicChannelsRouter from "./clinic-channels";
import { createSession } from "../lib/sessions";
import { parseChannels } from "../lib/clinic-channels";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", clinicChannelsRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE clinical_centers (id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar', plan text NOT NULL DEFAULT 'basic', result_channels text NOT NULL DEFAULT 'email,whatsapp', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE users (id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL, password_hash text NOT NULL, name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', role text NOT NULL, center_id text, active boolean NOT NULL DEFAULT true, legal_representative boolean NOT NULL DEFAULT false, reset_token_hash text, reset_token_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  `);
});

beforeEach(async () => {
  await pglite.exec(`TRUNCATE clinical_centers, users;`);
  await pglite.exec(`
    INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-a', 'Clínica A', 'clinic-a'), ('clinic-b', 'Clínica B', 'clinic-b');
    INSERT INTO users (id, email, email_normalized, password_hash, role, center_id) VALUES
      ('adm', 'adm@x.cl', 'adm@x.cl', 'x', 'administrativo', 'clinic-a'),
      ('doc', 'doc@x.cl', 'doc@x.cl', 'x', 'medico', 'clinic-a');
  `);
});

const as = (id: string, role: string, centerId: string) => `clinivista_session=${createSession({ userId: id, centerId, role: role as "medico" })}`;

describe("canales de comunicación de la clínica", () => {
  it("existing clinics start with email and WhatsApp; SMS is listed as coming soon", async () => {
    const res = await request(app).get("/api/clinic/channels").set("Cookie", as("doc", "medico", "clinic-a")).expect(200);
    expect(res.body).toEqual({ channels: ["email", "whatsapp"], available: ["email", "whatsapp"], coming: ["sms"], canEdit: false });
  });

  it("administration chooses the channels; a médico cannot", async () => {
    await request(app).put("/api/clinic/channels").set("Cookie", as("doc", "medico", "clinic-a")).send({ channels: ["email"] }).expect(403);
    const saved = await request(app).put("/api/clinic/channels").set("Cookie", as("adm", "administrativo", "clinic-a")).send({ channels: ["whatsapp"] }).expect(200);
    expect(saved.body.channels).toEqual(["whatsapp"]);
    const read = await request(app).get("/api/clinic/channels").set("Cookie", as("adm", "administrativo", "clinic-a")).expect(200);
    expect(read.body).toMatchObject({ channels: ["whatsapp"], canEdit: true });
    // another clinic is untouched
    await request(app).get("/api/clinic/channels").set("Cookie", as("adm", "administrativo", "clinic-b")).expect(200);
  });

  it("rejects SMS (not available yet), unknown channels and an empty list", async () => {
    const cookie = as("adm", "administrativo", "clinic-a");
    await request(app).put("/api/clinic/channels").set("Cookie", cookie).send({ channels: ["email", "sms"] }).expect(400);
    await request(app).put("/api/clinic/channels").set("Cookie", cookie).send({ channels: ["paloma"] }).expect(400);
    const empty = await request(app).put("/api/clinic/channels").set("Cookie", cookie).send({ channels: [] }).expect(400);
    expect(empty.body.error).toMatch(/al menos un canal/);
    await request(app).put("/api/clinic/channels").send({ channels: ["email"] }).expect(401);
  });

  it("parseChannels ignores unknown values and keeps a fixed order", () => {
    expect(parseChannels("whatsapp, email,sms,x")).toEqual(["email", "whatsapp"]);
    expect(parseChannels("")).toEqual([]);
    expect(parseChannels(null)).toEqual([]);
  });
});

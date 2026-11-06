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
import clinicProfileRouter from "./clinic-profile";
import { createSession } from "../lib/sessions";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown>; query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", clinicProfileRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar', plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'unlimited', 'titanium')), result_channels text NOT NULL DEFAULT 'email,whatsapp',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL,
      password_hash text NOT NULL, name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', role text NOT NULL,
      center_id text, active boolean NOT NULL DEFAULT true,
      legal_representative boolean NOT NULL DEFAULT false,
      reset_token_hash text, reset_token_expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS clinic_profiles (center_id text PRIMARY KEY, country text NOT NULL DEFAULT 'CL', rut text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', whatsapp text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now());
  `);
});

beforeEach(async () => {
  await pglite.exec(`TRUNCATE clinical_centers, users, clinic_profiles;`);
  await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-a', 'Clínica A', 'clinic-a'), ('clinic-b', 'Clínica B', 'clinic-b');`);
  await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, role, center_id, legal_representative) VALUES
    ('rep-a', 'rep@a.cl', 'rep@a.cl', 'x', 'administrativo', 'clinic-a', true),
    ('doc-a', 'doc@a.cl', 'doc@a.cl', 'x', 'medico', 'clinic-a', false),
    ('adm-a', 'adm@a.cl', 'adm@a.cl', 'x', 'administrativo', 'clinic-a', false),
    ('rep-b', 'rep@b.cl', 'rep@b.cl', 'x', 'administrativo', 'clinic-b', true);`);
  await pglite.exec(`INSERT INTO clinic_profiles (center_id, country, rut, address, phone) VALUES ('clinic-a', 'CL', '76.123.456-0', 'Av. Uno 100', '+56 2 2222 3333'), ('clinic-b', 'CL', '77.000.000-0', 'Calle B 5', '+56 2 9999 0000');`);
});

const cookie = (userId: string, role: "medico" | "administrativo", centerId = "clinic-a") => `clinivista_session=${createSession({ userId, centerId, role })}`;
const rep = () => cookie("rep-a", "administrativo");

describe("datos de la clínica para el representante legal", () => {
  it("el representante legal ve su clínica con país y RUT de solo lectura", async () => {
    const res = await request(app).get("/api/clinic/profile").set("Cookie", rep()).expect(200);
    expect(res.body).toEqual({ name: "Clínica A", documentKind: "rut", country: "CL", rut: "76.123.456-0", address: "Av. Uno 100", phone: "+56 2 2222 3333", whatsapp: "", email: "" });
  });

  it("nadie más de la clínica puede verlos ni cambiarlos: ni el médico ni el administrativo", async () => {
    for (const other of [cookie("doc-a", "medico"), cookie("adm-a", "administrativo")]) {
      await request(app).get("/api/clinic/profile").set("Cookie", other).expect(403);
      await request(app).put("/api/clinic/profile").set("Cookie", other).send({ phone: "+56 9 1111 2222" }).expect(403);
    }
    await request(app).get("/api/clinic/profile").expect(401);
    const { rows } = await pglite.query(`SELECT phone FROM clinic_profiles WHERE center_id = 'clinic-a'`);
    expect(rows[0]!.phone).toBe("+56 2 2222 3333");
  });

  it("actualiza teléfono, WhatsApp, correo y dirección sin tocar país ni RUT", async () => {
    const res = await request(app).put("/api/clinic/profile").set("Cookie", rep())
      .send({ address: "  Av. Nueva   200, Providencia ", phone: "+56 2 4444 5555", whatsapp: "+56 9 8888 7777", email: "contacto@clinicaa.cl" }).expect(200);
    expect(res.body).toMatchObject({ address: "Av. Nueva 200, Providencia", phone: "+56 2 4444 5555", whatsapp: "+56 9 8888 7777", email: "contacto@clinicaa.cl", country: "CL", rut: "76.123.456-0" });
    const { rows } = await pglite.query(`SELECT * FROM clinic_profiles WHERE center_id = 'clinic-a'`);
    expect(rows[0]).toMatchObject({ rut: "76.123.456-0", country: "CL", email: "contacto@clinicaa.cl" });
  });

  it("un cambio parcial conserva el resto y el WhatsApp y el correo se pueden quitar", async () => {
    await request(app).put("/api/clinic/profile").set("Cookie", rep()).send({ whatsapp: "+56 9 8888 7777", email: "a@b.cl" }).expect(200);
    const res = await request(app).put("/api/clinic/profile").set("Cookie", rep()).send({ phone: "+56 2 7777 6666" }).expect(200);
    expect(res.body).toMatchObject({ phone: "+56 2 7777 6666", whatsapp: "+56 9 8888 7777", email: "a@b.cl", address: "Av. Uno 100" });
    const cleared = await request(app).put("/api/clinic/profile").set("Cookie", rep()).send({ whatsapp: "", email: "" }).expect(200);
    expect(cleared.body).toMatchObject({ whatsapp: "", email: "" });
  });

  it("el país y el RUT (o pasaporte) solo los cambia soporte: el intento se rechaza y no cambia nada", async () => {
    await request(app).put("/api/clinic/profile").set("Cookie", rep()).send({ rut: "11.111.111-1", phone: "+56 2 4444 5555" }).expect(403);
    await request(app).put("/api/clinic/profile").set("Cookie", rep()).send({ country: "AR" }).expect(403);
    const { rows } = await pglite.query(`SELECT rut, country, phone FROM clinic_profiles WHERE center_id = 'clinic-a'`);
    expect(rows[0]).toMatchObject({ rut: "76.123.456-0", country: "CL", phone: "+56 2 2222 3333" });
  });

  it("valida: teléfono y dirección no pueden quedar vacíos, y el teléfono, el WhatsApp y el correo deben ser válidos", async () => {
    for (const bad of [{ phone: "" }, { phone: "abc" }, { address: "" }, { whatsapp: "hola" }, { email: "sin-arroba" }, { email: "a@b" }, { address: "x".repeat(201) }]) {
      await request(app).put("/api/clinic/profile").set("Cookie", rep()).send(bad).expect(400);
    }
  });

  it("cada representante solo toca su clínica", async () => {
    await request(app).put("/api/clinic/profile").set("Cookie", cookie("rep-b", "administrativo", "clinic-b")).send({ phone: "+56 2 1212 3434" }).expect(200);
    const { rows } = await pglite.query(`SELECT center_id, phone FROM clinic_profiles ORDER BY center_id`);
    expect(rows).toEqual([{ center_id: "clinic-a", phone: "+56 2 2222 3333" }, { center_id: "clinic-b", phone: "+56 2 1212 3434" }]);
  });
});

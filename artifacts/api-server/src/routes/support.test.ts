import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import { vi } from "vitest";

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
import supportRouter from "./support";
import { createSession } from "../lib/sessions";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", supportRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE clinical_centers (id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE users (id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL, password_hash text NOT NULL, name text NOT NULL DEFAULT '', role text NOT NULL, center_id text, active boolean NOT NULL DEFAULT true, legal_representative boolean NOT NULL DEFAULT false, reset_token_hash text, reset_token_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE support_messages (id text PRIMARY KEY, thread_user_id text NOT NULL, center_id text NOT NULL, sender text NOT NULL, sender_user_id text, body text NOT NULL, read_by_other boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
    INSERT INTO clinical_centers (id, name, slug) VALUES ('c1', 'Clínica Uno', 'uno');
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES ('u1', 'a@x.cl', 'a@x.cl', 'x', 'Ana', 'administrativo', 'c1'), ('u2', 'b@x.cl', 'b@x.cl', 'x', 'Beto', 'medico', 'c1');
  `);
});

const staff = (userId: string) => `clinivista_session=${createSession({ userId, centerId: "c1", role: "administrativo" })}`;
const supra = () => `clinivista_session=${createSession({ userId: "d1", centerId: null, role: "director" })}`;

describe("chat de soporte", () => {
  it("exige sesión y rol correcto", async () => {
    await request(app).get("/api/support/messages").expect(401);
    await request(app).get("/api/support/threads").set("Cookie", staff("u1")).expect(403);
    await request(app).post("/api/support/messages").set("Cookie", supra()).send({ body: "hola" }).expect(403);
  });

  it("valida el mensaje", async () => {
    await request(app).post("/api/support/messages").set("Cookie", staff("u1")).send({ body: "   " }).expect(400);
    await request(app).post("/api/support/messages").set("Cookie", staff("u1")).send({ body: "x".repeat(2001) }).expect(400);
  });

  it("el usuario escribe, soporte responde y cada uno ve solo lo suyo", async () => {
    await request(app).post("/api/support/messages").set("Cookie", staff("u1")).send({ body: "No puedo anotar una foto" }).expect(201);
    await request(app).post("/api/support/messages").set("Cookie", staff("u2")).send({ body: "Consulta de Beto" }).expect(201);

    const list = await request(app).get("/api/support/threads").set("Cookie", supra()).expect(200);
    expect(list.body.threads).toHaveLength(2);
    expect(list.body.unread).toBe(2);
    const ana = list.body.threads.find((t: { userId: string }) => t.userId === "u1");
    expect(ana).toMatchObject({ userName: "Ana", centerName: "Clínica Uno", unread: 1 });

    await request(app).get("/api/support/threads/u1/messages?markRead=1").set("Cookie", supra()).expect(200);
    expect((await request(app).get("/api/support/threads").set("Cookie", supra())).body.unread).toBe(1);

    await request(app).post("/api/support/threads/u1/messages").set("Cookie", supra()).send({ body: "Hola Ana, te ayudo" }).expect(201);
    await request(app).post("/api/support/threads/nadie/messages").set("Cookie", supra()).send({ body: "x" }).expect(404);

    expect((await request(app).get("/api/support/unread").set("Cookie", staff("u1"))).body.unread).toBe(1);
    expect((await request(app).get("/api/support/unread").set("Cookie", staff("u2"))).body.unread).toBe(0);
    const mine = await request(app).get("/api/support/messages?markRead=1").set("Cookie", staff("u1")).expect(200);
    expect(mine.body.messages.map((m: { sender: string }) => m.sender)).toEqual(["staff", "support"]);
    expect(mine.body.messages.map((m: { body: string }) => m.body)).not.toContain("Consulta de Beto");
    expect((await request(app).get("/api/support/unread").set("Cookie", staff("u1"))).body.unread).toBe(0);
  });
});

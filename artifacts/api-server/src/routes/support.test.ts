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
    CREATE TABLE users (id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL, password_hash text NOT NULL, name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', role text NOT NULL, center_id text, active boolean NOT NULL DEFAULT true, legal_representative boolean NOT NULL DEFAULT false, reset_token_hash text, reset_token_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE support_messages (id text PRIMARY KEY, thread_user_id text NOT NULL, ticket_id text, center_id text NOT NULL, sender text NOT NULL, sender_user_id text, body text NOT NULL, read_by_other boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE support_tickets (id text PRIMARY KEY, number serial NOT NULL, requester_user_id text NOT NULL, center_id text NOT NULL, subject text NOT NULL, status text NOT NULL DEFAULT 'waiting', language text NOT NULL DEFAULT 'es', created_at timestamptz NOT NULL DEFAULT now(), last_activity_at timestamptz NOT NULL DEFAULT now(), first_response_at timestamptz, resolved_at timestamptz, resolved_by_user_id text, closed_at timestamptz, rating integer, rating_comment text NOT NULL DEFAULT '');
    INSERT INTO clinical_centers (id, name, slug) VALUES ('c1', 'Clínica Uno', 'uno');
    INSERT INTO users (id, email, email_normalized, password_hash, name, phone, role, center_id) VALUES
      ('u1', 'a@x.cl', 'a@x.cl', 'x', 'Ana', '+56 9 1111 2222', 'administrativo', 'c1'),
      ('u2', 'b@x.cl', 'b@x.cl', 'x', 'Beto', '', 'medico', 'c1'),
      ('d1', 'd1@x.cl', 'd1@x.cl', 'x', 'Dora Directora', '', 'director', NULL),
      ('s1', 's1@x.cl', 's1@x.cl', 'x', 'Sergio Soporte', '', 'supra_admin', NULL);
  `);
});

const staff = (userId: string) => `clinivista_session=${createSession({ userId, centerId: "c1", role: "administrativo" })}`;
const supra = (userId = "d1", role: "director" | "supra_admin" = "director") => `clinivista_session=${createSession({ userId, centerId: null, role })}`;
const open = (userId: string, body = "No puedo anotar una foto", subject = "Problema con fotos", language?: string) =>
  request(app).post("/api/support/tickets").set("Cookie", staff(userId)).send({ subject, body, language });

describe("tickets de soporte", () => {
  it("exige sesión y rol correcto", async () => {
    await request(app).get("/api/support/tickets").expect(401);
    await request(app).get("/api/support/queue").set("Cookie", staff("u1")).expect(403);
    await request(app).get("/api/support/alerts").set("Cookie", staff("u1")).expect(403);
    await request(app).post("/api/support/tickets").set("Cookie", supra()).send({ subject: "hola", body: "hola" }).expect(403);
  });

  it("valida el asunto y el mensaje", async () => {
    await open("u2", "   ").expect(400);
    await open("u2", "x".repeat(2001)).expect(400);
    await open("u2", "Consulta", "ab").expect(400);
  });

  it("abrir un ticket crea el aviso automático en el idioma del usuario y queda en espera", async () => {
    const created = await open("u2", "Necesito ayuda con los usuarios", "Usuarios", "en").expect(201);
    expect(created.body).toMatchObject({ status: "waiting", subject: "Usuarios", attendants: [] });
    const conv = await request(app).get(`/api/support/tickets/${created.body.id}/messages`).set("Cookie", staff("u2")).expect(200);
    expect(conv.body.messages.map((m: { sender: string }) => m.sender)).toEqual(["staff", "system"]);
    expect(conv.body.messages[1].body).toMatch(/as soon as possible/);
    // solo un ticket activo a la vez
    await open("u2").expect(409);
    // los datos de cada usuario son suyos
    await request(app).get(`/api/support/tickets/${created.body.id}/messages`).set("Cookie", staff("u1")).expect(404);
    await request(app).post(`/api/support/tickets/${created.body.id}/messages`).set("Cookie", staff("u1")).send({ body: "x" }).expect(404);
  });

  it("flujo completo: espera → varios atienden → resuelto → valoración → historial y chat limpio", async () => {
    const created = await open("u1", "No puedo anotar una foto", "Foto", "es").expect(201);
    const id = created.body.id as string;

    // alerta a los directores mientras espera
    const alert = (await request(app).get("/api/support/alerts").set("Cookie", supra()).expect(200)).body;
    expect(alert.waiting).toBeGreaterThanOrEqual(1);
    expect(alert.items.find((i: { id: string }) => i.id === id)).toMatchObject({ subject: "Foto", requesterName: "Ana", centerName: "Clínica Uno" });

    const queue = (await request(app).get("/api/support/queue").set("Cookie", supra()).expect(200)).body;
    const row = queue.tickets.find((t: { id: string }) => t.id === id);
    expect(row).toMatchObject({ status: "waiting", requesterName: "Ana", requesterPhone: "+56 9 1111 2222", centerName: "Clínica Uno", unread: 1 });

    // responde la directora; luego otro integrante de supra-control
    await request(app).post(`/api/support/queue/${id}/messages`).set("Cookie", supra()).send({ body: "Hola Ana, te ayudo" }).expect(201);
    await request(app).post(`/api/support/queue/${id}/messages`).set("Cookie", supra("s1", "supra_admin")).send({ body: "Soy Sergio, sigo yo" }).expect(201);
    const detail = (await request(app).get(`/api/support/queue/${id}/messages?markRead=1`).set("Cookie", supra()).expect(200)).body;
    expect(detail.ticket.status).toBe("attending");
    expect(detail.ticket.attendants.map((a: { name: string }) => a.name)).toEqual(["Dora Directora", "Sergio Soporte"]);
    expect(detail.ticket.firstResponseAt).toBeTruthy();
    expect(detail.messages.filter((m: { sender: string }) => m.sender === "support").map((m: { senderName: string }) => m.senderName)).toEqual(["Dora Directora", "Sergio Soporte"]);
    expect((await request(app).get("/api/support/alerts").set("Cookie", supra())).body.items.find((i: { id: string }) => i.id === id)).toBeUndefined();

    // el usuario ve lo no leído, escribe y no puede valorar todavía
    expect((await request(app).get("/api/support/unread").set("Cookie", staff("u1"))).body.unread).toBeGreaterThanOrEqual(3);
    await request(app).post(`/api/support/tickets/${id}/messages`).set("Cookie", staff("u1")).send({ body: "Gracias" }).expect(201);
    await request(app).post(`/api/support/tickets/${id}/rating`).set("Cookie", staff("u1")).send({ rating: 5 }).expect(409);

    // supra-control lo resuelve: aviso automático y el chat se cierra
    const resolved = await request(app).post(`/api/support/queue/${id}/resolve`).set("Cookie", supra("s1", "supra_admin")).expect(200);
    expect(resolved.body.status).toBe("resolved");
    await request(app).post(`/api/support/queue/${id}/resolve`).set("Cookie", supra()).expect(409);
    await request(app).post(`/api/support/queue/${id}/messages`).set("Cookie", supra()).send({ body: "x" }).expect(409);
    await request(app).post(`/api/support/tickets/${id}/messages`).set("Cookie", staff("u1")).send({ body: "x" }).expect(409);
    const afterResolve = (await request(app).get(`/api/support/tickets/${id}/messages?markRead=1`).set("Cookie", staff("u1"))).body.messages;
    expect(afterResolve[afterResolve.length - 1]).toMatchObject({ sender: "system" });
    expect(afterResolve[afterResolve.length - 1].body).toMatch(/Sergio Soporte/);
    // resuelto y sin valorar sigue pendiente para el usuario
    expect((await request(app).get("/api/support/unread").set("Cookie", staff("u1"))).body.unread).toBe(1);
    expect((await request(app).get("/api/support/tickets").set("Cookie", staff("u1"))).body.active.status).toBe("resolved");

    // valoración: se valida y cierra
    await request(app).post(`/api/support/tickets/${id}/rating`).set("Cookie", staff("u1")).send({ rating: 0 }).expect(400);
    await request(app).post(`/api/support/tickets/${id}/rating`).set("Cookie", staff("u1")).send({ rating: 6 }).expect(400);
    const rated = await request(app).post(`/api/support/tickets/${id}/rating`).set("Cookie", staff("u1")).send({ rating: 4, comment: "Muy buena atención" }).expect(200);
    expect(rated.body).toMatchObject({ status: "closed", rating: 4, ratingComment: "Muy buena atención" });
    await request(app).post(`/api/support/tickets/${id}/rating`).set("Cookie", staff("u1")).send({ rating: 5 }).expect(409);

    // el chat queda limpio (sin ticket activo) y el cerrado va al historial, legible completo
    const mine = (await request(app).get("/api/support/tickets").set("Cookie", staff("u1")).expect(200)).body;
    expect(mine.active).toBeNull();
    expect(mine.history.map((t: { id: string }) => t.id)).toEqual([id]);
    const old = (await request(app).get(`/api/support/tickets/${id}/messages`).set("Cookie", staff("u1")).expect(200)).body;
    expect(old.messages.length).toBeGreaterThanOrEqual(6);
    expect((await request(app).get("/api/support/unread").set("Cookie", staff("u1"))).body.unread).toBe(0);

    // supra-control lo ve en el historial con la valoración
    const hist = (await request(app).get("/api/support/queue?view=history").set("Cookie", supra()).expect(200)).body;
    expect(hist.tickets.find((t: { id: string }) => t.id === id)).toMatchObject({ rating: 4, status: "closed" });
    expect((await request(app).get("/api/support/queue").set("Cookie", supra())).body.tickets.find((t: { id: string }) => t.id === id)).toBeUndefined();

    // y puede abrir uno nuevo
    await open("u1", "Otra consulta", "Segundo ticket").expect(201);
  });
});

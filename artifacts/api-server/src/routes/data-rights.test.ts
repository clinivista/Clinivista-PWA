import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("@workspace/db", async () => {
  const real = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../../../lib/db/src/schema/index");
  const passwords = await import("../../../../lib/db/src/passwords");
  const client = new real.PGlite();
  const db = drizzle(client, { schema });
  // Crea todas las tablas desde el esquema real, así el test no se desfasa de la base.
  const kit = await import("../../../../lib/db/node_modules/drizzle-kit/api");
  const statements = await kit.generateMigration(kit.generateDrizzleJson({}), kit.generateDrizzleJson(schema as never));
  await client.exec(statements.join("\n"));
  return { ...schema, ...passwords, db, pool: client, __pglite: client };
});

const sent = vi.hoisted(() => [] as Array<{ to: string; subject: string; text: string }>);
vi.mock("../lib/mailer", () => ({ sendMail: async (mail: { to: string; subject: string; text: string }) => { sent.push(mail); } }));

import * as mockedDb from "@workspace/db";
import dataRightsRouter from "./data-rights";
import leadsRouter from "./leads";
import { createSession } from "../lib/sessions";
import { resetThrottleForTests } from "../lib/patient-accounts";
import { PRIVACY_POLICY_VERSION } from "../lib/legal-version";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api", dataRightsRouter);
app.use("/api", leadsRouter);

const cookie = (userId: string, centerId: string) => `clinivista_session=${createSession({ userId, centerId, role: "administrativo" })}`;
const asA = () => cookie("user-a", "clinic-a");
const asB = () => cookie("user-b", "clinic-b");

beforeAll(() => { void PRIVACY_POLICY_VERSION; });
beforeEach(async () => {
  resetThrottleForTests();
  sent.length = 0;
  await pglite.exec(`TRUNCATE users, leads, data_requests, staff_access_events RESTART IDENTITY;`);
  await pglite.exec(`
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES
      ('user-a', 'ana@x.cl', 'ana@x.cl', 'x', 'Ana Admin', 'administrativo', 'clinic-a'),
      ('user-b', 'bea@y.cl', 'bea@y.cl', 'x', 'Bea Admin', 'administrativo', 'clinic-b');
    INSERT INTO leads (id, token, name, phone, center_id, consent) VALUES
      ('lead-a', 'tok-a', 'Paciente Uno', '+56911111111', 'clinic-a', true);
  `);
});

describe("solicitudes de los titulares", () => {
  it("el paciente crea una solicitud con vencimiento a 30 días y la clínica la ve", async () => {
    const created = await request(app).post("/api/patients/tok-a/data-requests").send({ type: "portability", message: "Quiero mis datos" });
    expect(created.status).toBe(201);
    const days = (new Date(created.body.dueAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
    const list = await request(app).get("/api/clinic/data-requests").set("Cookie", asA());
    expect(list.body.requests).toHaveLength(1);
    expect(list.body.requests[0]).toMatchObject({ type: "portability", status: "pending", patientName: "Paciente Uno" });
  });

  it("acepta «retirar mi consentimiento» como solicitud", async () => {
    const created = await request(app).post("/api/patients/tok-a/data-requests").send({ type: "withdrawal", message: "Ya no quiero recibir nada" });
    expect(created.status).toBe(201);
    const list = await request(app).get("/api/clinic/data-requests").set("Cookie", asA());
    expect(list.body.requests[0]).toMatchObject({ type: "withdrawal", status: "pending" });
  });

  it("rechaza tipos inválidos y enlaces desconocidos", async () => {
    expect((await request(app).post("/api/patients/tok-a/data-requests").send({ type: "otro" })).status).toBe(400);
    expect((await request(app).post("/api/patients/nope/data-requests").send({ type: "access" })).status).toBe(404);
  });

  it("limita las solicitudes repetidas desde una misma IP", async () => {
    let last = 0;
    for (let i = 0; i < 11; i += 1) last = (await request(app).post("/api/patients/tok-a/data-requests").send({ type: "access" })).status;
    expect(last).toBe(429);
  });

  it("otra clínica no ve ni responde solicitudes ajenas", async () => {
    const created = await request(app).post("/api/patients/tok-a/data-requests").send({ type: "erasure" });
    expect((await request(app).get("/api/clinic/data-requests").set("Cookie", asB())).body.requests).toHaveLength(0);
    const patch = await request(app).patch(`/api/clinic/data-requests/${created.body.id}`).set("Cookie", asB()).send({ status: "resolved" });
    expect(patch.status).toBe(404);
  });

  it("la clínica resuelve una solicitud y queda quién y cuándo", async () => {
    const created = await request(app).post("/api/patients/tok-a/data-requests").send({ type: "rectification" });
    const patch = await request(app).patch(`/api/clinic/data-requests/${created.body.id}`).set("Cookie", asA()).send({ status: "resolved", note: "Corregido" });
    expect(patch.status).toBe(200);
    expect(patch.body.request).toMatchObject({ status: "resolved", resolvedByName: "Ana Admin", resolutionNote: "Corregido" });
    expect(patch.body.request.resolvedAt).toBeTruthy();
    expect((await request(app).patch(`/api/clinic/data-requests/${created.body.id}`).set("Cookie", asA()).send({ status: "nada" })).status).toBe(400);
  });

  it("exige sesión del personal", async () => {
    expect((await request(app).get("/api/clinic/data-requests")).status).toBe(401);
    expect((await request(app).get("/api/leads/lead-a/data-export")).status).toBe(401);
  });
});

describe("exportación y registro de acceso", () => {
  it("exporta los datos del paciente sin token ni rutas internas y deja constancia", async () => {
    const exported = await request(app).get("/api/leads/lead-a/data-export").set("Cookie", asA());
    expect(exported.status).toBe(200);
    expect(exported.headers["content-disposition"]).toContain("attachment");
    expect(exported.body.patient.name).toBe("Paciente Uno");
    expect(exported.body.patient.token).toBeUndefined();
    expect(JSON.stringify(exported.body)).not.toMatch(/ObjectPath/);
    const log = await request(app).get("/api/leads/lead-a/access-log").set("Cookie", asA());
    expect(log.body.events).toHaveLength(1);
    expect(log.body.events[0]).toMatchObject({ action: "export", userId: "user-a" });
  });

  it("otra clínica no puede exportar ni ver el registro", async () => {
    expect((await request(app).get("/api/leads/lead-a/data-export").set("Cookie", asB())).status).toBe(404);
    expect((await request(app).get("/api/leads/lead-a/access-log").set("Cookie", asB())).status).toBe(404);
  });
});

describe("acceso del personal", () => {
  it("bloquea tras 8 intentos fallidos y no cuenta los accesos correctos", async () => {
    const { default: authRouter } = await import("./auth");
    const authApp = express();
    authApp.use(express.json());
    authApp.use("/api", authRouter);
    const { hashPassword } = await import("../../../../lib/db/src/passwords");
    await pglite.exec(`UPDATE users SET password_hash = '${hashPassword("clave-correcta-1")}' WHERE id = 'user-a';`);
    for (let i = 0; i < 10; i += 1) {
      expect((await request(authApp).post("/api/auth/login").send({ email: "ana@x.cl", password: "clave-correcta-1" })).status).toBe(200);
    }
    for (let i = 0; i < 8; i += 1) {
      expect((await request(authApp).post("/api/auth/login").send({ email: "ana@x.cl", password: "mala" })).status).toBe(401);
    }
    expect((await request(authApp).post("/api/auth/login").send({ email: "ana@x.cl", password: "clave-correcta-1" })).status).toBe(429);
  });
});

describe("consentimiento del paciente", () => {
  it("guarda cuándo y con qué versión de la política se consintió", async () => {
    const { default: patientsRouter } = await import("./patients");
    const patientsApp = express();
    patientsApp.use(express.json());
    patientsApp.use("/api", patientsRouter);
    await pglite.exec(`INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-a', 'Clínica A', 'clinica-a') ON CONFLICT DO NOTHING;`);
    const created = await request(patientsApp).post("/api/patients").send({ name: "Paciente Dos", phone: "+56922222222", documentId: "11.111.111-1", consent: true, clinicSlug: "clinica-a" });
    expect([200, 201]).toContain(created.status);
    const [row] = (await (mockedDb as unknown as { db: { select: () => { from: (t: unknown) => Promise<Array<{ consentAt: Date | null; consentPolicyVersion: string | null; name: string }>> } } }).db.select().from(mockedDb.leadsTable)).filter((lead) => lead.name === "Paciente Dos");
    expect(row.consentAt).toBeInstanceOf(Date);
    expect(row.consentPolicyVersion).toBe(PRIVACY_POLICY_VERSION);
  });
});

describe("seguimiento de las solicitudes por el paciente", () => {
  it("el paciente ve solo sus solicitudes, con estado, plazo y respuesta", async () => {
    await pglite.exec(`INSERT INTO leads (id, token, name, phone, center_id, consent) VALUES ('lead-b', 'tok-b', 'Paciente Dos', '+56922222222', 'clinic-a', true);`);
    const created = await request(app).post("/api/patients/tok-a/data-requests").send({ type: "withdrawal", message: "privado" });
    await request(app).post("/api/patients/tok-b/data-requests").send({ type: "access" });
    await request(app).patch(`/api/clinic/data-requests/${created.body.id}`).set("Cookie", asA()).send({ status: "resolved", note: "Listo, ya no te contactaremos" });
    const own = await request(app).get("/api/patients/tok-a/data-requests");
    expect(own.status).toBe(200);
    expect(own.body.requests).toHaveLength(1);
    expect(own.body.requests[0]).toMatchObject({ type: "withdrawal", status: "resolved", resolutionNote: "Listo, ya no te contactaremos" });
    expect(own.body.requests[0].dueAt).toBeTruthy();
    expect(JSON.stringify(own.body)).not.toMatch(/resolvedByName|leadId|centerId|privado/);
    expect((await request(app).get("/api/patients/nope/data-requests")).status).toBe(404);
  });
});

describe("avisos de vencimiento a la clínica", () => {
  it("avisa una vez cuando faltan 7 días o menos y una vez cuando vence, sin datos del paciente", async () => {
    const { runDataRequestReminders } = await import("../lib/data-rights");
    const created = await request(app).post("/api/patients/tok-a/data-requests").send({ type: "erasure" });
    expect(await runDataRequestReminders("https://app.test", new Date())).toBe(0);
    const in25 = new Date(Date.now() + 25 * 86_400_000);
    expect(await runDataRequestReminders("https://app.test", in25)).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "ana@x.cl", subject: "Solicitud de datos por vencer" });
    expect(sent[0].text).toContain("eliminación");
    expect(sent[0].text).not.toMatch(/Paciente Uno|\+56911111111/);
    expect(await runDataRequestReminders("https://app.test", in25)).toBe(0);
    const in31 = new Date(Date.now() + 31 * 86_400_000);
    expect(await runDataRequestReminders("https://app.test", in31)).toBe(1);
    expect(sent[1].subject).toBe("Solicitud de datos vencida");
    expect(await runDataRequestReminders("https://app.test", in31)).toBe(0);
    await request(app).patch(`/api/clinic/data-requests/${created.body.id}`).set("Cookie", asA()).send({ status: "resolved" });
    expect(await runDataRequestReminders("https://app.test", new Date(Date.now() + 60 * 86_400_000))).toBe(0);
  });

  it("solo avisa a la administración de la clínica correspondiente", async () => {
    const { runDataRequestReminders } = await import("../lib/data-rights");
    await request(app).post("/api/patients/tok-a/data-requests").send({ type: "access" });
    await runDataRequestReminders(undefined, new Date(Date.now() + 29 * 86_400_000));
    expect(sent.map((mail) => mail.to)).toEqual(["ana@x.cl"]);
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import sharp from "sharp";

vi.mock("@workspace/db", async () => {
  const real = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../../../lib/db/src/schema/index");
  const passwords = await import("../../../../lib/db/src/passwords");
  const client = new real.PGlite();
  const db = drizzle(client, { schema });
  const kit = await import("../../../../lib/db/node_modules/drizzle-kit/api");
  const statements = await kit.generateMigration(kit.generateDrizzleJson({}), kit.generateDrizzleJson(schema as never));
  await client.exec(statements.join("\n"));
  return { ...schema, ...passwords, db, pool: client, __pglite: client };
});

import * as mockedDb from "@workspace/db";
import patientsRouter from "./patients";
import patientUpdatesRouter, { patientEditGate } from "./patient-updates";
import dataRightsRouter from "./data-rights";
import leadsRouter from "./leads";
import { createSession } from "../lib/sessions";
import { resetThrottleForTests } from "../lib/patient-accounts";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;
const app = express();
app.use(express.json());
app.use("/api/patients/:token", patientEditGate);
app.use("/api", patientsRouter);
app.use("/api", dataRightsRouter);
app.use("/api", patientUpdatesRouter);
app.use("/api", leadsRouter);

const asA = () => `clinivista_session=${createSession({ userId: "user-a", centerId: "clinic-a", role: "administrativo" })}`;
const asB = () => `clinivista_session=${createSession({ userId: "user-b", centerId: "clinic-b", role: "administrativo" })}`;
const setStatus = (status: string) => pglite.exec(`UPDATE leads SET status = '${status}' WHERE id = 'lead-a';`);
const png = () => sharp({ create: { width: 40, height: 40, channels: 3, background: "#888" } }).png().toBuffer();

beforeEach(async () => {
  resetThrottleForTests();
  await pglite.exec(`TRUNCATE users, leads, patient_updates, patient_additions, clinical_evaluations, clinical_diagnoses RESTART IDENTITY;`);
  await pglite.exec(`
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES
      ('user-a', 'ana@x.cl', 'ana@x.cl', 'x', 'Ana Admin', 'administrativo', 'clinic-a'),
      ('user-b', 'bea@y.cl', 'bea@y.cl', 'x', 'Bea Admin', 'administrativo', 'clinic-b');
    INSERT INTO leads (id, token, name, phone, center_id, consent, status, document_id, document_normalized) VALUES
      ('lead-a', 'tok-a', 'Paciente Uno', '+56911111111', 'clinic-a', true, 'listo', '11.111.111-1', '111111111');
  `);
});

describe("modificar la evaluación", () => {
  it("mientras está en «listo» el paciente puede modificarla y la clínica ve qué cambió", async () => {
    expect((await request(app).get("/api/patients/tok-a/edit-state")).body.locked).toBe(false);
    const put = await request(app).put("/api/patients/tok-a").send({
      name: "Paciente Uno", phone: "+56911111111", documentId: "11.111.111-1", consent: true, city: "Santiago", deliveryChannel: "whatsapp",
    });
    expect(put.status).toBe(200);
    const updates = await request(app).get("/api/leads/lead-a/patient-updates").set("Cookie", asA());
    expect(updates.body.updates).toHaveLength(1);
    expect(updates.body.updates[0].kind).toBe("data");
    expect(updates.body.updates[0].details.changes.city).toEqual({ from: "", to: "Santiago" });
    expect((await request(app).get("/api/clinic/patient-updates/summary").set("Cookie", asA())).body.unseen).toEqual({ "lead-a": 1 });
  });

  it("no registra cambios mientras la evaluación todavía no se envía", async () => {
    await setStatus("incompleto");
    await request(app).put("/api/patients/tok-a").send({ name: "Otro Nombre", phone: "+56911111111", documentId: "11.111.111-1", consent: true });
    expect((await request(app).get("/api/leads/lead-a/patient-updates").set("Cookie", asA())).body.updates).toHaveLength(0);
  });

  it("cuando la clínica ya la revisa (estado posterior a «listo») se cierra la edición", async () => {
    await setStatus("contactar");
    expect((await request(app).get("/api/patients/tok-a/edit-state")).body.locked).toBe(true);
    const put = await request(app).put("/api/patients/tok-a").send({ name: "X", phone: "+56911111111", documentId: "11.111.111-1", consent: true });
    expect(put.status).toBe(423);
    expect(put.body.locked).toBe(true);
    expect((await request(app).delete("/api/patients/tok-a/photos")).status).toBe(423);
    expect((await request(app).post("/api/patients/tok-a/photos").set("Content-Type", "image/png").send(await png())).status).toBe(423);
  });

  it("un diagnóstico, aunque sea borrador, también cierra la edición", async () => {
    await pglite.exec(`
      INSERT INTO clinical_evaluations (id, lead_id, center_id) VALUES ('ev-a', 'lead-a', 'clinic-a');
      INSERT INTO clinical_diagnoses (id, evaluation_id, status) VALUES ('dx-a', 'ev-a', 'draft');
    `);
    expect((await request(app).get("/api/patients/tok-a/edit-state")).body.locked).toBe(true);
  });

  it("lo que sigue disponible al estar en revisión: leer, derechos sobre los datos e información adicional", async () => {
    await setStatus("contactar");
    expect((await request(app).get("/api/patients/tok-a")).status).toBe(200);
    expect((await request(app).post("/api/patients/tok-a/data-requests").send({ type: "rectification" })).status).toBe(201);
  });
});

describe("información adicional", () => {
  it("solo se envía cuando la evaluación está en revisión", async () => {
    const open = await request(app).post("/api/patients/tok-a/additions").send({ note: "Una foto más" });
    expect(open.status).toBe(409);
    expect(open.body.locked).toBe(false);
  });

  it("el paciente envía nota y fotos sin sobrescribir nada y la clínica las revisa", async () => {
    await setStatus("contactar");
    const created = await request(app).post("/api/patients/tok-a/additions").send({ note: "Me salió una mancha nueva" });
    expect(created.status).toBe(201);
    const file = await request(app).post(`/api/patients/tok-a/additions/${created.body.id}/files`).set("Content-Type", "image/png").send(await png());
    expect(file.status).toBe(201);

    const state = await request(app).get("/api/patients/tok-a/edit-state");
    expect(state.body.additions).toHaveLength(1);
    expect(state.body.additions[0]).toMatchObject({ status: "pending", fileCount: 1, note: "Me salió una mancha nueva" });

    const updates = await request(app).get("/api/leads/lead-a/patient-updates").set("Cookie", asA());
    expect(updates.body.additions[0].files).toHaveLength(1);
    expect(updates.body.updates.some((u: { kind: string }) => u.kind === "addition")).toBe(true);
    expect(JSON.stringify(updates.body)).not.toMatch(/objectPath/);

    const image = await request(app).get(`/api/leads/lead-a/additions/${created.body.id}/files/0`).set("Cookie", asA());
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toMatch(/image\/png/);

    const resolved = await request(app).patch(`/api/leads/lead-a/additions/${created.body.id}`).set("Cookie", asA()).send({ status: "incorporated" });
    expect(resolved.status).toBe(200);
    const after = await request(app).get("/api/leads/lead-a/patient-updates").set("Cookie", asA());
    expect(after.body.additions[0]).toMatchObject({ status: "incorporated", resolvedByName: "Ana Admin" });
    expect((await request(app).get("/api/clinic/patient-updates/summary").set("Cookie", asA())).body.unseen).toEqual({});
  });

  it("limita las fotos de un envío y rechaza archivos que no son imágenes", async () => {
    await setStatus("contactar");
    const created = await request(app).post("/api/patients/tok-a/additions").send({ note: "" });
    const bytes = await png();
    for (let i = 0; i < 4; i += 1) {
      expect((await request(app).post(`/api/patients/tok-a/additions/${created.body.id}/files`).set("Content-Type", "image/png").send(bytes)).status).toBe(201);
    }
    expect((await request(app).post(`/api/patients/tok-a/additions/${created.body.id}/files`).set("Content-Type", "image/png").send(bytes)).status).toBe(409);
    expect((await request(app).post(`/api/patients/tok-a/additions/${created.body.id}/files`).set("Content-Type", "image/png").send(Buffer.from("no es imagen"))).status).toBe(400);
  });

  it("otra clínica no ve ni resuelve las novedades de un paciente ajeno", async () => {
    await setStatus("contactar");
    const created = await request(app).post("/api/patients/tok-a/additions").send({ note: "hola" });
    expect((await request(app).get("/api/leads/lead-a/patient-updates").set("Cookie", asB())).status).toBe(404);
    expect((await request(app).patch(`/api/leads/lead-a/additions/${created.body.id}`).set("Cookie", asB()).send({ status: "dismissed" })).status).toBe(404);
    expect((await request(app).get(`/api/leads/lead-a/additions/${created.body.id}/files/0`).set("Cookie", asB())).status).toBe(404);
    expect((await request(app).get("/api/clinic/patient-updates/summary")).status).toBe(401);
  });

  it("eliminar la ficha elimina también las novedades y los envíos adicionales", async () => {
    await setStatus("contactar");
    await request(app).post("/api/patients/tok-a/additions").send({ note: "hola" });
    const del = await request(app).delete("/api/leads/lead-a").set("Cookie", asA());
    expect(del.status).toBe(200);
    const left = await (mockedDb as unknown as { db: { select(): { from(t: unknown): Promise<unknown[]> } } }).db.select().from((mockedDb as never as { patientAdditionsTable: unknown }).patientAdditionsTable);
    expect(left).toHaveLength(0);
  });

  it("la exportación del paciente incluye sus cambios y envíos sin rutas internas", async () => {
    await setStatus("contactar");
    await request(app).post("/api/patients/tok-a/additions").send({ note: "hola" });
    const exported = await request(app).get("/api/leads/lead-a/data-export").set("Cookie", asA());
    expect(exported.body.patientAdditions).toHaveLength(1);
    expect(JSON.stringify(exported.body)).not.toMatch(/objectPath/i);
  });
});

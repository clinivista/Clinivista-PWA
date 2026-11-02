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

const sent = vi.hoisted(() => [] as Array<{ to: string; subject: string; text: string }>);
vi.mock("../lib/mailer", async (importOriginal) => {
  const real = await importOriginal<typeof import("../lib/mailer")>();
  return { ...real, sendMail: vi.fn(async (mail: { to: string; subject: string; text: string }) => { sent.push(mail); }) };
});

import * as mockedDb from "@workspace/db";
import photoConsentsRouter from "./photo-consents";
import dataRightsRouter from "./data-rights";
import leadsRouter from "./leads";
import { createSession } from "../lib/sessions";
import { resetThrottleForTests } from "../lib/patient-accounts";
import { PHOTO_CONSENT_VERSION } from "../lib/photo-consent-text";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown>; query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }> } }).__pglite;
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use("/api", photoConsentsRouter);
app.use("/api", dataRightsRouter);
app.use("/api", leadsRouter);

const asA = () => `clinivista_session=${createSession({ userId: "user-a", centerId: "clinic-a", role: "administrativo" })}`;
const asB = () => `clinivista_session=${createSession({ userId: "user-b", centerId: "clinic-b", role: "administrativo" })}`;
const tokenOf = (url: string) => url.split("/").pop()!;
const png = () => sharp({ create: { width: 40, height: 40, channels: 3, background: "#888" } }).png().toBuffer();
const signatureDataUrl = async () => `data:image/png;base64,${(await sharp({ create: { width: 200, height: 80, channels: 4, background: "#000" } }).png().toBuffer()).toString("base64")}`;
const codeFromMail = () => /\b(\d{6})\b/.exec(sent[sent.length - 1].text)![1];

beforeEach(async () => {
  resetThrottleForTests();
  sent.length = 0;
  await pglite.exec(`TRUNCATE users, leads, photo_consents, clinical_centers RESTART IDENTITY;`);
  await pglite.exec(`
    INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-a', 'Clínica Uno', 'uno') ON CONFLICT DO NOTHING;
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES
      ('user-a', 'ana@x.cl', 'ana@x.cl', 'x', 'Ana Admin', 'administrativo', 'clinic-a'),
      ('user-b', 'bea@y.cl', 'bea@y.cl', 'x', 'Bea Admin', 'administrativo', 'clinic-b');
    INSERT INTO leads (id, token, name, phone, email, center_id, consent, status, language) VALUES
      ('lead-a', 'tok-a', 'Paciente Uno', '+56911111111', 'paciente@correo.cl', 'clinic-a', true, 'listo', 'es'),
      ('lead-n', 'tok-n', 'Sin Correo', '+56922222222', '', 'clinic-a', true, 'listo', 'en');
  `);
});

describe("autorización por enlace", () => {
  it("el enlace por correo se acepta con un código que llega al correo y guarda la prueba", async () => {
    const req = await request(app).post("/api/leads/lead-a/photo-consent/request").set("Cookie", asA()).send({ channel: "email", language: "es" });
    expect(req.status).toBe(201);
    expect(req.body.emailSent).toBe(true);
    expect(sent[0]).toMatchObject({ to: "paciente@correo.cl" });
    expect(sent[0].subject).toMatch(/Autorización de fotografías/);
    expect(sent[0].text).toContain(req.body.url);
    const token = tokenOf(req.body.url);

    const view = await request(app).get(`/api/consents/photo/${token}`);
    expect(view.body).toMatchObject({ state: "open", clinicName: "Clínica Uno", requiresCode: true });
    expect(view.body).toHaveProperty("clinicLogo");
    expect(view.body.patientName).toBeTruthy();
    expect(view.body.points.length).toBeGreaterThanOrEqual(5);
    expect(view.body.maskedEmail).toMatch(/^pa•+@correo\.cl$/);

    const early = await request(app).post(`/api/consents/photo/${token}/accept`).send({ language: "es" });
    expect(early.body.code).toBe("code_required");
    expect((await request(app).post(`/api/consents/photo/${token}/code`).send({})).status).toBe(200);
    const wrong = await request(app).post(`/api/consents/photo/${token}/accept`).send({ code: "000000" === codeFromMail() ? "111111" : "000000" });
    expect(wrong.body.code).toBe("code_wrong");
    const ok = await request(app).post(`/api/consents/photo/${token}/accept`).set("User-Agent", "Test-Phone").send({ language: "es", code: codeFromMail() });
    expect(ok.status).toBe(200);

    const list = await request(app).get("/api/leads/lead-a/photo-consent").set("Cookie", asA());
    expect(list.body.consents[0]).toMatchObject({ method: "link", status: "granted", verifiedBy: "email_code", textVersion: PHOTO_CONSENT_VERSION, requestedByName: "Ana Admin" });
    expect(JSON.stringify(list.body)).not.toMatch(/tokenHash|codeHash|objectPath/);
    const row = (await pglite.query(`SELECT ip, user_agent, text_snapshot, code_hash FROM photo_consents`)).rows[0];
    expect(row.user_agent).toBe("Test-Phone");
    expect(String(row.text_snapshot)).toContain("Clínica Uno");
    expect(row.code_hash).toBeNull();
    expect((await request(app).get(`/api/consents/photo/${token}`)).body.state).toBe("done");
  });

  it("bloquea el código tras 5 intentos fallidos y no acepta un código vencido", async () => {
    const req = await request(app).post("/api/leads/lead-a/photo-consent/request").set("Cookie", asA()).send({ channel: "link" });
    const token = tokenOf(req.body.url);
    await request(app).post(`/api/consents/photo/${token}/code`).send({});
    const real = codeFromMail();
    const wrongCode = real === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i += 1) expect((await request(app).post(`/api/consents/photo/${token}/accept`).send({ code: wrongCode })).body.code).toBe("code_wrong");
    expect((await request(app).post(`/api/consents/photo/${token}/accept`).send({ code: real })).body.code).toBe("too_many_attempts");
    await pglite.exec(`UPDATE photo_consents SET code_attempts = 0, code_expires_at = now() - interval '1 minute'`);
    expect((await request(app).post(`/api/consents/photo/${token}/accept`).send({ code: real })).body.code).toBe("code_expired");
  });

  it("sin correo, el enlace se acepta sin código (evidencia más débil) y queda anotado así", async () => {
    const req = await request(app).post("/api/leads/lead-n/photo-consent/request").set("Cookie", asA()).send({ channel: "whatsapp", language: "en" });
    expect(req.body.whatsappText).toContain(req.body.url);
    expect(req.body.whatsappText).toMatch(/authorization/i);
    const token = tokenOf(req.body.url);
    expect((await request(app).get(`/api/consents/photo/${token}`)).body.requiresCode).toBe(false);
    expect((await request(app).post(`/api/consents/photo/${token}/code`).send({})).status).toBe(422);
    expect((await request(app).post(`/api/consents/photo/${token}/accept`).send({ language: "en" })).status).toBe(200);
    expect((await request(app).get("/api/leads/lead-n/photo-consent").set("Cookie", asA())).body.consents[0].verifiedBy).toBe("link");
  });

  it("el paciente puede rechazar; un enlace nuevo cancela el anterior; un enlace vencido no sirve", async () => {
    const first = await request(app).post("/api/leads/lead-n/photo-consent/request").set("Cookie", asA()).send({ channel: "link" });
    const second = await request(app).post("/api/leads/lead-n/photo-consent/request").set("Cookie", asA()).send({ channel: "link" });
    expect((await request(app).get(`/api/consents/photo/${tokenOf(first.body.url)}`)).body.state).toBe("invalid");
    expect((await request(app).post(`/api/consents/photo/${tokenOf(second.body.url)}/decline`)).status).toBe(200);
    expect((await request(app).get("/api/leads/lead-n/photo-consent").set("Cookie", asA())).body.consents[0].status).toBe("declined");
    const third = await request(app).post("/api/leads/lead-n/photo-consent/request").set("Cookie", asA()).send({ channel: "link" });
    await pglite.exec(`UPDATE photo_consents SET expires_at = now() - interval '1 day' WHERE status = 'pending'`);
    expect((await request(app).get(`/api/consents/photo/${tokenOf(third.body.url)}`)).body.state).toBe("invalid");
    expect((await request(app).post(`/api/consents/photo/${tokenOf(third.body.url)}/accept`).send({})).status).toBe(404);
  });

  it("pide correo solo si el paciente lo tiene y rechaza canales inválidos", async () => {
    expect((await request(app).post("/api/leads/lead-n/photo-consent/request").set("Cookie", asA()).send({ channel: "email" })).status).toBe(422);
    expect((await request(app).post("/api/leads/lead-a/photo-consent/request").set("Cookie", asA()).send({ channel: "sms" })).status).toBe(400);
  });
});

describe("documento firmado y firma en tableta", () => {
  it("la clínica sube el documento firmado (PDF o imagen) con su nombre y queda quién y cuándo", async () => {
    const pdf = Buffer.from("%PDF-1.4\n%contenido de prueba\n");
    const up = await request(app).post("/api/leads/lead-a/photo-consent/document").set("Cookie", asA()).set("Content-Type", "application/pdf")
      .set("X-Document-Label", encodeURIComponent("Formulario clínica v3")).send(pdf);
    expect(up.status).toBe(201);
    expect(up.body.consent).toMatchObject({ method: "document", status: "granted", textVersion: "Formulario clínica v3", registeredByName: "Ana Admin", hasFile: true });
    const file = await request(app).get(`/api/leads/lead-a/photo-consent/${up.body.consent.id}/file`).set("Cookie", asA());
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toMatch(/pdf/);
    const img = await request(app).post("/api/leads/lead-a/photo-consent/document").set("Cookie", asA()).set("Content-Type", "image/png").send(await png());
    expect(img.status).toBe(201);
  });

  it("rechaza archivos que no son PDF ni imagen", async () => {
    const bad = await request(app).post("/api/leads/lead-a/photo-consent/document").set("Cookie", asA()).set("Content-Type", "application/pdf").send(Buffer.from("no es un pdf"));
    expect(bad.status).toBe(400);
    const worse = await request(app).post("/api/leads/lead-a/photo-consent/document").set("Cookie", asA()).set("Content-Type", "image/png").send(Buffer.from("tampoco"));
    expect(worse.status).toBe(400);
  });

  it("firma en tableta: guarda la firma, el texto aceptado y quién la registró; sin firma o sin aceptación no vale", async () => {
    const signature = await signatureDataUrl();
    expect((await request(app).post("/api/leads/lead-a/photo-consent/tablet").set("Cookie", asA()).send({ language: "es", accepted: false, signature })).status).toBe(400);
    expect((await request(app).post("/api/leads/lead-a/photo-consent/tablet").set("Cookie", asA()).send({ language: "es", accepted: true, signature: "data:image/png;base64,AAAA" })).status).toBe(400);
    const ok = await request(app).post("/api/leads/lead-a/photo-consent/tablet").set("Cookie", asA()).send({ language: "es", accepted: true, signature });
    expect(ok.status).toBe(201);
    expect(ok.body.consent).toMatchObject({ method: "tablet", status: "granted", verifiedBy: "in_clinic", textVersion: PHOTO_CONSENT_VERSION, registeredByName: "Ana Admin" });
    const row = (await pglite.query(`SELECT text_snapshot FROM photo_consents`)).rows[0];
    expect(String(row.text_snapshot)).toContain("He leído esta autorización");
    const image = await request(app).get(`/api/leads/lead-a/photo-consent/${ok.body.consent.id}/file`).set("Cookie", asA());
    expect(image.headers["content-type"]).toMatch(/png/);
  });

  it("revocar deja constancia y la autorización deja de contar como vigente", async () => {
    const up = await request(app).post("/api/leads/lead-a/photo-consent/document").set("Cookie", asA()).set("Content-Type", "image/png").send(await png());
    const revoke = await request(app).post(`/api/leads/lead-a/photo-consent/${up.body.consent.id}/revoke`).set("Cookie", asA()).send({ note: "Lo pidió por teléfono" });
    expect(revoke.status).toBe(200);
    const list = await request(app).get("/api/leads/lead-a/photo-consent").set("Cookie", asA());
    expect(list.body.consents[0]).toMatchObject({ status: "revoked", revokeNote: "Lo pidió por teléfono" });
    expect((await request(app).post(`/api/leads/lead-a/photo-consent/${up.body.consent.id}/revoke`).set("Cookie", asA()).send({})).status).toBe(404);
  });
});

describe("permisos y datos", () => {
  it("otra clínica no ve, sube, firma ni descarga; sin sesión no se entra", async () => {
    const up = await request(app).post("/api/leads/lead-a/photo-consent/document").set("Cookie", asA()).set("Content-Type", "image/png").send(await png());
    expect((await request(app).get("/api/leads/lead-a/photo-consent").set("Cookie", asB())).status).toBe(404);
    expect((await request(app).post("/api/leads/lead-a/photo-consent/request").set("Cookie", asB()).send({ channel: "link" })).status).toBe(404);
    expect((await request(app).post("/api/leads/lead-a/photo-consent/tablet").set("Cookie", asB()).send({ accepted: true, signature: await signatureDataUrl() })).status).toBe(404);
    expect((await request(app).get(`/api/leads/lead-a/photo-consent/${up.body.consent.id}/file`).set("Cookie", asB())).status).toBe(404);
    expect((await request(app).get("/api/leads/lead-a/photo-consent")).status).toBe(401);
    expect((await request(app).get("/api/consents/photo/no-existe")).body.state).toBe("invalid");
  });

  it("el texto para la tableta existe en los nueve idiomas con el nombre de la clínica", async () => {
    for (const lang of ["es", "en", "pt", "fr", "de", "it", "tr", "ar", "zh"]) {
      const res = await request(app).get(`/api/leads/lead-a/photo-consent/text?lang=${lang}`).set("Cookie", asA());
      expect(res.body.language).toBe(lang);
      expect(res.body.intro).toContain("Clínica Uno");
      expect(res.body.points).toHaveLength(6);
      expect(res.body.checkbox.length).toBeGreaterThan(20);
    }
  });

  it("se incluye en la exportación del paciente y se elimina junto con la ficha", async () => {
    await request(app).post("/api/leads/lead-a/photo-consent/document").set("Cookie", asA()).set("Content-Type", "image/png").send(await png());
    const exported = await request(app).get("/api/leads/lead-a/data-export").set("Cookie", asA());
    expect(exported.body.photoConsents).toHaveLength(1);
    expect(JSON.stringify(exported.body)).not.toMatch(/objectPath/i);
    expect((await request(app).delete("/api/leads/lead-a").set("Cookie", asA())).status).toBe(200);
    expect(Number((await pglite.query(`SELECT count(*)::int AS n FROM photo_consents`)).rows[0].n)).toBe(0);
  });
});

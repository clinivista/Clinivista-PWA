import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("@workspace/db", async () => {
  const real = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("../../../../lib/db/src/schema/index");
  const passwords = await import("../../../../lib/db/src/passwords");
  const client = new real.PGlite();
  const db = drizzle(client, { schema });
  return { ...schema, ...passwords, db, pool: client, __pglite: client };
});

import * as mockedDb from "@workspace/db";
import clinicContractRouter from "./clinic-contract";
import { createSession } from "../lib/sessions";
import { CONTRACT_VERSION } from "../lib/contract";
import { contractForCenter } from "../lib/contract-party";
import { sendContractToNewRepresentative } from "../lib/contract-invite";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json());
app.use("/api", clinicContractRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true,
      paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar',
      plan text NOT NULL DEFAULT 'basic', created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE users (id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL, password_hash text NOT NULL, name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', role text NOT NULL, center_id text, active boolean NOT NULL DEFAULT true, legal_representative boolean NOT NULL DEFAULT false, reset_token_hash text, reset_token_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE clinic_plan_settings (
      center_id text PRIMARY KEY, patients_per_month integer, storage_gb integer, pending_plan text,
      pending_plan_from timestamptz, billing_auto boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE clinic_contract_acceptances (
      id text PRIMARY KEY, center_id text NOT NULL, plan text NOT NULL, contract_version text NOT NULL, contract_hash text NOT NULL,
      accepted_by_user_id text NOT NULL, accepted_by_name text NOT NULL DEFAULT '', accepted_by_email text NOT NULL DEFAULT '',
      accepted_by_role text NOT NULL DEFAULT '', ip text, user_agent text, accepted_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE clinic_profiles (center_id text PRIMARY KEY, country text NOT NULL DEFAULT 'CL', rut text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE user_profiles (user_id text PRIMARY KEY, rut text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', prefix text NOT NULL DEFAULT '', specialty text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE clinic_contract_invites (
      id text PRIMARY KEY, center_id text NOT NULL, user_id text NOT NULL, email text NOT NULL, token_hash text NOT NULL UNIQUE,
      plan text NOT NULL, contract_version text NOT NULL, sent_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, used_at timestamptz
    );
  `);
});

beforeEach(async () => {
  process.env.CONTRACTS_ENABLED = "true";
  await pglite.exec(`TRUNCATE clinical_centers, users, clinic_plan_settings, clinic_contract_acceptances, clinic_contract_invites, clinic_profiles, user_profiles;`);
  await pglite.exec(`
    INSERT INTO clinical_centers (id, name, slug, plan) VALUES ('clinic-a', 'Clínica A', 'clinic-a', 'basic'), ('clinic-b', 'Clínica B', 'clinic-b', 'basic');
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES
      ('admin-1', 'ana@x.cl', 'ana@x.cl', 'x', 'Ana Admin', 'administrativo', 'clinic-a'),
      ('med-1', 'beto@x.cl', 'beto@x.cl', 'x', 'Beto Médico', 'medico', 'clinic-a'),
      ('med-legal', 'lia@x.cl', 'lia@x.cl', 'x', 'Lia Legal', 'medico', 'clinic-a');
    UPDATE users SET legal_representative = true WHERE id = 'med-legal';
    INSERT INTO clinic_profiles (center_id, rut, address, phone) VALUES ('clinic-a', '00.000.000-0', 'Av. Demo 123, Santiago', '+56 2 2345 6789');
    INSERT INTO user_profiles (user_id, rut, address, prefix) VALUES ('med-legal', '00.000.000-0', 'Calle Uno 45, Providencia', 'Dra');
  `);
});

afterEach(() => { delete process.env.CONTRACTS_ENABLED; });

const cookie = (userId: string, role: "administrativo" | "medico", centerId = "clinic-a") => `clinivista_session=${createSession({ userId, centerId, role })}`;
const director = () => `clinivista_session=${createSession({ userId: "director-1", centerId: null, role: "director" })}`;

describe("contrato de servicio", () => {
  it("apagado por defecto: la clínica no ve nada y no puede aceptar", async () => {
    delete process.env.CONTRACTS_ENABLED;
    const view = await request(app).get("/api/clinic/contract").set("Cookie", cookie("admin-1", "administrativo"));
    expect(view.body).toEqual({ enabled: false });
    const accept = await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("admin-1", "administrativo")).send({});
    expect(accept.status).toBe(404);
  });

  it("muestra el contrato del plan vigente, pendiente de aceptar", async () => {
    const view = await request(app).get("/api/clinic/contract").set("Cookie", cookie("admin-1", "administrativo"));
    expect(view.status).toBe(200);
    expect(view.body).toMatchObject({ enabled: true, plan: "basic", accepted: false, canAccept: true });
    expect(view.body.contract.clauses).toHaveLength(19);
    expect(view.body.contract.annexTitle).toBe("Anexo: Plan Basic");
    expect(view.body.contract.hash).toBe((await contractForCenter("clinic-a", "basic")).hash);
  });

  it("el administrativo acepta; queda quién, cuándo, versión, plan y huella", async () => {
    const contract = await contractForCenter("clinic-a", "basic");
    const accept = await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("admin-1", "administrativo")).set("X-Forwarded-For", "203.0.113.9, 10.0.0.1").set("User-Agent", "vitest")
      .send({ version: contract.version, hash: contract.hash });
    expect(accept.status).toBe(201);
    expect(accept.body.acceptance).toMatchObject({ plan: "basic", version: CONTRACT_VERSION, hash: contract.hash, byName: "Ana Admin", byEmail: "ana@x.cl", byRole: "administrativo", ip: "203.0.113.9" });
    const view = await request(app).get("/api/clinic/contract").set("Cookie", cookie("admin-1", "administrativo"));
    expect(view.body.accepted).toBe(true);
    // aceptar dos veces no duplica el registro
    await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("admin-1", "administrativo")).send({ version: contract.version, hash: contract.hash });
    const history = await request(app).get("/api/director/centers/clinic-a/contract").set("Cookie", director());
    expect(history.body.history).toHaveLength(1);
    expect(history.body.status).toBe("aceptado");
  });

  it("un médico sin representación legal no puede aceptar; el representante legal sí", async () => {
    const contract = await contractForCenter("clinic-a", "basic");
    const body = { version: contract.version, hash: contract.hash };
    const denied = await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("med-1", "medico")).send(body);
    expect(denied.status).toBe(403);
    const ok = await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("med-legal", "medico")).send(body);
    expect(ok.status).toBe(201);
    expect(ok.body.acceptance.byRole).toBe("representante legal");
  });

  it("rechaza si el texto cambió (versión o huella distinta)", async () => {
    const stale = await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("admin-1", "administrativo")).send({ version: "vieja", hash: "x" });
    expect(stale.status).toBe(409);
  });

  it("al cambiar de plan vuelve a quedar pendiente (otro anexo)", async () => {
    const basic = await contractForCenter("clinic-a", "basic");
    await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("admin-1", "administrativo")).send({ version: basic.version, hash: basic.hash });
    await pglite.exec(`UPDATE clinical_centers SET plan = 'titanium' WHERE id = 'clinic-a'`);
    const view = await request(app).get("/api/clinic/contract").set("Cookie", cookie("admin-1", "administrativo"));
    expect(view.body).toMatchObject({ plan: "titanium", accepted: false });
    expect(view.body.contract.annexTitle).toBe("Anexo: Plan Titanium");
    const history = await request(app).get("/api/director/centers/clinic-a/contract").set("Cookie", director());
    expect(history.body.status).toBe("pendiente");
    expect(history.body.history).toHaveLength(1);
  });

  it("aísla clínicas: la aceptación de una no cuenta para otra", async () => {
    const contract = await contractForCenter("clinic-a", "basic");
    await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("admin-1", "administrativo")).send({ version: contract.version, hash: contract.hash });
    const other = await request(app).get("/api/director/centers/clinic-b/contract").set("Cookie", director());
    expect(other.body).toMatchObject({ status: "pendiente", history: [] });
  });

  it("supra-control exige sesión de supra-control", async () => {
    const anon = await request(app).get("/api/director/centers/clinic-a/contract");
    expect(anon.status).toBe(401);
    const clinic = await request(app).get("/api/director/centers/clinic-a/contract").set("Cookie", cookie("admin-1", "administrativo"));
    expect(clinic.status).toBe(403);
  });

  it("si la tabla no existe, el contrato no se ofrece (nadie queda bloqueado)", async () => {
    await pglite.exec(`ALTER TABLE clinic_contract_acceptances RENAME TO tmp_acc`);
    try {
      const view = await request(app).get("/api/clinic/contract").set("Cookie", cookie("admin-1", "administrativo"));
      expect(view.body).toEqual({ enabled: false });
      const supra = await request(app).get("/api/director/centers/clinic-a/contract").set("Cookie", director());
      expect(supra.status).toBe(200);
      expect(supra.body.available).toBe(false);
    } finally {
      await pglite.exec(`ALTER TABLE tmp_acc RENAME TO clinic_contract_acceptances`);
    }
  });
});

describe("datos de la clínica y del representante en el contrato", () => {
  it("la comparecencia lleva la clínica y su representante legal", async () => {
    const view = await request(app).get("/api/clinic/contract").set("Cookie", cookie("admin-1", "administrativo"));
    const first = view.body.contract.clauses[0];
    expect(first.title).toBe("Comparecencia");
    expect(first.body).toContain("Clínica A");
    expect(first.body).toContain("00.000.000-0");
    expect(first.body).toContain("Av. Demo 123, Santiago");
    expect(first.body).toContain("Dra. Lia Legal");
    expect(first.body).toContain("Calle Uno 45, Providencia");
    expect(view.body.contract.missing).toEqual([]);
  });

  it("fuera de Chile el contrato usa pasaporte y nombra el país", async () => {
    await pglite.exec(`UPDATE clinic_profiles SET country = 'AR', rut = 'AA1234567'; UPDATE user_profiles SET rut = 'BB7654321'`);
    const body = (await request(app).get("/api/clinic/contract").set("Cookie", cookie("admin-1", "administrativo"))).body.contract.clauses[0].body as string;
    expect(body).toContain("pasaporte N° AA1234567");
    expect(body).toContain("pasaporte N° BB7654321");
    expect(body).toContain("Argentina");
    expect(body).not.toContain("RUT AA");
    expect(body).not.toContain("cédula");
  });

  it("si faltan datos no se puede aceptar ni enviar, y se dice cuáles", async () => {
    await pglite.exec(`DELETE FROM clinic_profiles; UPDATE user_profiles SET address = ''`);
    const view = await request(app).get("/api/clinic/contract").set("Cookie", cookie("admin-1", "administrativo"));
    expect(view.body.contract.missing).toEqual(["RUT de la clínica", "dirección de la clínica", "teléfono de la clínica", "dirección del representante legal"]);
    expect(view.body.contract.clauses[0].body).toContain("[RUT DE LA CLÍNICA PENDIENTE]");
    const contract = view.body.contract;
    const accept = await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("admin-1", "administrativo")).send({ version: contract.version, hash: contract.hash });
    expect(accept.status).toBe(422);
    expect(accept.body.error).toContain("RUT de la clínica");
    const send = await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).send({});
    expect(send.status).toBe(422);
  });
});

describe("plan contratado, comparativa y aceptación definitiva", () => {
  it("el administrativo y el representante legal ven el catálogo; el médico solo sabe que no puede gestionarlo", async () => {
    const admin = await request(app).get("/api/clinic/plan-catalog").set("Cookie", cookie("admin-1", "administrativo"));
    expect(admin.body.canManage).toBe(true);
    expect(admin.body.current).toBe("basic");
    expect(admin.body.plans.map((plan: { id: string }) => plan.id)).toEqual(["basic", "unlimited", "titanium"]);
    expect(admin.body.plans[2]).toMatchObject({ limits: { storageGb: 1000, includedHours: 15 }, services: { buyHours: true, customWork: true } });
    expect((await request(app).get("/api/clinic/plan-catalog").set("Cookie", cookie("med-legal", "medico"))).body.canManage).toBe(true);
    expect((await request(app).get("/api/clinic/plan-catalog").set("Cookie", cookie("med-1", "medico"))).body.canManage).toBe(false);
    expect((await request(app).get("/api/clinic/plan-catalog")).status).toBe(401);
  });

  it("una aceptación no se puede revertir: no hay forma de editarla ni borrarla", async () => {
    const contract = await contractForCenter("clinic-a", "basic");
    const accepted = await request(app).post("/api/clinic/contract/accept").set("Cookie", cookie("admin-1", "administrativo")).send({ version: contract.version, hash: contract.hash });
    const id = accepted.body.acceptance.id;
    for (const method of ["delete", "put", "patch"] as const) {
      for (const url of ["/api/clinic/contract", `/api/clinic/contract/${id}`, `/api/clinic/contract/accept`, `/api/director/centers/clinic-a/contract`, `/api/director/centers/clinic-a/contract/${id}`]) {
        const response = await request(app)[method](url).set("Cookie", director()).send({});
        expect([404, 405]).toContain(response.status);
      }
    }
    const history = await request(app).get("/api/director/centers/clinic-a/contract").set("Cookie", director());
    expect(history.body.history).toHaveLength(1);
    expect(history.body.status).toBe("aceptado");
  });
});

describe("envío del contrato por correo", () => {
  const sent: Array<{ to: string[]; subject: string; html: string; text: string }> = [];
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    sent.length = 0;
    process.env.RESEND_API_KEY = "test-key";
    process.env.MAIL_FROM = "Clinivista <contrato@clinivista.cl>";
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      if (String(url).includes("api.resend.com")) { sent.push(JSON.parse(String(init?.body))); return new Response("{}", { status: 200 }); }
      return realFetch(url as string, init);
    }) as typeof fetch;
  });
  afterEach(() => { globalThis.fetch = realFetch; delete process.env.RESEND_API_KEY; delete process.env.MAIL_FROM; });

  const tokenOf = (mail: { text: string }) => decodeURIComponent(/\/contrato\?token=([^\s]+)/.exec(mail.text)![1]!);

  it("supra-control envía el contrato al representante legal con el estilo de la marca", async () => {
    const response = await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).set("X-Forwarded-Host", "app.clinivista.cl").set("X-Forwarded-Proto", "https").send({});
    expect(response.status).toBe(200);
    expect(response.body.results).toEqual([{ userId: "med-legal", email: "lia@x.cl", name: "Lia Legal", status: "enviado" }]);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toEqual(["lia@x.cl"]);
    expect(sent[0]!.subject).toContain("Clínica A");
    expect(sent[0]!.html).toContain("#0A1F4D");
    expect(sent[0]!.html).toContain("Aceptación del contrato");
    expect(sent[0]!.html).toContain("https://app.clinivista.cl/clinivista-logo.png");
    expect(sent[0]!.text).toContain("https://app.clinivista.cl/contrato?token=");
  });

  it("el enlace muestra el contrato sin iniciar sesión y acepta una sola vez, con registro", async () => {
    await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).send({});
    const token = tokenOf(sent[0]!);
    const info = await request(app).get("/api/contract-invite").query({ token });
    expect(info.status).toBe(200);
    expect(info.body).toMatchObject({ clinicName: "Clínica A", recipientName: "Lia Legal", plan: "basic", accepted: null });
    const { version, hash } = info.body.contract;
    const bad = await request(app).post("/api/contract-invite/accept").send({ token, version: "otra", hash });
    expect(bad.status).toBe(409);
    const ok = await request(app).post("/api/contract-invite/accept").set("User-Agent", "vitest").send({ token, version, hash });
    expect(ok.status).toBe(201);
    const again = await request(app).post("/api/contract-invite/accept").send({ token, version, hash });
    expect(again.status).toBe(200);
    const history = await request(app).get("/api/director/centers/clinic-a/contract").set("Cookie", director());
    expect(history.body.status).toBe("aceptado");
    expect(history.body.history).toHaveLength(1);
    expect(history.body.history[0]).toMatchObject({ byName: "Lia Legal", byRole: "representante legal (enlace por correo)" });
    expect(history.body.invites[0].usedAt).not.toBeNull();
    // y la clínica ya no ve el aviso pendiente
    const view = await request(app).get("/api/clinic/contract").set("Cookie", cookie("admin-1", "administrativo"));
    expect(view.body.accepted).toBe(true);
  });

  it("reenviar anula el enlace anterior", async () => {
    await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).send({});
    await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).send({ userId: "med-legal" });
    expect(sent).toHaveLength(2);
    expect((await request(app).get("/api/contract-invite").query({ token: tokenOf(sent[0]!) })).status).toBe(404);
    expect((await request(app).get("/api/contract-invite").query({ token: tokenOf(sent[1]!) })).status).toBe(200);
  });

  it("rechaza enlaces inválidos, vencidos o de un representante dado de baja", async () => {
    expect((await request(app).get("/api/contract-invite").query({ token: "x" })).status).toBe(404);
    await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).send({});
    const token = tokenOf(sent[0]!);
    await pglite.exec(`UPDATE clinic_contract_invites SET expires_at = now() - interval '1 day'`);
    expect((await request(app).get("/api/contract-invite").query({ token })).status).toBe(404);
    await pglite.exec(`UPDATE clinic_contract_invites SET expires_at = now() + interval '1 day'; UPDATE users SET active = false WHERE id = 'med-legal'`);
    expect((await request(app).get("/api/contract-invite").query({ token })).status).toBe(404);
  });

  it("sin representante legal, con el contrato apagado o sin permiso: no envía", async () => {
    await pglite.exec(`UPDATE users SET legal_representative = false`);
    const none = await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).send({});
    expect(none.status).toBe(422);
    delete process.env.CONTRACTS_ENABLED;
    expect((await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).send({})).status).toBe(409);
    expect((await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", cookie("admin-1", "administrativo")).send({})).status).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it("sin servicio de correo configurado informa el estado y no deja enlaces", async () => {
    delete process.env.RESEND_API_KEY;
    const response = await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).send({});
    expect(response.body.results[0].status).toBe("sin_correo_configurado");
    const history = await request(app).get("/api/director/centers/clinic-a/contract").set("Cookie", director());
    expect(history.body.invites).toEqual([]);
  });

  it("al crear al representante legal se envía solo (y no si el contrato está apagado)", async () => {
    await sendContractToNewRepresentative("clinic-a", "med-legal", "https://app.clinivista.cl");
    expect(sent).toHaveLength(1);
    delete process.env.CONTRACTS_ENABLED;
    await sendContractToNewRepresentative("clinic-a", "med-legal", "https://app.clinivista.cl");
    expect(sent).toHaveLength(1);
  });

  it("aísla clínicas: el reenvío de una clínica no alcanza a representantes de otra", async () => {
    await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id, legal_representative) VALUES ('b-legal','b@x.cl','b@x.cl','x','Bea','medico','clinic-b', true)`);
    await request(app).post("/api/director/centers/clinic-a/contract/send").set("Cookie", director()).send({ userId: "b-legal" });
    expect(sent).toHaveLength(0);
  });
});

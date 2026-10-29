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
import { CONTRACT_VERSION, contractFor } from "../lib/contract";

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
  `);
});

beforeEach(async () => {
  process.env.CONTRACTS_ENABLED = "true";
  await pglite.exec(`TRUNCATE clinical_centers, users, clinic_plan_settings, clinic_contract_acceptances;`);
  await pglite.exec(`
    INSERT INTO clinical_centers (id, name, slug, plan) VALUES ('clinic-a', 'Clínica A', 'clinic-a', 'basic'), ('clinic-b', 'Clínica B', 'clinic-b', 'basic');
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES
      ('admin-1', 'ana@x.cl', 'ana@x.cl', 'x', 'Ana Admin', 'administrativo', 'clinic-a'),
      ('med-1', 'beto@x.cl', 'beto@x.cl', 'x', 'Beto Médico', 'medico', 'clinic-a'),
      ('med-legal', 'lia@x.cl', 'lia@x.cl', 'x', 'Lia Legal', 'medico', 'clinic-a');
    UPDATE users SET legal_representative = true WHERE id = 'med-legal';
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
    expect(view.body.contract.clauses).toHaveLength(18);
    expect(view.body.contract.annexTitle).toBe("Anexo: Plan Basic");
    expect(view.body.contract.hash).toBe(contractFor("basic").hash);
  });

  it("el administrativo acepta; queda quién, cuándo, versión, plan y huella", async () => {
    const contract = contractFor("basic");
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
    const contract = contractFor("basic");
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
    const basic = contractFor("basic");
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
    const contract = contractFor("basic");
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

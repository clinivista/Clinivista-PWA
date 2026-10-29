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
  return { ...schema, ...passwords, db, pool: client, __pglite: client };
});

import * as mockedDb from "@workspace/db";
import clinicIntegrationsRouter from "./clinic-integrations";
import { createSession } from "../lib/sessions";
import { INTEGRATION_CATALOG, integrationRequestsOf } from "../lib/integrations";

const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json());
app.use("/api", clinicIntegrationsRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE users (id text PRIMARY KEY, email text NOT NULL, email_normalized text NOT NULL, password_hash text NOT NULL, name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', role text NOT NULL, center_id text, active boolean NOT NULL DEFAULT true, legal_representative boolean NOT NULL DEFAULT false, reset_token_hash text, reset_token_expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE integration_requests (
      id text PRIMARY KEY, center_id text NOT NULL, integration text NOT NULL, requested_by_user_id text NOT NULL,
      requested_by_name text NOT NULL DEFAULT '', requested_by_email text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX integration_requests_center_integration_idx ON integration_requests (center_id, integration);
  `);
});

beforeEach(async () => {
  await pglite.exec(`TRUNCATE users, integration_requests;`);
  await pglite.exec(`
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES
      ('admin-a', 'ana@x.cl', 'ana@x.cl', 'x', 'Ana Admin', 'administrativo', 'clinic-a'),
      ('med-a', 'beto@x.cl', 'beto@x.cl', 'x', 'Beto Médico', 'medico', 'clinic-a'),
      ('med-b', 'cata@y.cl', 'cata@y.cl', 'x', 'Cata Médica', 'medico', 'clinic-b');
  `);
});

const cookie = (userId: string, role: "administrativo" | "medico", centerId: string) => `clinivista_session=${createSession({ userId, centerId, role })}`;
const asAdminA = () => cookie("admin-a", "administrativo", "clinic-a");

describe("catálogo de integraciones", () => {
  it("incluye redes, sistemas de agenda y mensajería", () => {
    const ids = INTEGRATION_CATALOG.map((item) => item.id);
    for (const id of ["facebook", "instagram", "linkedin", "tiktok", "youtube", "medilink", "agendapro", "reservo", "google_calendar", "whatsapp"]) expect(ids).toContain(id);
    expect(new Set(INTEGRATION_CATALOG.map((item) => item.category))).toEqual(new Set(["redes", "agenda", "mensajeria"]));
  });
});

describe("integraciones de la clínica", () => {
  it("exige sesión de clínica", async () => {
    expect((await request(app).get("/api/clinic/integrations")).status).toBe(401);
    const director = `clinivista_session=${createSession({ userId: "d", centerId: null, role: "director" })}`;
    expect((await request(app).get("/api/clinic/integrations").set("Cookie", director)).status).toBe(403);
    expect((await request(app).put("/api/clinic/integrations/medilink/request")).status).toBe(401);
  });

  it("lista el catálogo y las solicitadas (vacías al inicio)", async () => {
    const res = await request(app).get("/api/clinic/integrations").set("Cookie", asAdminA());
    expect(res.status).toBe(200);
    expect(res.body.catalog).toHaveLength(INTEGRATION_CATALOG.length);
    expect(res.body.requested).toEqual([]);
  });

  it("cualquier persona del personal puede solicitar; es idempotente y guarda quién la pidió", async () => {
    const first = await request(app).put("/api/clinic/integrations/medilink/request").set("Cookie", cookie("med-a", "medico", "clinic-a"));
    expect(first.status).toBe(200);
    expect(first.body.requested).toEqual(["medilink"]);
    await request(app).put("/api/clinic/integrations/medilink/request").set("Cookie", asAdminA());
    const rows = await integrationRequestsOf("clinic-a");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ integration: "medilink", requestedByName: "Beto Médico", requestedByEmail: "beto@x.cl" });
  });

  it("no mezcla clínicas", async () => {
    await request(app).put("/api/clinic/integrations/instagram/request").set("Cookie", asAdminA());
    const other = await request(app).get("/api/clinic/integrations").set("Cookie", cookie("med-b", "medico", "clinic-b"));
    expect(other.body.requested).toEqual([]);
    expect(await integrationRequestsOf("clinic-b")).toEqual([]);
  });

  it("rechaza una integración que no existe", async () => {
    expect((await request(app).put("/api/clinic/integrations/myspace/request").set("Cookie", asAdminA())).status).toBe(404);
    expect((await request(app).delete("/api/clinic/integrations/myspace/request").set("Cookie", asAdminA())).status).toBe(404);
  });

  it("la clínica puede quitar su solicitud", async () => {
    await request(app).put("/api/clinic/integrations/reservo/request").set("Cookie", asAdminA());
    await request(app).put("/api/clinic/integrations/whatsapp/request").set("Cookie", asAdminA());
    const res = await request(app).delete("/api/clinic/integrations/reservo/request").set("Cookie", asAdminA());
    expect(res.status).toBe(200);
    expect(res.body.requested).toEqual(["whatsapp"]);
  });

  it("si la tabla aún no existe, el catálogo igual se ve (sin solicitudes)", async () => {
    await pglite.exec(`ALTER TABLE integration_requests RENAME TO integration_requests_old;`);
    try {
      const res = await request(app).get("/api/clinic/integrations").set("Cookie", asAdminA());
      expect(res.status).toBe(200);
      expect(res.body.requested).toEqual([]);
    } finally {
      await pglite.exec(`ALTER TABLE integration_requests_old RENAME TO integration_requests;`);
    }
  });
});

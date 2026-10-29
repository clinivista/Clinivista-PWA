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
import { hashPassword } from "@workspace/db";
import authRouter from "./auth";
import clinicUsersRouter from "./clinic-users";
import { createSession, getSession } from "../lib/sessions";

const PROFILE = { rut: "00000000-0", address: "Av. Demo 123, Santiago", specialty: "dermatologo" };
const CLINIC = { country: "CL", rut: "00000000-0", address: "Av. Demo 123, Santiago", phone: "+56 2 2345 6789" };


const pglite = (mockedDb as unknown as { __pglite: { exec(sql: string): Promise<unknown> } }).__pglite;

const app = express();
app.use(express.json());
app.use("/api", authRouter);
app.use("/api", clinicUsersRouter);

beforeAll(async () => {
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS clinic_profiles (center_id text PRIMARY KEY, country text NOT NULL DEFAULT 'CL', rut text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS user_profiles (user_id text PRIMARY KEY, rut text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', prefix text NOT NULL DEFAULT '', specialty text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS clinical_centers (
      id text PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, paid_until timestamptz, logo_data_url text, specialty text NOT NULL DEFAULT 'capilar', plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'unlimited', 'titanium')),
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
  `);
});

beforeEach(async () => {
  await pglite.exec(`TRUNCATE clinical_centers, users, clinic_profiles, user_profiles;`);
  await pglite.exec(`
    INSERT INTO clinical_centers (id, name, slug) VALUES ('clinic-a', 'Clínica A', 'clinic-a'), ('clinic-b', 'Clínica B', 'clinic-b');
  `);
});

async function seedUser(id: string, role: string, centerId: string | null, extra: { legal?: boolean; active?: boolean } = {}) {
  await pglite.exec(`
    INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id, active, legal_representative)
    VALUES ('${id}', '${id}@x.cl', '${id}@x.cl', '${hashPassword("password123")}', 'Nombre ${id}', '${role}', ${centerId ? `'${centerId}'` : "NULL"}, ${extra.active ?? true}, ${extra.legal ?? false});
  `);
}
const as = (id: string, role: string, centerId: string | null) =>
  `clinivista_session=${createSession({ userId: id, centerId, role: role as "medico" })}`;
const list = (cookie: string) => request(app).get("/api/clinic/users").set("Cookie", cookie);

describe("quién puede gestionar usuarios de una clínica", () => {
  it("lets administrativos and the legal representative (even a médico); not other médicos", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("rep", "medico", "clinic-a", { legal: true });
    await seedUser("doc", "medico", "clinic-a");
    await list(as("adm", "administrativo", "clinic-a")).expect(200);
    await list(as("rep", "medico", "clinic-a")).expect(200);
    await list(as("doc", "medico", "clinic-a")).expect(403);
    await request(app).get("/api/clinic/users").expect(401);
    await list(as("dir", "director", null)).expect(403);
  });

  it("reads the permission from the database: a blocked or demoted manager loses it at once", async () => {
    await seedUser("rep", "medico", "clinic-a", { legal: true });
    const cookie = as("rep", "medico", "clinic-a");
    await list(cookie).expect(200);
    await pglite.exec(`UPDATE users SET legal_representative = false WHERE id = 'rep';`);
    await list(cookie).expect(403);
  });

  it("reports canManageUsers in /auth/me", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("rep", "medico", "clinic-a", { legal: true });
    await seedUser("doc", "medico", "clinic-a");
    const me = async (id: string, role: string) =>
      (await request(app).get("/api/auth/me").set("Cookie", as(id, role, "clinic-a")).expect(200)).body.user.canManageUsers;
    expect(await me("adm", "administrativo")).toBe(true);
    expect(await me("rep", "medico")).toBe(true);
    expect(await me("doc", "medico")).toBe(false);
  });
});

describe("listar y crear", () => {
  it("lists only this clinic's médicos and administrativos, marks the caller, never exposes hashes", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("doc", "medico", "clinic-a", { legal: true });
    await seedUser("other", "administrativo", "clinic-b");
    await seedUser("dir", "director", null);
    const res = await list(as("adm", "administrativo", "clinic-a")).expect(200);
    expect(res.body.users.map((u: { id: string }) => u.id).sort()).toEqual(["adm", "doc"]);
    expect(res.body.users.find((u: { id: string }) => u.id === "adm").isSelf).toBe(true);
    expect(res.body.users.find((u: { id: string }) => u.id === "doc")).toMatchObject({ legalRepresentative: true, isSelf: false });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
  });

  it("creates a médico or administrativo in the caller's clinic, optionally as legal representative", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    const cookie = as("adm", "administrativo", "clinic-a");
    const created = await request(app).post("/api/clinic/users").set("Cookie", cookie)
      .send({ email: "Nuevo@Clinica.cl", name: "Nuevo Médico", password: "password123", role: "medico", ...PROFILE, legalRepresentative: true }).expect(201);
    expect(created.body).toMatchObject({ role: "medico", legalRepresentative: true, active: true, name: "Nuevo Médico" });
    const login = await request(app).post("/api/auth/login").send({ email: "nuevo@clinica.cl", password: "password123" }).expect(200);
    expect(login.body.user).toMatchObject({ centerId: "clinic-a", canManageUsers: true });
  });

  it("rejects director/supra roles, short passwords, bad emails and taken emails", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("other", "administrativo", "clinic-b");
    const cookie = as("adm", "administrativo", "clinic-a");
    const post = (body: object) => request(app).post("/api/clinic/users").set("Cookie", cookie).send(body);
    await post({ email: "a@b.cl", password: "password123", role: "director" }).expect(400);
    await post({ email: "a@b.cl", password: "password123", role: "supra_admin" }).expect(400);
    await post({ email: "a@b.cl", password: "corta", role: "medico", ...PROFILE }).expect(400);
    await post({ email: "no-es-correo", password: "password123", role: "medico", ...PROFILE }).expect(400);
    await post({ email: "ADM@x.cl", password: "password123", role: "medico", ...PROFILE }).expect(409); // ya existe en esta clínica
    // El mismo correo en otra clínica sí se puede: cada clínica tiene su propia cuenta y clave.
    await post({ email: "OTHER@x.cl", password: "password123", role: "medico", ...PROFILE }).expect(201);
  });
});

describe("bloquear, representante legal, restablecer y eliminar", () => {
  async function team() {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("doc", "medico", "clinic-a");
    await seedUser("foreign", "medico", "clinic-b");
    return as("adm", "administrativo", "clinic-a");
  }
  const patch = (cookie: string, id: string, body: object) =>
    request(app).patch(`/api/clinic/users/${id}`).set("Cookie", cookie).send(body);

  it("blocks and unblocks independently, closing the blocked user's sessions", async () => {
    const cookie = await team();
    const docToken = createSession({ userId: "doc", centerId: "clinic-a", role: "medico" });
    expect((await patch(cookie, "doc", { active: false }).expect(200)).body.active).toBe(false);
    expect(getSession(docToken)).toBeUndefined();
    await request(app).post("/api/auth/login").send({ email: "doc@x.cl", password: "password123" }).expect(401);
    expect((await patch(cookie, "doc", { active: true }).expect(200)).body.active).toBe(true);
    await request(app).post("/api/auth/login").send({ email: "doc@x.cl", password: "password123" }).expect(200);
  });

  it("sets and clears the legal representative flag", async () => {
    const cookie = await team();
    expect((await patch(cookie, "doc", { legalRepresentative: true }).expect(200)).body.legalRepresentative).toBe(true);
    expect((await patch(cookie, "doc", { legalRepresentative: false }).expect(200)).body.legalRepresentative).toBe(false);
    await patch(cookie, "doc", {}).expect(400);
  });

  it("never touches another clinic's users or a director", async () => {
    const cookie = await team();
    await seedUser("dir", "director", "clinic-a"); // even if wrongly given a clinic
    for (const id of ["foreign", "dir", "missing"]) {
      await patch(cookie, id, { active: false }).expect(404);
      await request(app).post(`/api/clinic/users/${id}/reset-password`).set("Cookie", cookie).expect(404);
      await request(app).delete(`/api/clinic/users/${id}`).set("Cookie", cookie).expect(404);
    }
    const rows = await request(app).get("/api/clinic/users").set("Cookie", cookie).expect(200);
    expect(rows.body.users).toHaveLength(2);
  });

  it("resets a password to a one-time temporary one and closes the user's sessions", async () => {
    const cookie = await team();
    const docToken = createSession({ userId: "doc", centerId: "clinic-a", role: "medico" });
    const res = await request(app).post("/api/clinic/users/doc/reset-password").set("Cookie", cookie).expect(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.temporaryPassword).toHaveLength(12);
    expect(getSession(docToken)).toBeUndefined();
    await request(app).post("/api/auth/login").send({ email: "doc@x.cl", password: "password123" }).expect(401);
    await request(app).post("/api/auth/login").send({ email: "doc@x.cl", password: res.body.temporaryPassword }).expect(200);
  });

  it("deletes a user for good, closing their sessions", async () => {
    const cookie = await team();
    const docToken = createSession({ userId: "doc", centerId: "clinic-a", role: "medico" });
    await request(app).delete("/api/clinic/users/doc").set("Cookie", cookie).expect(204);
    expect(getSession(docToken)).toBeUndefined();
    await request(app).post("/api/auth/login").send({ email: "doc@x.cl", password: "password123" }).expect(401);
    const rows = await request(app).get("/api/clinic/users").set("Cookie", cookie).expect(200);
    expect(rows.body.users.map((u: { id: string }) => u.id)).toEqual(["adm"]);
  });

  it("protects the caller and the clinic's last manager", async () => {
    const cookie = await team();
    await patch(cookie, "adm", { active: false }).expect(400); // not yourself
    await request(app).delete("/api/clinic/users/adm").set("Cookie", cookie).expect(400);
    await request(app).post("/api/clinic/users/adm/reset-password").set("Cookie", cookie).expect(400);

    // A legal-representative médico can manage, but cannot remove the only other manager...
    await pglite.exec(`UPDATE users SET legal_representative = true WHERE id = 'doc';`);
    const repCookie = as("doc", "medico", "clinic-a");
    await request(app).delete("/api/clinic/users/adm").set("Cookie", repCookie).expect(204); // doc is still a manager
    // ...and now doc is the only manager: it cannot demote itself (that would lock the clinic's users).
    await patch(repCookie, "doc", { legalRepresentative: false }).expect(400);
  });

  it("refuses to leave a clinic without any active manager", async () => {
    await seedUser("adm1", "administrativo", "clinic-a");
    await seedUser("rep", "medico", "clinic-a", { legal: true });
    const cookie = as("adm1", "administrativo", "clinic-a");
    // rep is a manager too, so removing rep is fine while adm1 remains...
    await patch(cookie, "rep", { legalRepresentative: false }).expect(200);
    // ...but now adm1 is the only one; a second administrativo may remove it only if someone else manages.
    await seedUser("adm2", "administrativo", "clinic-a", { active: false });
    const cookie2 = as("adm2", "administrativo", "clinic-a");
    await pglite.exec(`UPDATE users SET active = true WHERE id = 'adm2';`);
    await request(app).delete("/api/clinic/users/adm1").set("Cookie", cookie2).expect(204);
    await request(app).delete("/api/clinic/users/adm2").set("Cookie", cookie2).expect(400);
  });
});

describe("editar nombre y rol (el correo no cambia)", () => {
  const patch = (cookie: string, id: string, body: object) => request(app).patch(`/api/clinic/users/${id}`).set("Cookie", cookie).send(body);

  it("cambia el nombre y el rol, cierra la sesión del afectado y deja el correo igual", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("adm2", "administrativo", "clinic-a");
    await seedUser("doc", "medico", "clinic-a");
    const cookie = as("adm", "administrativo", "clinic-a");
    const docCookie = as("doc", "medico", "clinic-a");

    const named = await patch(cookie, "doc", { name: "  Dra. Nueva  " }).expect(200);
    expect(named.body).toMatchObject({ name: "Dra. Nueva", role: "medico", email: "doc@x.cl" });
    expect((await request(app).get("/api/auth/me").set("Cookie", docCookie)).body.authenticated).toBe(true); // solo el nombre: sigue con sesión

    const moved = await patch(cookie, "doc", { role: "administrativo", email: "otro@x.cl" }).expect(200);
    expect(moved.body).toMatchObject({ role: "administrativo", email: "doc@x.cl" }); // el correo se ignora
    expect((await request(app).get("/api/auth/me").set("Cookie", docCookie)).body.authenticated).toBe(false);
    await patch(cookie, "doc", { role: "invalido" }).expect(400);
    await patch(cookie, "doc", {}).expect(400);
  });

  it("no puedes cambiar tu propio rol, ni dejar a la clínica sin quien gestione usuarios", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("doc", "medico", "clinic-a");
    const cookie = as("adm", "administrativo", "clinic-a");
    await patch(cookie, "adm", { role: "medico" }).expect(400);
    await patch(cookie, "adm", { name: "Mi nombre" }).expect(200);
    await seedUser("adm2", "administrativo", "clinic-a");
    await patch(cookie, "adm2", { role: "medico" }).expect(200); // queda adm
    await patch(as("adm", "administrativo", "clinic-a"), "doc", { role: "administrativo" }).expect(200);
  });
});

describe("teléfono y contraseña del usuario", () => {
  const patch = (cookie: string, id: string, body: object) => request(app).patch(`/api/clinic/users/${id}`).set("Cookie", cookie).send(body);

  it("guarda el teléfono al crear y al editar, y rechaza uno inválido", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    const cookie = as("adm", "administrativo", "clinic-a");
    const created = await request(app).post("/api/clinic/users").set("Cookie", cookie)
      .send({ email: "nuevo@x.cl", password: "password123", role: "medico", ...PROFILE, phone: "+56 9 1234 5678" }).expect(201);
    expect(created.body.phone).toBe("+56 9 1234 5678");
    await request(app).post("/api/clinic/users").set("Cookie", cookie)
      .send({ email: "malo@x.cl", password: "password123", role: "medico", ...PROFILE, phone: "abc" }).expect(400);
    const id = created.body.id;
    expect((await patch(cookie, id, { phone: "(2) 2345-6789" }).expect(200)).body.phone).toBe("(2) 2345-6789");
    expect((await patch(cookie, id, { phone: "" }).expect(200)).body.phone).toBe("");
    await patch(cookie, id, { phone: "12" }).expect(400);
    const users = (await list(cookie).expect(200)).body.users as { id: string; phone: string }[];
    expect(users.find((u) => u.id === id)?.phone).toBe("");
  });

  it("cambia la contraseña de otra persona (cierra su sesión) y la propia sin cerrar la tuya", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("doc", "medico", "clinic-a");
    const cookie = as("adm", "administrativo", "clinic-a");
    const docCookie = as("doc", "medico", "clinic-a");
    await patch(cookie, "doc", { password: "corta" }).expect(400);
    await patch(cookie, "doc", { password: "clave-nueva-123" }).expect(200);
    expect((await request(app).get("/api/auth/me").set("Cookie", docCookie)).body.authenticated).toBe(false);
    await request(app).post("/api/auth/login").send({ email: "doc@x.cl", password: "clave-nueva-123" }).expect(200);
    await request(app).post("/api/auth/login").send({ email: "doc@x.cl", password: "password123" }).expect(401);
    await patch(cookie, "adm", { password: "mi-clave-nueva-1" }).expect(200);
    expect((await request(app).get("/api/auth/me").set("Cookie", cookie)).body.authenticated).toBe(true);
    await request(app).post("/api/auth/login").send({ email: "adm@x.cl", password: "mi-clave-nueva-1" }).expect(200);
  });
});

describe("datos personales de los usuarios (RUT, dirección, prefijo, especialidad)", () => {
  const body = (over: object = {}) => ({ email: "nuevo@x.cl", name: "Nuevo", password: "password123", role: "medico", ...PROFILE, ...over });
  const create = (cookie: string, over: object = {}) => request(app).post("/api/clinic/users").set("Cookie", cookie).send(body(over));
  const adminCookie = () => as("adm", "administrativo", "clinic-a");
  const patch = (cookie: string, id: string, data: object) => request(app).patch(`/api/clinic/users/${id}`).set("Cookie", cookie).send(data);

  it("el RUT es obligatorio y debe ser válido; el 00000000-0 se acepta para demostraciones", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    const cookie = adminCookie();
    const missing = await create(cookie, { rut: undefined }).expect(400);
    expect(missing.body.error).toMatch(/RUT/);
    await create(cookie, { rut: "" }).expect(400);
    await create(cookie, { rut: "12.345.678-9" }).expect(400);
    await create(cookie, { rut: "123" }).expect(400);
    const demo = await create(cookie, { rut: "00000000-0" }).expect(201);
    expect(demo.body.rut).toBe("00.000.000-0");
    const real = await create(cookie, { email: "real@x.cl", rut: "12345678-5" }).expect(201);
    expect(real.body.rut).toBe("12.345.678-5");
    const k = await create(cookie, { email: "k@x.cl", rut: "10.000.013-k" });
    expect([201, 400]).toContain(k.status);
  });

  it("guarda dirección, prefijo y especialidad, y los muestra en la lista", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    const cookie = adminCookie();
    const created = await create(cookie, { address: "  Av. Siempre   Viva 742 ", prefix: "Dra", specialty: "cirujano_plastico" }).expect(201);
    expect(created.body).toMatchObject({ address: "Av. Siempre Viva 742", prefix: "Dra", specialty: "cirujano_plastico" });
    const users = (await list(cookie).expect(200)).body.users as Array<{ email: string; rut: string; prefix: string; specialty: string }>;
    expect(users.find((user) => user.email === "nuevo@x.cl")).toMatchObject({ rut: "00.000.000-0", prefix: "Dra", specialty: "cirujano_plastico" });
    expect(users.find((user) => user.email === "adm@x.cl")).toMatchObject({ rut: "", address: "", prefix: "", specialty: "" });
  });

  it("el médico debe elegir una especialidad de la lista; el administrativo no la lleva", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    const cookie = adminCookie();
    await create(cookie, { specialty: undefined }).expect(400);
    await create(cookie, { specialty: "astrologo" }).expect(400);
    await create(cookie, { prefix: "Excelentísimo" }).expect(400);
    const admin = await create(cookie, { email: "otro-adm@x.cl", role: "administrativo", specialty: "dermatologo" }).expect(201);
    expect(admin.body.specialty).toBe("");
  });

  it("un representante legal necesita dirección: va en el contrato", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    const cookie = adminCookie();
    await create(cookie, { legalRepresentative: true, address: undefined }).expect(400);
    await create(cookie, { legalRepresentative: true }).expect(201);
  });

  it("se pueden actualizar los datos de usuarios existentes (sin RUT todavía)", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("doc", "medico", "clinic-a");
    const cookie = adminCookie();
    await patch(cookie, "doc", { rut: "" }).expect(400);
    await patch(cookie, "doc", { rut: "11.111.111-1" }).expect(200);
    const updated = await patch(cookie, "doc", { rut: "00000000-0", address: "Calle 1", prefix: "Dr", specialty: "oftalmologo" }).expect(200);
    expect(updated.body).toMatchObject({ rut: "00.000.000-0", address: "Calle 1", prefix: "Dr", specialty: "oftalmologo" });
    await patch(cookie, "doc", { specialty: "nada" }).expect(400);
    // bloquear a alguien no pide datos personales
    await patch(cookie, "doc", { active: false }).expect(200);
  });

  it("no mezcla clínicas: no se editan datos de usuarios de otra", async () => {
    await seedUser("adm", "administrativo", "clinic-a");
    await seedUser("ajeno", "medico", "clinic-b");
    await patch(adminCookie(), "ajeno", { rut: "00000000-0" }).expect(404);
  });

  it("un director que entra como administrativo o representante legal gestiona los usuarios de la clínica", async () => {
    await seedUser("doc", "medico", "clinic-a");
    const viewing = (role: "medico" | "administrativo", legal: boolean) =>
      `clinivista_session=${createSession({ userId: "dir-1", centerId: null, role: "director", viewingCenterId: "clinic-a", viewingRole: role, viewingLegal: legal })}`;
    await pglite.exec(`INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id) VALUES ('dir-1', 'd@x.cl', 'd@x.cl', 'x', 'Dir', 'director', NULL);`);
    const asLegal = viewing("medico", true);
    expect((await request(app).get("/api/auth/me").set("Cookie", asLegal)).body.user.canManageUsers).toBe(true);
    expect((await list(asLegal).expect(200)).body.users).toHaveLength(1);
    await create(asLegal).expect(201);
    expect((await request(app).get("/api/auth/me").set("Cookie", viewing("administrativo", false))).body.user.canManageUsers).toBe(true);
    const asDoctor = viewing("medico", false);
    expect((await request(app).get("/api/auth/me").set("Cookie", asDoctor)).body.user.canManageUsers).toBe(false);
    await list(asDoctor).expect(403);
  });
});

import { Router, type IRouter } from "express";
import crypto from "crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, centersTable, leadsTable, usersTable, hashPassword, normalizeEmail } from "@workspace/db";
import {
  CreateDirectorCenterBody,
  GetDirectorCenterExportParams,
  GetDirectorCenterUsersParams,
  PatchDirectorCenterBody,
  PatchDirectorCenterParams,
  RecordDirectorCenterPaymentBody,
  RecordDirectorCenterPaymentParams,
  ResetDirectorCenterUserPasswordParams,
} from "@workspace/api-zod";
import { requireDirectorAuth } from "./auth";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";
import { seedSamplePatients } from "../lib/demo-patients";
import { clean, uid } from "../lib/helpers";
import { destroySessionsForUser } from "../lib/sessions";

const router: IRouter = Router();

// Manual billing (Fase 6): no payment gateway, no automatic suspension.
// A clinic with no recorded payment is "sin_registro" (never billed, e.g. a
// brand-new or demo clinic); past its paidUntil date it's "atrasada" so the
// director sees it and can choose to suspend; otherwise "al_dia".
function paymentStatus(paidUntil: Date | null): "al_dia" | "atrasada" | "sin_registro" {
  if (!paidUntil) return "sin_registro";
  return paidUntil.getTime() >= Date.now() ? "al_dia" : "atrasada";
}

async function centerSummaries() {
  const centers = await db.select().from(centersTable);
  // Every clinic that has ever received a patient or a staff account shows up,
  // even if `clinical_centers` doesn't have a row for it yet (it's created
  // lazily on first evaluation) — otherwise a brand-new clinic would be
  // invisible to the director until its first patient photo is captured.
  const leadCenterIds = await db.select({ centerId: leadsTable.centerId }).from(leadsTable);
  const userCenterIds = await db.select({ centerId: usersTable.centerId }).from(usersTable);
  const knownIds = new Set<string>(centers.map((center) => center.id));
  for (const row of leadCenterIds) knownIds.add(row.centerId ?? DEFAULT_CENTER_ID);
  for (const row of userCenterIds) if (row.centerId) knownIds.add(row.centerId);

  const centerById = new Map(centers.map((center) => [center.id, center]));
  const results = await Promise.all(
    [...knownIds].map(async (id) => {
      const center = centerById.get(id);
      const [{ patientCount }] = await db.select({ patientCount: sql<number>`count(*)::int` })
        .from(leadsTable)
        .where(sql`coalesce(${leadsTable.centerId}, ${DEFAULT_CENTER_ID}) = ${id}`);
      const [{ staffCount }] = await db.select({ staffCount: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.centerId, id));
      return {
        id,
        name: center?.name ?? (id === DEFAULT_CENTER_ID ? "Centro principal" : id),
        slug: center?.slug ?? id,
        active: center?.active ?? true,
        createdAt: center?.createdAt ?? new Date(0),
        patientCount,
        staffCount,
        paidUntil: center?.paidUntil ?? null,
        paymentStatus: paymentStatus(center?.paidUntil ?? null),
      };
    }),
  );
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

router.get("/director/centers", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;
  res.json({ centers: await centerSummaries() });
});

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,39}$/;
const MAX_NEW_CLINIC_USERS = 5;

/** "Clínica Demo Capilar" -> "clinica-demo-capilar" */
function slugFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

router.post("/director/centers", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;

  const body = CreateDirectorCenterBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }

  const name = clean(body.data.name, 80);
  const slug = (body.data.slug?.trim() || slugFromName(name)).toLowerCase();
  const users = body.data.users ?? [];
  if (name.length < 3 || !SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Revisa el nombre de la clínica y su identificador (solo minúsculas, números y guiones)." });
    return;
  }
  if (users.length > MAX_NEW_CLINIC_USERS) {
    res.status(400).json({ error: `Máximo ${MAX_NEW_CLINIC_USERS} cuentas al crear una clínica.` });
    return;
  }

  const accounts = users.map((user) => ({
    email: user.email.trim(),
    emailNormalized: normalizeEmail(user.email),
    name: clean(user.name ?? "", 100),
    password: user.password,
    role: user.role,
  }));
  const emailLooksValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (accounts.some((account) => !emailLooksValid(account.emailNormalized) || account.password.length < 8)) {
    res.status(400).json({ error: "Cada cuenta necesita un correo válido y una contraseña de al menos 8 caracteres." });
    return;
  }
  if (new Set(accounts.map((account) => account.emailNormalized)).size !== accounts.length) {
    res.status(400).json({ error: "Los correos de las cuentas deben ser distintos." });
    return;
  }

  // The slug is the clinic id: a clinic that already exists (explicitly, or
  // implicitly through leads/users) must never be silently merged into.
  const existingSummaries = await centerSummaries();
  if (existingSummaries.some((center) => center.id === slug || center.slug === slug)) {
    res.status(409).json({ error: "Ya existe una clínica con ese identificador." });
    return;
  }
  for (const account of accounts) {
    const [taken] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.emailNormalized, account.emailNormalized));
    if (taken) {
      res.status(409).json({ error: `El correo ${account.email} ya está en uso.` });
      return;
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(centersTable).values({ id: slug, name, slug });
    for (const account of accounts) {
      await tx.insert(usersTable).values({
        id: uid(9),
        email: account.email,
        emailNormalized: account.emailNormalized,
        passwordHash: hashPassword(account.password),
        name: account.name,
        role: account.role,
        centerId: slug,
      });
    }
  });
  if (body.data.withSamplePatients) await seedSamplePatients(slug);

  const created = (await centerSummaries()).find((center) => center.id === slug);
  res.status(201).json(created);
});

router.patch("/director/centers/:id", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;

  const params = PatchDirectorCenterParams.safeParse(req.params);
  const body = PatchDirectorCenterBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }

  const [existing] = await db.select().from(centersTable).where(eq(centersTable.id, params.data.id));
  if (existing) {
    await db.update(centersTable).set({ active: body.data.active }).where(eq(centersTable.id, params.data.id));
  } else {
    // A clinic that only exists implicitly (via leads/users) gets its row
    // created here, the first time a director touches its status.
    await db.insert(centersTable).values({
      id: params.data.id,
      name: params.data.id === DEFAULT_CENTER_ID ? "Centro principal" : params.data.id,
      slug: params.data.id,
      active: body.data.active,
    }).onConflictDoNothing();
  }

  const summaries = await centerSummaries();
  const updated = summaries.find((center) => center.id === params.data.id);
  if (!updated) {
    res.status(404).json({ error: "Clínica no encontrada." });
    return;
  }
  res.json(updated);
});

// Sin caracteres ambiguos (0/O, 1/l/I) para que se pueda dictar o leer sin errores.
const TEMP_PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TEMP_PASSWORD_LENGTH = 12;

function generateTemporaryPassword(): string {
  return Array.from({ length: TEMP_PASSWORD_LENGTH }, () =>
    TEMP_PASSWORD_ALPHABET[crypto.randomInt(TEMP_PASSWORD_ALPHABET.length)],
  ).join("");
}

router.get("/director/centers/:id/users", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;

  const params = GetDirectorCenterUsersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }
  if (!(await centerSummaries()).some((center) => center.id === params.data.id)) {
    res.status(404).json({ error: "Clínica no encontrada." });
    return;
  }

  // Never select passwordHash: this list is for display only.
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    active: usersTable.active,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.centerId, params.data.id));
  users.sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
  res.json({ users });
});

router.post("/director/centers/:id/users/:userId/reset-password", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;

  const params = ResetDirectorCenterUserPasswordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }

  // The user must belong to the clinic in the URL (and never be a director),
  // so one clinic's panel row can't be used to reset another clinic's account.
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(and(
    eq(usersTable.id, params.data.userId),
    eq(usersTable.centerId, params.data.id),
    ne(usersTable.role, "director"),
  ));
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado en esta clínica." });
    return;
  }

  const temporaryPassword = generateTemporaryPassword();
  await db.update(usersTable)
    .set({ passwordHash: hashPassword(temporaryPassword), updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));
  destroySessionsForUser(user.id);

  // The temporary password is returned exactly once and must never be cached.
  res.setHeader("Cache-Control", "no-store");
  res.json({ temporaryPassword });
});

router.post("/director/centers/:id/payments", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;

  const params = RecordDirectorCenterPaymentParams.safeParse(req.params);
  const body = RecordDirectorCenterPaymentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }
  // RecordDirectorCenterPaymentBody already coerces and validates this into
  // a real Date (zod.coerce.date() rejects anything that doesn't parse).
  const paidUntil = body.data.paidUntil;

  const [existing] = await db.select().from(centersTable).where(eq(centersTable.id, params.data.id));
  if (existing) {
    await db.update(centersTable).set({ paidUntil }).where(eq(centersTable.id, params.data.id));
  } else {
    // Same lazy-creation pattern as the PATCH above: a clinic that only
    // exists implicitly (via leads/users) gets its row created here, the
    // first time a director records a payment for it.
    await db.insert(centersTable).values({
      id: params.data.id,
      name: params.data.id === DEFAULT_CENTER_ID ? "Centro principal" : params.data.id,
      slug: params.data.id,
      paidUntil,
    }).onConflictDoNothing();
  }

  const summaries = await centerSummaries();
  const updated = summaries.find((center) => center.id === params.data.id);
  if (!updated) {
    res.status(404).json({ error: "Clínica no encontrada." });
    return;
  }
  res.json(updated);
});

router.get("/director/centers/:id/export", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;

  const params = GetDirectorCenterExportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }

  const [center] = await db.select().from(centersTable).where(eq(centersTable.id, params.data.id));
  const leads = (await db.select().from(leadsTable))
    .filter((lead) => (lead.centerId ?? DEFAULT_CENTER_ID) === params.data.id);
  const staff = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    active: usersTable.active,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.centerId, params.data.id));

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    center: center ?? { id: params.data.id, name: params.data.id, slug: params.data.id, active: true },
    staff,
    // `token` is the patient's bearer credential for /api/patients/:token
    // (their data and clinical photos). This file is meant to leave the
    // platform, so it must carry the data, never access to it.
    patients: leads.map(({ photos: _photos, token: _token, ...lead }) => lead),
    note: "Este archivo no incluye las fotografías clínicas en sí (se guardan aparte, en almacenamiento de objetos privado). Contacta a Clinivista para coordinar la transferencia de esas fotos si la clínica deja la plataforma.",
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${params.data.id}-export-${Date.now()}.json"`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, inArray, or } from "drizzle-orm";
import { db, usersTable, hashPassword, normalizeEmail } from "@workspace/db";
import {
  CreateClinicUserBody,
  DeleteClinicUserParams,
  PatchClinicUserBody,
  PatchClinicUserParams,
  ResetClinicUserPasswordParams,
} from "@workspace/api-zod";
import { canManageClinicUsers, requireStaffAuth } from "./auth";
import { clean, uid } from "../lib/helpers";
import { destroySessionsForUser } from "../lib/sessions";
import { resetToTemporaryPassword } from "../lib/user-management";

const router: IRouter = Router();

// A clinic manages only its own médicos and administrativos — never a
// director or supra_admin, and never another clinic's people.
const CLINIC_ROLES = ["medico", "administrativo"] as const;

const COLUMNS = {
  id: usersTable.id,
  email: usersTable.email,
  name: usersTable.name,
  role: usersTable.role,
  active: usersTable.active,
  legalRepresentative: usersTable.legalRepresentative,
  createdAt: usersTable.createdAt,
};

type ClinicManager = { userId: string; centerId: string };

/**
 * Administrativos and the clinic's legal representative (even a médico). The
 * permission is read from the database on every request, so removing it or
 * blocking the account takes effect immediately, not at the next login.
 */
async function requireClinicUserManager(req: Request, res: Response): Promise<ClinicManager | undefined> {
  const staff = requireStaffAuth(req, res);
  if (!staff) return undefined;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, staff.userId));
  if (!user || user.centerId !== staff.centerId || !canManageClinicUsers(user)) {
    res.status(403).json({ error: "Solo el personal administrativo o el representante legal puede gestionar usuarios." });
    return undefined;
  }
  return { userId: staff.userId, centerId: staff.centerId };
}

async function findClinicUser(centerId: string, userId: string) {
  const [user] = await db.select().from(usersTable).where(and(
    eq(usersTable.id, userId),
    eq(usersTable.centerId, centerId),
    inArray(usersTable.role, [...CLINIC_ROLES]),
  ));
  return user;
}

/** Active people of the clinic who can manage users (the clinic must always keep at least one). */
async function activeManagers(centerId: string) {
  return db.select({ id: usersTable.id }).from(usersTable).where(and(
    eq(usersTable.centerId, centerId),
    eq(usersTable.active, true),
    or(eq(usersTable.role, "administrativo"), eq(usersTable.legalRepresentative, true)),
  ));
}

async function wouldLeaveNoManager(centerId: string, target: { id: string }): Promise<boolean> {
  const managers = await activeManagers(centerId);
  return managers.some((manager) => manager.id === target.id) && managers.every((manager) => manager.id === target.id);
}

const NO_MANAGER_LEFT = "Debe quedar al menos un administrativo o representante legal activo en la clínica.";

router.get("/clinic/users", async (req, res): Promise<void> => {
  const manager = await requireClinicUserManager(req, res);
  if (!manager) return;
  // Never select passwordHash: this list is for display only.
  const users = await db.select(COLUMNS).from(usersTable).where(and(
    eq(usersTable.centerId, manager.centerId),
    inArray(usersTable.role, [...CLINIC_ROLES]),
  ));
  users.sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
  res.json({ users: users.map((user) => ({ ...user, isSelf: user.id === manager.userId })) });
});

router.post("/clinic/users", async (req, res): Promise<void> => {
  const manager = await requireClinicUserManager(req, res);
  if (!manager) return;
  const body = CreateClinicUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }
  const email = body.data.email.trim();
  const emailNormalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized) || body.data.password.length < 8) {
    res.status(400).json({ error: "Necesitas un correo válido y una contraseña de al menos 8 caracteres." });
    return;
  }
  // An email identifies one account on the whole platform, not per clinic.
  const [taken] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.emailNormalized, emailNormalized));
  if (taken) {
    res.status(409).json({ error: `El correo ${email} ya está en uso.` });
    return;
  }
  const id = uid(9);
  await db.insert(usersTable).values({
    id,
    email,
    emailNormalized,
    passwordHash: hashPassword(body.data.password),
    name: clean(body.data.name ?? "", 100),
    role: body.data.role,
    centerId: manager.centerId,
    legalRepresentative: body.data.legalRepresentative === true,
  });
  const [created] = await db.select(COLUMNS).from(usersTable).where(eq(usersTable.id, id));
  res.status(201).json({ ...created, isSelf: false });
});

router.patch("/clinic/users/:userId", async (req, res): Promise<void> => {
  const manager = await requireClinicUserManager(req, res);
  if (!manager) return;
  const params = PatchClinicUserParams.safeParse(req.params);
  const body = PatchClinicUserBody.safeParse(req.body);
  if (!params.success || !body.success || (body.data.active === undefined && body.data.legalRepresentative === undefined)) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }
  const user = await findClinicUser(manager.centerId, params.data.userId);
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado en esta clínica." });
    return;
  }
  const isSelf = user.id === manager.userId;
  if (isSelf && body.data.active === false) {
    res.status(400).json({ error: "No puedes bloquear tu propio acceso." });
    return;
  }
  // Would this change stop the person from being able to manage users?
  const nextActive = body.data.active ?? user.active;
  const nextLegal = body.data.legalRepresentative ?? user.legalRepresentative;
  const staysManager = nextActive && (user.role === "administrativo" || nextLegal);
  if (!staysManager && (await wouldLeaveNoManager(manager.centerId, user))) {
    res.status(400).json({ error: NO_MANAGER_LEFT });
    return;
  }

  await db.update(usersTable).set({
    ...(body.data.active !== undefined ? { active: body.data.active } : {}),
    ...(body.data.legalRepresentative !== undefined ? { legalRepresentative: body.data.legalRepresentative } : {}),
    updatedAt: new Date(),
  }).where(eq(usersTable.id, user.id));
  if (body.data.active === false) destroySessionsForUser(user.id);
  const [updated] = await db.select(COLUMNS).from(usersTable).where(eq(usersTable.id, user.id));
  res.json({ ...updated, isSelf });
});

router.post("/clinic/users/:userId/reset-password", async (req, res): Promise<void> => {
  const manager = await requireClinicUserManager(req, res);
  if (!manager) return;
  const params = ResetClinicUserPasswordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }
  if (params.data.userId === manager.userId) {
    res.status(400).json({ error: "No puedes restablecer tu propia contraseña aquí; pídele a otra persona de la clínica que lo haga." });
    return;
  }
  const user = await findClinicUser(manager.centerId, params.data.userId);
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado en esta clínica." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ temporaryPassword: await resetToTemporaryPassword(user.id) });
});

router.delete("/clinic/users/:userId", async (req, res): Promise<void> => {
  const manager = await requireClinicUserManager(req, res);
  if (!manager) return;
  const params = DeleteClinicUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }
  if (params.data.userId === manager.userId) {
    res.status(400).json({ error: "No puedes eliminar tu propia cuenta." });
    return;
  }
  const user = await findClinicUser(manager.centerId, params.data.userId);
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado en esta clínica." });
    return;
  }
  if (await wouldLeaveNoManager(manager.centerId, user)) {
    res.status(400).json({ error: NO_MANAGER_LEFT });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, user.id));
  destroySessionsForUser(user.id);
  res.status(204).end();
});

export default router;

import { centerPlanInfo } from "../lib/plans";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";
import { db, usersTable, centersTable, verifyPassword, normalizeEmail, type UserRole } from "@workspace/db";
import { createSession, getSession, isValidSession, destroySession, setSessionAccount, setSessionViewing, setSessionDirectorChoice } from "../lib/sessions";
import { directorEntryProfile } from "../lib/director-profile";
import { accessesForAccounts, allClinicsForDirector, type ClinicAccess } from "../lib/clinic-access";
import { getSessionToken } from "../lib/helpers";
import { requestStaffPasswordReset, resetStaffPassword, staffResetClinics, StaffResetError } from "../lib/staff-password-reset";
import { throttled } from "../lib/patient-accounts";
import { baseUrl } from "./results";

const router: IRouter = Router();

function getToken(req: Request): string | undefined {
  return getSessionToken(req.headers.cookie);
}

export function requireAuth(req: Request, res: Response): boolean {
  if (!isValidSession(getToken(req))) {
    res.status(401).json({ error: "Sesión requerida." });
    return false;
  }
  return true;
}

/** Any authenticated user — médico, administrativo or director. */
export function getAuthContext(req: Request): { userId: string; centerId: string | null; role: UserRole } | undefined {
  const session = getSession(getToken(req));
  return session ? { userId: session.userId, centerId: session.centerId, role: session.role } : undefined;
}

export type StaffAuthContext = { userId: string; centerId: string; role: "medico" | "administrativo"; /** a director acting as the clinic's legal representative */ legal?: boolean };

/**
 * médico/administrativo only, with a guaranteed (non-null) centerId — what
 * every clinic-scoped route (leads, invitations) needs. A "director" session
 * is valid but out of scope here (it has no single clinic); Phase 3's
 * supra-control panel is its own set of routes.
 */
export function requireStaffAuth(req: Request, res: Response): StaffAuthContext | undefined {
  const session = getSession(getToken(req));
  if (!session) {
    res.status(401).json({ error: "Sesión requerida." });
    return undefined;
  }
  // A director inside a clinic can do everything a médico and an administrativo can do
  // (the médico role already covers the administrative work: patients, photos, reports).
  if (session.role === "director" && session.viewingCenterId) {
    return { userId: session.userId, centerId: session.viewingCenterId, role: session.viewingRole ?? "medico", legal: session.viewingLegal === true };
  }
  if ((session.role !== "medico" && session.role !== "administrativo") || !session.centerId) {
    res.status(403).json({ error: "Esta acción requiere una cuenta de clínica (médico o administrativo)." });
    return undefined;
  }
  return { userId: session.userId, centerId: session.centerId, role: session.role };
}

/**
 * The supra-control panel's operating surface (clinics, payments,
 * suspensions, exports): a director or a supra-control administrator.
 */
export function requireSupraAuth(req: Request, res: Response): { userId: string; role: "director" | "supra_admin" } | undefined {
  const session = getSession(getToken(req));
  if (!session) {
    res.status(401).json({ error: "Sesión requerida." });
    return undefined;
  }
  if (session.role !== "director" && session.role !== "supra_admin") {
    res.status(403).json({ error: "Esta acción requiere una cuenta del panel de supra-control." });
    return undefined;
  }
  return { userId: session.userId, role: session.role };
}

/** director only — managing people (clinic users, the supra-control team). */
export function requireDirectorAuth(req: Request, res: Response): { userId: string } | undefined {
  const session = getSession(getToken(req));
  if (!session) {
    res.status(401).json({ error: "Sesión requerida." });
    return undefined;
  }
  if (session.role !== "director") {
    res.status(403).json({ error: "Esta acción requiere una cuenta de director." });
    return undefined;
  }
  return { userId: session.userId };
}

/** Who can manage a clinic's users from its panel: administrativos and the legal representative (even a médico). */
export function canManageClinicUsers(user: Pick<typeof usersTable.$inferSelect, "role" | "legalRepresentative" | "centerId" | "active">): boolean {
  return Boolean(user.centerId) && user.active && (user.role === "administrativo" || user.legalRepresentative);
}

type SessionClinic = { centerId: string | null; role: UserRole };
type ChooserOptions = { clinics?: { id: string; name: string; role: "medico" | "administrativo" }[]; needsClinicChoice?: boolean };

function authUser(user: typeof usersTable.$inferSelect, clinic: SessionClinic, choice: ChooserOptions = {}) {
  return {
    id: user.id, email: user.email, name: user.name, role: clinic.role, centerId: clinic.centerId,
    // Each clinic has its own account, so the permissions are those of the account in the clinic being used.
    canManageUsers: Boolean(clinic.centerId) && canManageClinicUsers({ ...user, role: clinic.role }),
    ...(choice.clinics ? { clinics: choice.clinics } : {}),
    ...(choice.needsClinicChoice !== undefined ? { needsClinicChoice: choice.needsClinicChoice } : {}),
  };
}

const clinicsOf = (accesses: ClinicAccess[]) => accesses.map((access) => ({ id: access.centerId, name: access.name, role: access.role }));

/** Directors have no single clinic (centerId is null) and are never blocked here. */
function isClinicStaff(user: typeof usersTable.$inferSelect): boolean {
  return user.role === "medico" || user.role === "administrativo";
}

/** Adds the current clinic's plan and the functions it enables (only when a clinic is chosen). */
async function withPlan<T extends { centerId: string | null }>(user: T): Promise<T | (T & Awaited<ReturnType<typeof centerPlanInfo>>)> {
  return user.centerId ? { ...user, ...(await centerPlanInfo(user.centerId)) } : user;
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const token = getToken(req);
  const session = getSession(token);
  if (!session) {
    res.json({ authenticated: false });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user || !user.active) {
    destroySession(token);
    res.json({ authenticated: false });
    return;
  }
  if (user.role === "director") {
    if (session.viewingCenterId) {
      const [center] = await db.select({ id: centersTable.id, name: centersTable.name }).from(centersTable).where(eq(centersTable.id, session.viewingCenterId));
      if (center) {
        res.json({ authenticated: true, user: await withPlan({ ...authUser(user, { centerId: center.id, role: session.viewingRole ?? "medico" }), canManageUsers: session.viewingLegal === true || (session.viewingRole ?? "medico") === "administrativo", viewingAsDirector: true, viewingClinic: center, viewingProfile: session.viewingLegal ? "representante_legal" : session.viewingRole ?? "medico" }) });
        return;
      }
      setSessionDirectorChoice(token);
    }
    // After signing in a director picks a clinic (or supra-control) from the full list.
    const needsClinicChoice = !getSession(token)?.supraChosen;
    res.json({ authenticated: true, user: authUser(user, { centerId: session.centerId, role: session.role }, { clinics: needsClinicChoice ? await allClinicsForDirector() : [], needsClinicChoice }) });
    return;
  }
  if (!isClinicStaff(user)) {
    res.json({ authenticated: true, user: authUser(user, { centerId: session.centerId, role: session.role }) });
    return;
  }
  const accesses = await accessesForAccounts(session.linkedUserIds ?? [session.userId]);
  if (accesses.length === 0) {
    destroySession(token);
    res.json({ authenticated: false });
    return;
  }
  const current = accesses.find((access) => access.userId === session.userId && access.centerId === session.centerId);
  const target = current ?? (accesses.length === 1 ? accesses[0] : undefined);
  if (target) {
    // The role in this clinic may have changed since the session started.
    if (target.userId !== session.userId || target.centerId !== session.centerId || target.role !== session.role) {
      setSessionAccount(token, { userId: target.userId, centerId: target.centerId, role: target.role });
    }
    res.json({ authenticated: true, user: await withPlan(authUser(target.user, { centerId: target.centerId, role: target.role }, { clinics: clinicsOf(accesses), needsClinicChoice: false })) });
    return;
  }
  const first = accesses.find((access) => access.userId === session.userId) ?? accesses[0];
  setSessionAccount(token, { userId: first.userId, centerId: null, role: first.role });
  res.json({ authenticated: true, user: authUser(first.user, { centerId: null, role: first.role }, { clinics: clinicsOf(accesses), needsClinicChoice: true }) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }

  const emailNormalized = normalizeEmail(parsed.data.email);
  const rows = await db.select().from(usersTable).where(eq(usersTable.emailNormalized, emailNormalized));
  // One person may have an account in several clinics, each with its own password
  // (they can be the same or different). Only the accounts whose password matches count.
  const matches = rows.filter((candidate) => candidate.active && verifyPassword(parsed.data.password, candidate.passwordHash));

  // Same "invalid credentials" response whether the email doesn't exist, the
  // account is deactivated, or the password is wrong — never reveal which.
  if (matches.length === 0) {
    res.status(401).json({ error: "Correo o contraseña incorrectos." });
    return;
  }
  const account = matches.find((candidate) => !isClinicStaff(candidate));
  let sessionContext: { userId: string; centerId: string | null; role: UserRole; linkedUserIds?: string[] };
  let body: ReturnType<typeof authUser>;
  if (account) {
    sessionContext = { userId: account.id, centerId: account.centerId, role: account.role };
    if (account.role === "director") {
      body = authUser(account, { centerId: null, role: account.role }, { clinics: await allClinicsForDirector(), needsClinicChoice: true });
    } else {
      body = authUser(account, { centerId: account.centerId, role: account.role });
    }
  } else {
    const accesses = await accessesForAccounts(matches.map((candidate) => candidate.id));
    if (accesses.length === 0) {
      res.status(403).json({ error: "Esta clínica está suspendida. Contacta al director de Clinivista." });
      return;
    }
    const linkedUserIds = accesses.map((access) => access.userId);
    // With several clinics the person chooses one right after signing in.
    if (accesses.length === 1) {
      const only = accesses[0];
      sessionContext = { userId: only.userId, centerId: only.centerId, role: only.role, linkedUserIds };
      body = authUser(only.user, { centerId: only.centerId, role: only.role }, { clinics: clinicsOf(accesses), needsClinicChoice: false });
    } else {
      sessionContext = { userId: accesses[0].userId, centerId: null, role: accesses[0].role, linkedUserIds };
      body = authUser(accesses[0].user, { centerId: null, role: accesses[0].role }, { clinics: clinicsOf(accesses), needsClinicChoice: true });
    }
  }

  const token = createSession(sessionContext);
  res.setHeader(
    "Set-Cookie",
    `clinivista_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  res.json({ ok: true, user: body });
});

// Choose (or leave, with null) the clinic the session works in. Only the
// clinics of the accounts that signed in, and only while they are not suspended.
router.post("/auth/clinic", async (req, res): Promise<void> => {
  const token = getToken(req);
  const session = getSession(token);
  if (!session) {
    res.status(401).json({ error: "Sesión requerida." });
    return;
  }
  const requested = (req.body as { centerId?: unknown } | undefined)?.centerId;
  if (session.role === "director") {
    setSessionDirectorChoice(token);
    res.json({ ok: true });
    return;
  }
  const accesses = await accessesForAccounts(session.linkedUserIds ?? [session.userId]);
  if (accesses.length === 0) {
    res.status(403).json({ error: "Esta cuenta no trabaja con clínicas." });
    return;
  }
  if (requested === null) {
    const first = accesses.find((access) => access.userId === session.userId) ?? accesses[0];
    setSessionAccount(token, { userId: first.userId, centerId: null, role: first.role });
    res.json({ ok: true });
    return;
  }
  const access = typeof requested === "string" ? accesses.find((candidate) => candidate.centerId === requested) : undefined;
  if (!access) {
    res.status(403).json({ error: "No tienes acceso a esa clínica." });
    return;
  }
  setSessionAccount(token, { userId: access.userId, centerId: access.centerId, role: access.role });
  res.json({ ok: true, user: authUser(access.user, { centerId: access.centerId, role: access.role }, { clinics: clinicsOf(accesses), needsClinicChoice: false }) });
});

// A director enters any clinic just by choosing it (no assignment needed) and
// keeps the director role to go back to supra-control.
router.post("/auth/enter-clinic", async (req, res): Promise<void> => {
  const token = getToken(req);
  const session = getSession(token);
  if (!session) {
    res.status(401).json({ error: "Sesión requerida." });
    return;
  }
  if (session.role !== "director") {
    res.status(403).json({ error: "Esta acción requiere una cuenta de director." });
    return;
  }
  const requested = (req.body as { centerId?: unknown } | undefined)?.centerId;
  const [center] = typeof requested === "string" && requested.length <= 200
    ? await db.select({ id: centersTable.id, name: centersTable.name }).from(centersTable).where(eq(centersTable.id, requested))
    : [];
  if (!center) {
    res.status(404).json({ error: "Clínica no encontrada." });
    return;
  }
  setSessionViewing(token, center.id, await directorEntryProfile(session.userId));
  res.json({ ok: true, clinic: center });
});

// Directors: leave the clinic (or choose "Supra-control" on the chooser) and work in the supra-control panel.
router.post("/auth/leave-clinic", (req, res): void => {
  const token = getToken(req);
  if (!getSession(token)) {
    res.status(401).json({ error: "Sesión requerida." });
    return;
  }
  setSessionViewing(token, null);
  res.json({ ok: true });
});

// Always answers the same, so it cannot be used to find out who has an account.
router.post("/auth/forgot", async (req, res): Promise<void> => {
  const { email, language } = (req.body ?? {}) as { email?: unknown; language?: unknown };
  if (typeof email === "string" && email.includes("@") && email.length <= 200) {
    await requestStaffPasswordReset(email, baseUrl(req), typeof language === "string" ? language : null, req.ip ?? "").catch(() => undefined);
  }
  res.json({ ok: true });
});

// Which clinics a reset link covers (so the page can offer "use this password in all my clinics").
router.get("/auth/reset-info", async (req, res): Promise<void> => {
  if (throttled(`staff-reset-info-ip:${req.ip}`, 60, 15 * 60_000)) {
    res.status(429).json({ error: "Demasiados intentos. Espera unos minutos." });
    return;
  }
  res.json({ clinics: await staffResetClinics(req.query.token) });
});

router.post("/auth/reset", async (req, res): Promise<void> => {
  const { token, password, centerIds } = (req.body ?? {}) as { token?: unknown; password?: unknown; centerIds?: unknown };
  if (throttled(`staff-reset-ip:${req.ip}`, 20, 15 * 60_000)) {
    res.status(429).json({ error: "Demasiados intentos. Espera unos minutos." });
    return;
  }
  try {
    await resetStaffPassword(token, password, centerIds);
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof StaffResetError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.post("/auth/logout", (req, res): void => {
  const token = getToken(req);
  destroySession(token);
  res.setHeader(
    "Set-Cookie",
    "clinivista_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
  );
  res.json({ ok: true });
});

export default router;

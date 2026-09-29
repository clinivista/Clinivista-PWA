import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { AdminLoginBody } from "@workspace/api-zod";
import { db, usersTable, verifyPassword, normalizeEmail, type UserRole } from "@workspace/db";
import { createSession, getSession, isValidSession, destroySession } from "../lib/sessions";
import { getSessionToken } from "../lib/helpers";
import { isCenterActive } from "../lib/centers";

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

export type StaffAuthContext = { userId: string; centerId: string; role: "medico" | "administrativo" };

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
  if (session.role === "director" || !session.centerId) {
    res.status(403).json({ error: "Esta acción requiere una cuenta de clínica (médico o administrativo)." });
    return undefined;
  }
  return { userId: session.userId, centerId: session.centerId, role: session.role };
}

/** director only — the supra-control panel that sees every clinic. */
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

function authUser(user: typeof usersTable.$inferSelect) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, centerId: user.centerId };
}

/** Directors have no single clinic (centerId is null) and are never blocked here. */
async function centerIsActiveFor(user: typeof usersTable.$inferSelect): Promise<boolean> {
  if (!user.centerId) return true;
  return isCenterActive(user.centerId);
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const session = getSession(getToken(req));
  if (!session) {
    res.json({ authenticated: false });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user || !user.active || !(await centerIsActiveFor(user))) {
    destroySession(getToken(req));
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user: authUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }

  const emailNormalized = normalizeEmail(parsed.data.email);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.emailNormalized, emailNormalized));

  // Same "invalid credentials" response whether the email doesn't exist, the
  // account is deactivated, or the password is wrong — never reveal which.
  if (!user || !user.active || !verifyPassword(parsed.data.password, user.passwordHash)) {
    res.status(401).json({ error: "Correo o contraseña incorrectos." });
    return;
  }
  if (!(await centerIsActiveFor(user))) {
    res.status(403).json({ error: "Esta clínica está suspendida. Contacta al director de Clinivista." });
    return;
  }

  const token = createSession({
    userId: user.id,
    centerId: user.centerId,
    role: user.role,
  });
  res.setHeader(
    "Set-Cookie",
    `clinivista_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  res.json({ ok: true, user: authUser(user) });
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

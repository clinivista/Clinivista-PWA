import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, directorPreferencesTable, DIRECTOR_ENTRY_PROFILES, type DirectorEntryProfile, hashPassword, verifyPassword, normalizeEmail } from "@workspace/db";
import { requireDirectorAuth } from "./auth";
import { clean, getSessionToken } from "../lib/helpers";
import { PHONE_ERROR, parseUserPhone } from "../lib/user-phone";
import { directorEntryProfile } from "../lib/director-profile";
import { destroyOtherSessionsForUser, setDirectorProfileEverywhere } from "../lib/sessions";

const router: IRouter = Router();

const MINE = { id: usersTable.id, email: usersTable.email, name: usersTable.name, phone: usersTable.phone, role: usersTable.role };

// «Mi cuenta» del director: sus propios datos y su clave. Cada director solo
// se edita a sí mismo; la clave actual se pide siempre para cambiarla o para
// cambiar el correo (con el que inicia sesión).
router.get("/director/me", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;
  const [me] = await db.select(MINE).from(usersTable).where(eq(usersTable.id, context.userId));
  res.setHeader("Cache-Control", "no-store");
  res.json({ ...me, entryProfile: await directorEntryProfile(context.userId) });
});

// Perfil con el que el director entra a cualquier clínica: médico, administrativo o representante legal.
// Vale para todas las clínicas hasta que lo cambie aquí (también al instante si ya está dentro de una).
router.put("/director/me/entry-profile", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;
  const profile = (req.body as { profile?: unknown } | undefined)?.profile;
  if (typeof profile !== "string" || !(DIRECTOR_ENTRY_PROFILES as readonly string[]).includes(profile)) {
    res.status(400).json({ error: "Elige médico, administrativo o representante legal." });
    return;
  }
  const entryProfile = profile as DirectorEntryProfile;
  await db.insert(directorPreferencesTable).values({ userId: context.userId, entryProfile })
    .onConflictDoUpdate({ target: directorPreferencesTable.userId, set: { entryProfile, updatedAt: new Date() } });
  setDirectorProfileEverywhere(context.userId, entryProfile);
  res.json({ entryProfile });
});

router.patch("/director/me", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;
  const body = (req.body ?? {}) as { name?: unknown; email?: unknown; phone?: unknown; currentPassword?: unknown };
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, context.userId));
  if (!me) {
    res.status(404).json({ error: "Cuenta no encontrada." });
    return;
  }
  const changes: Partial<typeof usersTable.$inferInsert> = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string") { res.status(400).json({ error: "Datos inválidos." }); return; }
    changes.name = clean(body.name, 100);
  }
  if (body.phone !== undefined) {
    const phone = parseUserPhone(body.phone);
    if (phone === null) { res.status(400).json({ error: PHONE_ERROR }); return; }
    changes.phone = phone;
  }
  if (body.email !== undefined) {
    if (typeof body.email !== "string") { res.status(400).json({ error: "Datos inválidos." }); return; }
    const email = body.email.trim();
    const emailNormalized = normalizeEmail(email);
    if (emailNormalized !== me.emailNormalized) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
        res.status(400).json({ error: "Escribe un correo válido." });
        return;
      }
      if (typeof body.currentPassword !== "string" || !verifyPassword(body.currentPassword, me.passwordHash)) {
        res.status(403).json({ error: "Para cambiar el correo escribe tu clave actual." });
        return;
      }
      // El correo de un director no puede coincidir con ninguna otra cuenta, para que iniciar sesión nunca sea ambiguo.
      const others = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.emailNormalized, emailNormalized));
      if (others.some((row) => row.id !== me.id)) {
        res.status(409).json({ error: `El correo ${email} ya está en uso.` });
        return;
      }
      changes.email = email;
      changes.emailNormalized = emailNormalized;
    }
  }
  if (Object.keys(changes).length > 0) {
    await db.update(usersTable).set({ ...changes, updatedAt: new Date() }).where(eq(usersTable.id, me.id));
  }
  const [updated] = await db.select(MINE).from(usersTable).where(eq(usersTable.id, me.id));
  res.json(updated);
});

router.post("/director/me/password", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;
  const body = (req.body ?? {}) as { currentPassword?: unknown; newPassword?: unknown };
  if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }
  if (body.newPassword.length < 8 || body.newPassword.length > 200) {
    res.status(400).json({ error: "La clave nueva debe tener al menos 8 caracteres." });
    return;
  }
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, context.userId));
  if (!me || !verifyPassword(body.currentPassword, me.passwordHash)) {
    res.status(403).json({ error: "La clave actual no es correcta." });
    return;
  }
  await db.update(usersTable).set({ passwordHash: hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(usersTable.id, me.id));
  // Se cierran las demás sesiones abiertas de esta cuenta; esta sigue activa.
  destroyOtherSessionsForUser(me.id, getSessionToken(req.headers.cookie));
  res.json({ ok: true });
});

export default router;

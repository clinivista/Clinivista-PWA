import crypto from "crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db, usersTable, centersTable, hashPassword, normalizeEmail } from "@workspace/db";
import { logger } from "./logger";
import { sendMail, staffResetMail, MailNotConfiguredError } from "./mailer";
import { destroySessionsForUser } from "./sessions";
import { isCenterActive } from "./centers";
import { throttled } from "./patient-accounts";

export const STAFF_MIN_PASSWORD = 8;
const RESET_TTL_MS = 60 * 60_000;

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

/**
 * Sends the "olvidé mi clave" link to an active staff account (any role).
 * Never reveals whether the email exists: callers answer the same either way.
 */
export async function requestStaffPasswordReset(email: string, baseUrl: string, language?: string | null, ip = ""): Promise<void> {
  const normalized = normalizeEmail(email);
  if (throttled(`staff-forgot:${normalized}`, 3, 15 * 60_000) || throttled(`staff-forgot-ip:${ip}`, 20, 15 * 60_000)) return;
  // The same email may have one account per clinic: they all share this one link.
  const rows = await db.select().from(usersTable).where(eq(usersTable.emailNormalized, normalized));
  const accounts: typeof rows = [];
  for (const row of rows) {
    if (!row.active) continue;
    if (row.centerId && !(await isCenterActive(row.centerId))) continue;
    accounts.push(row);
  }
  if (accounts.length === 0) return;
  const user = accounts[0];

  const token = crypto.randomBytes(32).toString("base64url");
  await db.update(usersTable)
    .set({ resetTokenHash: sha256(token), resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MS), updatedAt: new Date() })
    .where(inArray(usersTable.id, accounts.map((account) => account.id)));
  const link = `${baseUrl.replace(/\/$/, "")}/admin/clave?token=${encodeURIComponent(token)}`;
  try {
    await sendMail(staffResetMail({ to: user.email, name: user.name, link, language }));
  } catch (error) {
    if (error instanceof MailNotConfiguredError) logger.warn("Staff password reset requested but no mail service is configured");
    else logger.error({ err: error }, "Could not send the staff password reset email");
  }
}

export class StaffResetError extends Error {}

/** Accounts a valid reset link can change (one per clinic with the same email). */
async function accountsForToken(token: string) {
  return db.select({ id: usersTable.id, centerId: usersTable.centerId })
    .from(usersTable)
    .where(and(eq(usersTable.resetTokenHash, sha256(token)), gt(usersTable.resetTokenExpiresAt, new Date()), eq(usersTable.active, true)));
}

/** The clinics a reset link covers, so the person can pick where the new password applies. */
export async function staffResetClinics(token: unknown): Promise<{ centerId: string; name: string }[]> {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return [];
  const accounts = (await accountsForToken(token)).filter((account) => account.centerId);
  if (accounts.length === 0) return [];
  const centers = await db.select({ id: centersTable.id, name: centersTable.name }).from(centersTable)
    .where(inArray(centersTable.id, accounts.map((account) => account.centerId as string)));
  return centers.map((center) => ({ centerId: center.id, name: center.name })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * One-time link from the email: sets the new password and closes every open session of the
 * accounts it changed. `centerIds` (optional) limits it to some of the person's clinics — the
 * link keeps working for the rest until it expires; without it the password applies to all.
 */
export async function resetStaffPassword(token: unknown, password: unknown, centerIds?: unknown): Promise<void> {
  if (typeof password !== "string" || password.length < STAFF_MIN_PASSWORD || password.length > 100) {
    throw new StaffResetError(`La clave debe tener al menos ${STAFF_MIN_PASSWORD} caracteres.`);
  }
  if (typeof token !== "string" || token.length < 20 || token.length > 200) throw new StaffResetError("El enlace no es válido o ya venció.");
  let accounts = await accountsForToken(token);
  if (accounts.length === 0) throw new StaffResetError("El enlace no es válido o ya venció.");
  if (Array.isArray(centerIds)) {
    const chosen = new Set(centerIds.filter((id): id is string => typeof id === "string"));
    accounts = accounts.filter((account) => !account.centerId || chosen.has(account.centerId));
    if (accounts.length === 0) throw new StaffResetError("Elige al menos una clínica para aplicar la nueva clave.");
  }
  const ids = accounts.map((account) => account.id);
  await db.update(usersTable)
    .set({ passwordHash: hashPassword(password), resetTokenHash: null, resetTokenExpiresAt: null, updatedAt: new Date() })
    .where(inArray(usersTable.id, ids));
  for (const id of ids) destroySessionsForUser(id);
}

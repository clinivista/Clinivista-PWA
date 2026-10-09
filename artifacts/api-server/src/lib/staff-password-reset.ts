import crypto from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, usersTable, hashPassword, normalizeEmail } from "@workspace/db";
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
  const [user] = await db.select().from(usersTable).where(eq(usersTable.emailNormalized, normalized));
  if (!user || !user.active) return;
  if (user.centerId && !(await isCenterActive(user.centerId))) return;

  const token = crypto.randomBytes(32).toString("base64url");
  await db.update(usersTable)
    .set({ resetTokenHash: sha256(token), resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MS), updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));
  const link = `${baseUrl.replace(/\/$/, "")}/admin/clave?token=${encodeURIComponent(token)}`;
  try {
    await sendMail(staffResetMail({ to: user.email, name: user.name, link, language }));
  } catch (error) {
    if (error instanceof MailNotConfiguredError) logger.warn("Staff password reset requested but no mail service is configured");
    else logger.error({ err: error }, "Could not send the staff password reset email");
  }
}

export class StaffResetError extends Error {}

/** One-time link from the email: sets the new password and closes every open session of that user. */
export async function resetStaffPassword(token: unknown, password: unknown): Promise<void> {
  if (typeof password !== "string" || password.length < STAFF_MIN_PASSWORD || password.length > 100) {
    throw new StaffResetError(`La clave debe tener al menos ${STAFF_MIN_PASSWORD} caracteres.`);
  }
  if (typeof token !== "string" || token.length < 20 || token.length > 200) throw new StaffResetError("El enlace no es válido o ya venció.");
  const updated = await db.update(usersTable)
    .set({ passwordHash: hashPassword(password), resetTokenHash: null, resetTokenExpiresAt: null, updatedAt: new Date() })
    .where(and(eq(usersTable.resetTokenHash, sha256(token)), gt(usersTable.resetTokenExpiresAt, new Date()), eq(usersTable.active, true)))
    .returning({ id: usersTable.id });
  if (updated.length === 0) throw new StaffResetError("El enlace no es válido o ya venció.");
  destroySessionsForUser(updated[0].id);
}

import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

/**
 * Is this email already used where a new account would collide?
 * - Inside a clinic: only by an account of that same clinic (other clinics don't know about each other).
 * - Directors and supra-control (centerId null): by any account at all, so signing in is never ambiguous.
 * An existing director/supra-control account with that email also blocks it everywhere.
 */
export async function emailTaken(emailNormalized: string, centerId: string | null): Promise<boolean> {
  const rows = await db.select({ centerId: usersTable.centerId }).from(usersTable).where(eq(usersTable.emailNormalized, emailNormalized));
  if (centerId === null) return rows.length > 0;
  return rows.some((row) => row.centerId === null || row.centerId === centerId);
}

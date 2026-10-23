import { eq, inArray } from "drizzle-orm";
import { db, centersTable, usersTable } from "@workspace/db";

export type ClinicRole = "medico" | "administrativo";
export type ClinicAccess = { userId: string; centerId: string; name: string; role: ClinicRole; user: typeof usersTable.$inferSelect };

const isStaffRole = (role: string): role is ClinicRole => role === "medico" || role === "administrativo";

/**
 * A person who works in several clinics has one account per clinic (same email,
 * each with its own password). This returns the clinics those accounts can
 * enter right now: active accounts of clinics that are not suspended.
 */
export async function accessesForAccounts(userIds: string[]): Promise<ClinicAccess[]> {
  if (userIds.length === 0) return [];
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));
  const centers = await db.select({ id: centersTable.id, name: centersTable.name, active: centersTable.active }).from(centersTable);
  const result: ClinicAccess[] = [];
  for (const user of users) {
    if (!user.active || !user.centerId || !isStaffRole(user.role)) continue;
    const center = centers.find((candidate) => candidate.id === user.centerId);
    if (center && !center.active) continue;
    result.push({ userId: user.id, centerId: user.centerId, name: center?.name ?? user.centerId, role: user.role, user });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/** Every clinic, for the director's chooser. */
export async function allClinicsForDirector(): Promise<{ id: string; name: string; role: "administrativo" }[]> {
  const centers = await db.select({ id: centersTable.id, name: centersTable.name }).from(centersTable).where(eq(centersTable.active, true));
  return centers.map((center) => ({ id: center.id, name: center.name, role: "administrativo" as const })).sort((a, b) => a.name.localeCompare(b.name));
}

import { eq } from "drizzle-orm";
import { db, directorPreferencesTable, type DirectorEntryProfile } from "@workspace/db";

/** The profile a director enters any clinic with (médico unless they chose otherwise in «Mi cuenta»). */
export async function directorEntryProfile(userId: string): Promise<DirectorEntryProfile> {
  const [row] = await db.select().from(directorPreferencesTable).where(eq(directorPreferencesTable.userId, userId));
  return row?.entryProfile ?? "medico";
}

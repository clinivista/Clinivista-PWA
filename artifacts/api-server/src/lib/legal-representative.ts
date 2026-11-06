import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

/**
 * El representante legal de la clínica (se lee de la base en cada solicitud). Un director de supra-control que
 * entró a la clínica como su representante legal («Mi cuenta») también cuenta.
 */
export async function isLegalRepresentative({ userId, centerId, legal }: { userId: string; centerId: string; legal?: boolean }): Promise<boolean> {
  if (legal) return true;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return Boolean(user && user.active && user.centerId === centerId && user.legalRepresentative);
}

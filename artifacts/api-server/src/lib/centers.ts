import { eq } from "drizzle-orm";
import { db, centersTable } from "@workspace/db";

/**
 * A clinic that has no row yet in `clinical_centers` (it's created lazily on
 * first evaluation) counts as active — suspension is an explicit director
 * action, never an accident of ordering.
 */
export async function isCenterActive(centerId: string): Promise<boolean> {
  const [center] = await db.select({ active: centersTable.active }).from(centersTable).where(eq(centersTable.id, centerId));
  return !center || center.active;
}

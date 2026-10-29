import { and, asc, eq } from "drizzle-orm";
import { db, centersTable, usersTable } from "@workspace/db";
import { clinicProfileOf, userProfilesOf } from "./profiles";
import { contractFor, type ContractParty, type ContractText } from "./contract";
import type { Plan } from "./plans";

const PREFIX_TEXT: Record<string, string> = { Sr: "Sr.", Sra: "Sra.", Srta: "Srta.", Dr: "Dr.", Dra: "Dra.", Lic: "Lic.", Ing: "Ing.", Mg: "Mg.", Prof: "Prof." };

/** La clínica y su representante legal activo (el más antiguo, si hubiera varios), para rellenar el contrato. */
export async function partyOf(centerId: string): Promise<ContractParty> {
  const [center] = await db.select({ name: centersTable.name }).from(centersTable).where(eq(centersTable.id, centerId));
  const clinic = await clinicProfileOf(centerId);
  const [rep] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
    .where(and(eq(usersTable.centerId, centerId), eq(usersTable.legalRepresentative, true), eq(usersTable.active, true)))
    .orderBy(asc(usersTable.createdAt), asc(usersTable.id)).limit(1);
  const profile = rep ? (await userProfilesOf([rep.id])).get(rep.id) : undefined;
  return {
    clinic: { name: center?.name ?? "", ...clinic },
    representative: rep
      ? { prefix: PREFIX_TEXT[profile?.prefix ?? ""] ?? "", name: rep.name, rut: profile?.rut ?? "", address: profile?.address ?? "" }
      : null,
  };
}

export async function contractForCenter(centerId: string, plan: Plan): Promise<ContractText> {
  return contractFor(plan, await partyOf(centerId));
}

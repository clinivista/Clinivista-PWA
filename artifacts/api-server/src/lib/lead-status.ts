import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { getLeadPhases } from "./clinical-photos";
import { deriveStatus } from "./lead-status-rules";

export { LEAD_STATUSES, deriveStatus } from "./lead-status-rules";

/** Recomputes the lead's status from its phases and saves it when it changed. Returns the (new) status. */
export async function syncLeadStatus(leadId: string): Promise<string | undefined> {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) return undefined;
  const phases = await getLeadPhases(lead);
  // Una etapa omitida cuenta como superada para el estado del paciente.
  const next = deriveStatus(lead.status, lead.appointmentAt, phases.map((phase) => ({ key: phase.key, kind: phase.kind, complete: phase.complete || phase.skipped })));
  if (next !== lead.status) await db.update(leadsTable).set({ status: next, updatedAt: new Date() }).where(eq(leadsTable.id, leadId));
  return next;
}

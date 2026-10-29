import { Router, type IRouter, type Request } from "express";
import { desc, eq } from "drizzle-orm";
import { db, centersTable, usersTable, clinicContractAcceptancesTable } from "@workspace/db";
import { requireStaffAuth, requireSupraAuth } from "./auth";
import { centerPlan } from "../lib/plans";
import { CONTRACT_VERSION, contractFor, contractsEnabled } from "../lib/contract";
import { uid } from "../lib/helpers";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const ID = /^[\w.-]{1,200}$/;

type Row = typeof clinicContractAcceptancesTable.$inferSelect;
const publicRow = (row: Row) => ({
  id: row.id, plan: row.plan, version: row.contractVersion, hash: row.contractHash,
  byName: row.acceptedByName, byEmail: row.acceptedByEmail, byRole: row.acceptedByRole,
  ip: row.ip, acceptedAt: row.acceptedAt.toISOString(),
});

// Si la tabla aún no existe (SQL sin correr), el contrato simplemente no se ofrece: nadie queda bloqueado.
async function acceptancesOf(centerId: string): Promise<Row[] | null> {
  try {
    return await db.select().from(clinicContractAcceptancesTable)
      .where(eq(clinicContractAcceptancesTable.centerId, centerId))
      .orderBy(desc(clinicContractAcceptancesTable.acceptedAt));
  } catch (error) {
    logger.warn({ err: error }, "clinic_contract_acceptances unavailable");
    return null;
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return (first || req.ip || "").slice(0, 64);
}

// La clínica ve su contrato y si falta aceptarlo (versión y plan vigentes).
router.get("/clinic/contract", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const rows = contractsEnabled() ? await acceptancesOf(staff.centerId) : null;
  if (!rows) { res.json({ enabled: false }); return; }
  const plan = await centerPlan(staff.centerId);
  const [user] = await db.select({ legal: usersTable.legalRepresentative }).from(usersTable).where(eq(usersTable.id, staff.userId));
  const latest = rows[0] ?? null;
  const accepted = latest !== null && rows.some((row) => row.contractVersion === CONTRACT_VERSION && row.plan === plan);
  res.json({
    enabled: true,
    plan,
    contract: contractFor(plan),
    accepted,
    acceptance: accepted ? publicRow(rows.find((row) => row.contractVersion === CONTRACT_VERSION && row.plan === plan)!) : null,
    canAccept: staff.role === "administrativo" || user?.legal === true || staff.legal === true,
  });
});

// Aceptación: solo el administrativo o el representante legal; queda guardada con el hash del texto visto.
router.post("/clinic/contract/accept", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!contractsEnabled()) { res.status(404).json({ error: "Contrato no disponible." }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, staff.userId));
  if (!(staff.role === "administrativo" || user?.legalRepresentative === true || staff.legal === true)) {
    res.status(403).json({ error: "Solo el administrativo o el representante legal de la clínica puede aceptar el contrato." });
    return;
  }
  const plan = await centerPlan(staff.centerId);
  const contract = contractFor(plan);
  const body = (req.body ?? {}) as { version?: unknown; hash?: unknown };
  if (body.version !== contract.version || body.hash !== contract.hash) {
    res.status(409).json({ error: "El contrato cambió mientras lo leías. Vuelve a abrirlo y revisa la versión actual." });
    return;
  }
  const existing = await acceptancesOf(staff.centerId);
  if (existing === null) { res.status(503).json({ error: "Aceptación no disponible por ahora." }); return; }
  if (existing.some((row) => row.contractVersion === contract.version && row.plan === plan)) {
    res.json({ accepted: true, acceptance: publicRow(existing.find((row) => row.contractVersion === contract.version && row.plan === plan)!) });
    return;
  }
  const [row] = await db.insert(clinicContractAcceptancesTable).values({
    id: uid(), centerId: staff.centerId, plan, contractVersion: contract.version, contractHash: contract.hash,
    acceptedByUserId: staff.userId, acceptedByName: user?.name ?? "", acceptedByEmail: user?.email ?? "",
    acceptedByRole: staff.legal ? "director" : user?.legalRepresentative ? "representante legal" : staff.role,
    ip: clientIp(req) || null, userAgent: String(req.headers["user-agent"] ?? "").slice(0, 300) || null,
  }).returning();
  logger.info({ event: "clinic_contract_accepted", centerId: staff.centerId, plan, version: contract.version, userId: staff.userId }, "Clinic contract accepted");
  res.status(201).json({ accepted: true, acceptance: publicRow(row!) });
});

// Supra-control: historial de aceptaciones de una clínica y si está al día con la versión vigente.
router.get("/director/centers/:id/contract", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const id = String(req.params.id);
  if (!ID.test(id)) { res.status(404).json({ error: "Clínica no encontrada." }); return; }
  const [center] = await db.select({ id: centersTable.id }).from(centersTable).where(eq(centersTable.id, id));
  if (!center) { res.status(404).json({ error: "Clínica no encontrada." }); return; }
  const rows = await acceptancesOf(id);
  const plan = await centerPlan(id);
  const current = rows?.find((row) => row.contractVersion === CONTRACT_VERSION && row.plan === plan) ?? null;
  res.json({
    enabled: contractsEnabled(),
    available: rows !== null,
    version: CONTRACT_VERSION,
    plan,
    status: current ? "aceptado" : "pendiente",
    history: (rows ?? []).map(publicRow),
  });
});

export default router;

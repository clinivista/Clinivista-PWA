import { Router, type IRouter, type Request } from "express";
import { desc, eq } from "drizzle-orm";
import { db, centersTable, usersTable, clinicContractAcceptancesTable } from "@workspace/db";
import { requireStaffAuth, requireSupraAuth } from "./auth";
import { PLANS, PLAN_DEFAULT_LIMITS, PLAN_SERVICES, centerPlan } from "../lib/plans";
import { CONTRACT_VERSION, contractsEnabled } from "../lib/contract";
import { contractForCenter } from "../lib/contract-party";
import { uid } from "../lib/helpers";
import { logger } from "../lib/logger";
import { InviteAcceptError, acceptViaInvite, invitesOf, inviteInfo, legalRepresentatives, sendContract } from "../lib/contract-invite";
import { throttled } from "../lib/patient-accounts";
import { baseUrl } from "./results";

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

// Plan contratado y comparativa con los demás planes (sin precios: aún por definir). Solo el administrativo o el
// representante legal ve el apartado; el resto recibe canManage=false y la pantalla no lo ofrece.
router.get("/clinic/plan-catalog", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const [user] = await db.select({ legal: usersTable.legalRepresentative }).from(usersTable).where(eq(usersTable.id, staff.userId));
  const canManage = staff.role === "administrativo" || user?.legal === true || staff.legal === true;
  res.json({
    canManage,
    current: await centerPlan(staff.centerId),
    plans: PLANS.map((id) => ({ id, limits: PLAN_DEFAULT_LIMITS[id], services: PLAN_SERVICES[id] })),
  });
});

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
    contract: await contractForCenter(staff.centerId, plan),
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
  const contract = await contractForCenter(staff.centerId, plan);
  if (contract.missing.length > 0) {
    res.status(422).json({ error: `Antes de aceptar faltan datos para el contrato: ${contract.missing.join(", ")}. Complétalos en la ficha de la clínica y en Usuarios.`, missing: contract.missing });
    return;
  }
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
  const invites = await invitesOf(id);
  const reps = await legalRepresentatives(id);
  const plan = await centerPlan(id);
  const current = rows?.find((row) => row.contractVersion === CONTRACT_VERSION && row.plan === plan) ?? null;
  res.json({
    enabled: contractsEnabled(),
    available: rows !== null,
    version: CONTRACT_VERSION,
    plan,
    status: current ? "aceptado" : "pendiente",
    history: (rows ?? []).map(publicRow),
    legalReps: reps,
    missing: (await contractForCenter(id, plan)).missing,
    mailAvailable: invites !== null,
    invites: (invites ?? []).map((row) => ({ id: row.id, userId: row.userId, email: row.email, plan: row.plan, version: row.contractVersion, sentAt: row.sentAt.toISOString(), expiresAt: row.expiresAt.toISOString(), usedAt: row.usedAt?.toISOString() ?? null })),
  });
});

// Supra-control: enviar o reenviar el contrato por correo al representante legal (a todos los activos, o a uno).
router.post("/director/centers/:id/contract/send", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const id = String(req.params.id);
  if (!ID.test(id)) { res.status(404).json({ error: "Clínica no encontrada." }); return; }
  if (!contractsEnabled()) { res.status(409).json({ error: "El contrato aún no está activado (CONTRACTS_ENABLED en Render)." }); return; }
  if ((await invitesOf(id)) === null) { res.status(503).json({ error: "El envío no está disponible: falta ejecutar sql0005 en Neon." }); return; }
  const preview = await contractForCenter(id, await centerPlan(id));
  if (preview.missing.length > 0) { res.status(422).json({ error: `Faltan datos para armar el contrato: ${preview.missing.join(", ")}. Complétalos en la ficha de la clínica y en Usuarios.`, missing: preview.missing }); return; }
  const userId = typeof (req.body as { userId?: unknown } | undefined)?.userId === "string" ? (req.body as { userId: string }).userId : undefined;
  const results = await sendContract(id, baseUrl(req), userId);
  if (results === null) { res.status(404).json({ error: "Clínica no encontrada." }); return; }
  if (results.length === 0) { res.status(422).json({ error: "La clínica no tiene un representante legal activo. Créalo o márcalo en Usuarios." }); return; }
  res.json({ results });
});

// Página pública del correo: el enlace único identifica al representante legal (sin iniciar sesión).
router.get("/contract-invite", async (req, res): Promise<void> => {
  if (throttled(`contract-invite-ip:${clientIp(req)}`, 60, 15 * 60_000)) { res.status(429).json({ error: "Demasiados intentos. Espera unos minutos." }); return; }
  const info = await inviteInfo(req.query.token);
  res.setHeader("Cache-Control", "no-store");
  if (!info) { res.status(404).json({ error: "El enlace no es válido o ya venció." }); return; }
  res.json({ clinicName: info.clinicName, recipientName: info.user.name, plan: info.plan, contract: info.contract, accepted: info.accepted });
});

router.post("/contract-invite/accept", async (req, res): Promise<void> => {
  if (throttled(`contract-invite-ip:${clientIp(req)}`, 60, 15 * 60_000)) { res.status(429).json({ error: "Demasiados intentos. Espera unos minutos." }); return; }
  const body = (req.body ?? {}) as { token?: unknown; version?: unknown; hash?: unknown };
  try {
    const result = await acceptViaInvite(body.token, body.version, body.hash, clientIp(req), String(req.headers["user-agent"] ?? ""));
    res.status(result.already ? 200 : 201).json({ accepted: true, acceptedAt: result.acceptedAt });
  } catch (error) {
    if (error instanceof InviteAcceptError) { res.status(error.status).json({ error: error.message }); return; }
    throw error;
  }
});

export default router;

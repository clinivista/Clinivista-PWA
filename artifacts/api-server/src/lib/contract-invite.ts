import crypto from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, centersTable, usersTable, clinicContractAcceptancesTable, clinicContractInvitesTable } from "@workspace/db";
import { CONTRACT_VERSION, contractsEnabled } from "./contract";
import { contractForCenter } from "./contract-party";
import { centerPlan, type Plan } from "./plans";
import { MailNotConfiguredError, contractMail, sendMail } from "./mailer";
import { uid } from "./helpers";
import { logger } from "./logger";

const INVITE_TTL_MS = 30 * 24 * 60 * 60_000;
const PLAN_LABEL: Record<Plan, string> = { basic: "Basic", unlimited: "Unlimited", titanium: "Titanium" };
const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const dateText = (date: Date) => date.toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Santiago" });

export type SendOutcome = { userId: string; email: string; name: string; status: "enviado" | "sin_correo_configurado" | "error" };

/** Representantes legales activos de una clínica (los que reciben el contrato). */
export async function legalRepresentatives(centerId: string) {
  return db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable)
    .where(and(eq(usersTable.centerId, centerId), eq(usersTable.legalRepresentative, true), eq(usersTable.active, true)));
}

/** Crea un enlace único (anula los anteriores sin usar de esa persona) y envía el correo. */
async function sendOne(centerId: string, centerName: string, plan: Plan, rep: { id: string; name: string; email: string }, baseUrl: string): Promise<SendOutcome> {
  const base = baseUrl.replace(/\/+$/, "");
  const token = crypto.randomBytes(32).toString("base64url");
  const contract = await contractForCenter(centerId, plan);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await db.delete(clinicContractInvitesTable).where(and(eq(clinicContractInvitesTable.userId, rep.id), isNull(clinicContractInvitesTable.usedAt)));
  const inviteId = uid();
  await db.insert(clinicContractInvitesTable).values({
    id: inviteId, centerId, userId: rep.id, email: rep.email, tokenHash: sha256(token), plan, contractVersion: contract.version, expiresAt,
  });
  const outcome = { userId: rep.id, email: rep.email, name: rep.name };
  try {
    await sendMail(contractMail({
      to: rep.email, name: rep.name, clinicName: centerName, planLabel: PLAN_LABEL[plan], version: contract.version, annex: contract.annex,
      link: `${base}/contrato?token=${encodeURIComponent(token)}`, expiresOn: dateText(expiresAt),
      logoUrl: `${base}/clinivista-logo.png`, siteUrl: process.env.PUBLIC_SITE_URL?.trim() || "https://clinivista.cl",
    }));
    return { ...outcome, status: "enviado" };
  } catch (error) {
    await db.delete(clinicContractInvitesTable).where(eq(clinicContractInvitesTable.id, inviteId));
    if (error instanceof MailNotConfiguredError) return { ...outcome, status: "sin_correo_configurado" };
    logger.error({ err: error, centerId }, "Could not send the contract email");
    return { ...outcome, status: "error" };
  }
}

/** Envía (o reenvía) el contrato a los representantes legales de la clínica, o solo a uno (`userId`). */
export async function sendContract(centerId: string, baseUrl: string, userId?: string): Promise<SendOutcome[] | null> {
  const [center] = await db.select({ name: centersTable.name }).from(centersTable).where(eq(centersTable.id, centerId));
  if (!center) return null;
  const plan = await centerPlan(centerId);
  const reps = (await legalRepresentatives(centerId)).filter((rep) => !userId || rep.id === userId);
  const results: SendOutcome[] = [];
  for (const rep of reps) results.push(await sendOne(centerId, center.name, plan, rep, baseUrl));
  logger.info({ event: "clinic_contract_sent", centerId, plan, version: CONTRACT_VERSION, count: results.length }, "Clinic contract sent");
  return results;
}

/** Al crear al representante legal: envío automático. Nunca rompe la creación del usuario. */
export async function sendContractToNewRepresentative(centerId: string, userId: string, baseUrl: string): Promise<void> {
  if (!contractsEnabled()) return;
  try {
    const plan = await centerPlan(centerId);
    if ((await contractForCenter(centerId, plan)).missing.length > 0) {
      logger.info({ centerId }, "Contract email not sent: the clinic or representative data is incomplete");
      return;
    }
    await sendContract(centerId, baseUrl, userId);
  } catch (error) {
    logger.warn({ err: error, centerId }, "Automatic contract email failed");
  }
}

export async function invitesOf(centerId: string) {
  try {
    return await db.select().from(clinicContractInvitesTable).where(eq(clinicContractInvitesTable.centerId, centerId))
      .orderBy(desc(clinicContractInvitesTable.sentAt)).limit(10);
  } catch {
    return null;
  }
}

/** El enlace del correo: quién es, de qué clínica y el contrato vigente de su plan. */
export async function inviteInfo(token: unknown) {
  if (!contractsEnabled() || typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  try {
    const [invite] = await db.select().from(clinicContractInvitesTable)
      .where(and(eq(clinicContractInvitesTable.tokenHash, sha256(token)), gt(clinicContractInvitesTable.expiresAt, new Date())));
    if (!invite) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, invite.userId));
    const [center] = await db.select({ name: centersTable.name, active: centersTable.active }).from(centersTable).where(eq(centersTable.id, invite.centerId));
    if (!user || !user.active || !user.legalRepresentative || user.centerId !== invite.centerId || !center) return null;
    const plan = await centerPlan(invite.centerId);
    const contract = await contractForCenter(invite.centerId, plan);
    const done = await db.select({ id: clinicContractAcceptancesTable.id, at: clinicContractAcceptancesTable.acceptedAt, by: clinicContractAcceptancesTable.acceptedByName })
      .from(clinicContractAcceptancesTable)
      .where(and(eq(clinicContractAcceptancesTable.centerId, invite.centerId), eq(clinicContractAcceptancesTable.plan, plan), eq(clinicContractAcceptancesTable.contractVersion, contract.version)));
    return { invite, user, clinicName: center.name, plan, contract, accepted: done[0] ? { at: done[0].at.toISOString(), by: done[0].by } : null };
  } catch (error) {
    logger.warn({ err: error }, "Contract invite lookup failed");
    return null;
  }
}

export class InviteAcceptError extends Error {
  constructor(message: string, readonly status: 404 | 409) { super(message); }
}

/** Acepta desde el enlace del correo: queda el mismo registro que la aceptación dentro del panel. */
export async function acceptViaInvite(token: unknown, version: unknown, hash: unknown, ip: string, userAgent: string) {
  const info = await inviteInfo(token);
  if (!info) throw new InviteAcceptError("El enlace no es válido o ya venció.", 404);
  if (info.accepted) return { already: true as const, acceptedAt: info.accepted.at };
  if (info.contract.missing.length > 0) throw new InviteAcceptError(`Faltan datos para el contrato: ${info.contract.missing.join(", ")}. Pídele a Clinivista que los complete.`, 409);
  if (version !== info.contract.version || hash !== info.contract.hash) {
    throw new InviteAcceptError("El contrato cambió mientras lo leías. Recarga la página y revisa la versión actual.", 409);
  }
  const now = new Date();
  await db.insert(clinicContractAcceptancesTable).values({
    id: uid(), centerId: info.invite.centerId, plan: info.plan, contractVersion: info.contract.version, contractHash: info.contract.hash,
    acceptedByUserId: info.user.id, acceptedByName: info.user.name, acceptedByEmail: info.user.email,
    acceptedByRole: "representante legal (enlace por correo)", ip: ip || null, userAgent: userAgent.slice(0, 300) || null, acceptedAt: now,
  });
  await db.update(clinicContractInvitesTable).set({ usedAt: now }).where(eq(clinicContractInvitesTable.id, info.invite.id));
  logger.info({ event: "clinic_contract_accepted", via: "email", centerId: info.invite.centerId, plan: info.plan, version: info.contract.version, userId: info.user.id }, "Clinic contract accepted");
  return { already: false as const, acceptedAt: now.toISOString() };
}

import crypto from "crypto";
import { and, eq, inArray, ne } from "drizzle-orm";
import {
  db, leadsTable, patientAccountsTable, resultDeliveriesTable, hashPassword, verifyPassword, normalizeEmail, type Lead,
} from "@workspace/db";
import { uid } from "./helpers";
import { accountMail, MailNotConfiguredError, sendMail } from "./mailer";
import { clinicIdentity } from "./clinic-identity";
import { logger } from "./logger";

const SETUP_TTL_MS = 7 * 24 * 3600 * 1000;
const RESET_TTL_MS = 3600 * 1000;
export const MIN_PASSWORD = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

// ---- patient sessions (in memory, like the staff ones) ----
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;
const sessions = new Map<string, { accountId: string; expiresAt: number }>();

export function createPatientSession(accountId: string): string {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { accountId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}
export function getPatientSession(token: string | undefined): string | undefined {
  const session = token ? sessions.get(token) : undefined;
  if (!token || !session) return undefined;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return undefined;
  }
  return session.accountId;
}
export function destroyPatientSession(token: string | undefined) {
  if (token) sessions.delete(token);
}
function destroySessionsOf(accountId: string) {
  for (const [token, session] of sessions) if (session.accountId === accountId) sessions.delete(token);
}

// ---- throttling (in memory; enough for a single instance) ----
const attempts = new Map<string, { count: number; resetAt: number }>();
/** True when the key has used up its allowance for the window. */
export function throttled(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export function resetThrottleForTests() {
  attempts.clear();
}

// ---- accounts ----
async function issueToken(accountId: string, ttlMs: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await db.update(patientAccountsTable)
    .set({ tokenHash: sha256(token), tokenExpiresAt: new Date(Date.now() + ttlMs), updatedAt: new Date() })
    .where(eq(patientAccountsTable.id, accountId));
  return token;
}

async function sendAccountMail(accountEmail: string, centerId: string | null, kind: "setup" | "reset", token: string, baseUrl: string, language?: string | null) {
  const identity = await clinicIdentity(centerId);
  const link = `${baseUrl.replace(/\/+$/, "")}/paciente/clave?token=${token}`;
  await sendMail(accountMail({ to: accountEmail, clinicName: identity.name, link, kind, language }));
}

/**
 * Registers the patient's account from the email they typed in the form, links
 * the case to it and, when the account has no password yet, emails the link to
 * create one. Never throws: the evaluation must go on even if the mail fails.
 */
export async function ensurePatientAccountForLead(lead: Lead, baseUrl: string): Promise<void> {
  try {
    const email = (lead.email ?? "").trim();
    if (!EMAIL.test(email) || lead.patientAccountId) return;
    const normalized = normalizeEmail(email);
    await db.insert(patientAccountsTable).values({ id: uid(18), email, emailNormalized: normalized }).onConflictDoNothing();
    const [account] = await db.select().from(patientAccountsTable).where(eq(patientAccountsTable.emailNormalized, normalized));
    if (!account) return;
    await db.update(leadsTable).set({ patientAccountId: account.id }).where(eq(leadsTable.id, lead.id));
    // Signed in with Google (verified email) or already has a password: nothing to set up.
    if (account.passwordHash || account.emailVerified) return;
    const token = await issueToken(account.id, SETUP_TTL_MS);
    await sendAccountMail(account.email, lead.centerId ?? null, "setup", token, baseUrl, lead.language);
  } catch (error) {
    if (error instanceof MailNotConfiguredError) {
      logger.info("Patient account created; no mail service configured, so no link to choose a password was sent");
      return;
    }
    logger.warn({ err: error }, "Could not register the patient account");
  }
}

/** The account of a verified Google profile: created on first use, and marked as verified. */
export async function signInWithGoogle(profile: { email: string; name: string }): Promise<string> {
  const normalized = normalizeEmail(profile.email);
  await db.insert(patientAccountsTable).values({ id: uid(18), email: profile.email, emailNormalized: normalized, name: profile.name, emailVerified: true })
    .onConflictDoNothing();
  const [account] = await db.select().from(patientAccountsTable).where(eq(patientAccountsTable.emailNormalized, normalized));
  await db.update(patientAccountsTable)
    .set({ emailVerified: true, name: account.name || profile.name, updatedAt: new Date() })
    .where(eq(patientAccountsTable.id, account.id));
  return account.id;
}

export async function accountProfile(accountId: string): Promise<{ email: string; name: string } | null> {
  const [account] = await db.select().from(patientAccountsTable).where(eq(patientAccountsTable.id, accountId));
  return account ? { email: account.email, name: account.name } : null;
}

export async function requestPasswordReset(email: string, baseUrl: string, language?: string | null): Promise<void> {
  const normalized = normalizeEmail(email);
  const [account] = await db.select().from(patientAccountsTable).where(eq(patientAccountsTable.emailNormalized, normalized));
  if (!account) return;
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.patientAccountId, account.id)).limit(1);
  const kind = account.passwordHash ? "reset" : "setup";
  const token = await issueToken(account.id, kind === "reset" ? RESET_TTL_MS : SETUP_TTL_MS);
  await sendAccountMail(account.email, lead?.centerId ?? null, kind, token, baseUrl, language || lead?.language);
}

export class AccountError extends Error {
  constructor(message: string, readonly status: 400 | 401 | 429 = 400) {
    super(message);
  }
}

export function checkPassword(password: unknown): string {
  if (typeof password !== "string" || password.length < MIN_PASSWORD || password.length > 100) {
    throw new AccountError(`La clave debe tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  return password;
}

/** One-time link from the email: sets the password. Returns the account id. */
export async function setPasswordWithToken(token: unknown, password: unknown): Promise<string> {
  const clean = checkPassword(password);
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) throw new AccountError("Este enlace ya no es válido. Pide uno nuevo.");
  const [account] = await db.select().from(patientAccountsTable).where(eq(patientAccountsTable.tokenHash, sha256(token)));
  if (!account || !account.tokenExpiresAt || account.tokenExpiresAt.getTime() < Date.now()) {
    throw new AccountError("Este enlace ya no es válido. Pide uno nuevo.");
  }
  await db.update(patientAccountsTable)
    .set({ passwordHash: hashPassword(clean), tokenHash: null, tokenExpiresAt: null, updatedAt: new Date() })
    .where(eq(patientAccountsTable.id, account.id));
  destroySessionsOf(account.id);
  return account.id;
}

export async function loginPatient(email: unknown, password: unknown, ip: string): Promise<string> {
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) throw new AccountError("Ingresa tu correo y tu clave.");
  const normalized = normalizeEmail(email);
  if (throttled(`login:${normalized}`, 8, 15 * 60_000) || throttled(`login-ip:${ip}`, 40, 15 * 60_000)) {
    throw new AccountError("Demasiados intentos. Espera unos minutos.", 429);
  }
  const [account] = await db.select().from(patientAccountsTable).where(eq(patientAccountsTable.emailNormalized, normalized));
  // Same work and same message whether the account exists or not.
  const stored = account?.passwordHash ?? hashPassword("sin-cuenta");
  const ok = verifyPassword(password, stored) && Boolean(account?.passwordHash);
  if (!account || !ok) throw new AccountError("Correo o clave incorrectos.", 401);
  return account.id;
}

export async function portalOverview(accountId: string) {
  const [account] = await db.select().from(patientAccountsTable).where(eq(patientAccountsTable.id, accountId));
  if (!account) return null;
  const leads = await db.select().from(leadsTable).where(eq(leadsTable.patientAccountId, accountId));
  const deliveries = leads.length
    ? await db.select().from(resultDeliveriesTable).where(and(
        inArray(resultDeliveriesTable.leadId, leads.map((lead) => lead.id)),
        ne(resultDeliveriesTable.status, "failed"),
      ))
    : [];
  const cases = [];
  for (const lead of leads) {
    const identity = await clinicIdentity(lead.centerId);
    cases.push({
      leadId: lead.id,
      clinicName: identity.name,
      patientName: lead.name,
      results: deliveries
        .filter((delivery) => delivery.leadId === lead.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((delivery) => ({ id: delivery.id, createdAt: delivery.createdAt })),
    });
  }
  return { email: account.email, cases };
}

/** The PDF of a delivery, only when it belongs to a case of this account. */
export async function portalResultPath(accountId: string, deliveryId: string): Promise<string | null> {
  const [delivery] = await db.select().from(resultDeliveriesTable).where(eq(resultDeliveriesTable.id, deliveryId));
  if (!delivery || delivery.status === "failed") return null;
  const [lead] = await db.select({ accountId: leadsTable.patientAccountId }).from(leadsTable).where(eq(leadsTable.id, delivery.leadId));
  return lead?.accountId === accountId ? delivery.objectPath : null;
}

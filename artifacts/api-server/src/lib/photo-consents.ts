import crypto from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, leadsTable, photoConsentsTable, usersTable, type ConsentFile, type Lead, type PhotoConsent } from "@workspace/db";
import { clinicIdentity } from "./clinic-identity";
import { ensureEvaluationForLead } from "./clinical-photos";
import { createObjectKey, privatePhotoStorage } from "./clinical-photo-storage";
import { assertCanStore } from "./plan-limits";
import { sendMail, type Mail } from "./mailer";
import { toMailLanguage } from "./mail-i18n";
import { PHOTO_CONSENT_VERSION, photoConsentText, snapshotOf } from "./photo-consent-text";
import { uid } from "./helpers";

export const LINK_TTL_MS = 7 * 24 * 3600_000;
export const CODE_TTL_MS = 10 * 60_000;
export const MAX_CODE_ATTEMPTS = 5;

const sha256 = (value: string | Buffer) => crypto.createHash("sha256").update(value).digest("hex");
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function maskEmail(email: string): string {
  const [name, domain = ""] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

async function staffName(userId: string): Promise<string> {
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  return user?.name || userId;
}

const wrap = (language: string, body: string) => `<div dir="${language === "ar" ? "rtl" : "ltr"}">${body}</div>`;

export function consentLinkMail(input: { to: string; clinicName: string; patientName: string; link: string; language: string }): Mail {
  const language = toMailLanguage(input.language);
  const m = photoConsentText(language).mail;
  const intro = m.intro(input.clinicName);
  return {
    to: input.to,
    subject: m.subject(input.clinicName),
    text: `${m.hello(input.patientName)}\n\n${intro}\n${m.button}:\n${input.link}\n\n${m.note}`,
    html: wrap(language, `<p>${escapeHtml(m.hello(input.patientName))}</p><p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(input.link)}">${escapeHtml(m.button)}</a></p><p style="color:#666">${escapeHtml(m.note)}</p>`),
  };
}

export function consentCodeMail(input: { to: string; clinicName: string; code: string; language: string }): Mail {
  const language = toMailLanguage(input.language);
  const m = photoConsentText(language).mail;
  const intro = m.codeIntro(input.code);
  return {
    to: input.to,
    subject: m.codeSubject(input.clinicName),
    text: `${intro}\n\n${m.codeNote}`,
    html: wrap(language, `<p>${escapeHtml(intro)}</p><p style="color:#666">${escapeHtml(m.codeNote)}</p>`),
  };
}

/** Lo que se muestra de una autorización: nunca el hash, el código ni la ruta interna del archivo. */
export const publicConsent = (row: PhotoConsent) => ({
  id: row.id, method: row.method, status: row.status, language: row.language, textVersion: row.textVersion,
  verifiedBy: row.verifiedBy, requestedByName: row.requestedByName, registeredByName: row.registeredByName,
  contact: row.contact, createdAt: row.createdAt, grantedAt: row.grantedAt, revokedAt: row.revokedAt, revokeNote: row.revokeNote,
  expiresAt: row.expiresAt, hasFile: Boolean(row.file), fileMime: row.file?.mimeType ?? null,
});

export async function consentsForLead(centerId: string, leadId: string): Promise<PhotoConsent[]> {
  return db.select().from(photoConsentsTable)
    .where(and(eq(photoConsentsTable.centerId, centerId), eq(photoConsentsTable.leadId, leadId)))
    .orderBy(desc(photoConsentsTable.createdAt));
}

// ── Enlace para el paciente ───────────────────────────────────────────────
export async function requestLinkConsent(lead: Lead, userId: string, language: string): Promise<{ row: PhotoConsent; token: string }> {
  const centerId = lead.centerId ?? "default-center";
  // Un solo enlace vigente a la vez: el anterior queda cancelado.
  await db.update(photoConsentsTable).set({ status: "cancelled" })
    .where(and(eq(photoConsentsTable.leadId, lead.id), eq(photoConsentsTable.status, "pending"), eq(photoConsentsTable.method, "link")));
  const token = crypto.randomBytes(24).toString("base64url");
  const [row] = await db.insert(photoConsentsTable).values({
    id: uid(18), centerId, leadId: lead.id, method: "link", status: "pending", language: toMailLanguage(language),
    tokenHash: sha256(token), expiresAt: new Date(Date.now() + LINK_TTL_MS), requestedByName: await staffName(userId),
    contact: lead.email || lead.phone || "",
  }).returning();
  return { row, token };
}

async function byToken(token: string) {
  const [row] = await db.select().from(photoConsentsTable).where(eq(photoConsentsTable.tokenHash, sha256(token)));
  if (!row) return null;
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, row.leadId));
  return lead ? { row, lead } : null;
}

export type PublicConsentView =
  | { state: "invalid" }
  | { state: "done"; status: string; grantedAt: Date | null }
  | { state: "open"; clinicName: string; clinicLogo: string | null; patientName: string; language: string; title: string; intro: string; points: string[]; checkbox: string; requiresCode: boolean; maskedEmail: string | null };

export async function viewByToken(token: string, language?: string): Promise<PublicConsentView> {
  const found = await byToken(token);
  if (!found) return { state: "invalid" };
  const { row, lead } = found;
  if (row.status === "granted" || row.status === "declined") return { state: "done", status: row.status, grantedAt: row.grantedAt };
  if (row.status !== "pending" || !row.expiresAt || row.expiresAt.getTime() < Date.now()) return { state: "invalid" };
  const chosen = toMailLanguage(language || row.language);
  const identity = await clinicIdentity(lead.centerId);
  const text = photoConsentText(chosen);
  const hasEmail = EMAIL.test((lead.email ?? "").trim());
  return {
    state: "open", clinicName: identity.name, clinicLogo: identity.logoDataUrl, patientName: lead.name, language: chosen, title: text.title, intro: text.intro(identity.name),
    points: text.points, checkbox: text.checkbox, requiresCode: hasEmail, maskedEmail: hasEmail ? maskEmail(lead.email!.trim()) : null,
  };
}

export async function sendCode(token: string, language?: string): Promise<"sent" | "invalid" | "no_email"> {
  const found = await byToken(token);
  if (!found || found.row.status !== "pending" || !found.row.expiresAt || found.row.expiresAt.getTime() < Date.now()) return "invalid";
  const email = (found.lead.email ?? "").trim();
  if (!EMAIL.test(email)) return "no_email";
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const identity = await clinicIdentity(found.lead.centerId);
  await db.update(photoConsentsTable)
    .set({ codeHash: sha256(`${found.row.id}:${code}`), codeExpiresAt: new Date(Date.now() + CODE_TTL_MS), codeAttempts: 0 })
    .where(eq(photoConsentsTable.id, found.row.id));
  await sendMail(consentCodeMail({ to: email, clinicName: identity.name, code, language: language || found.row.language }));
  return "sent";
}

export type AcceptResult = "granted" | "invalid" | "code_required" | "code_wrong" | "code_expired" | "too_many_attempts";

export async function acceptByToken(token: string, input: { language?: string; code?: string; ip: string; userAgent: string }): Promise<AcceptResult> {
  const found = await byToken(token);
  if (!found || found.row.status !== "pending" || !found.row.expiresAt || found.row.expiresAt.getTime() < Date.now()) return "invalid";
  const { row, lead } = found;
  const hasEmail = EMAIL.test((lead.email ?? "").trim());
  if (hasEmail) {
    if (!input.code || !row.codeHash) return "code_required";
    if (row.codeAttempts >= MAX_CODE_ATTEMPTS) return "too_many_attempts";
    if (!row.codeExpiresAt || row.codeExpiresAt.getTime() < Date.now()) return "code_expired";
    const expected = Buffer.from(row.codeHash);
    const given = Buffer.from(sha256(`${row.id}:${input.code.trim()}`));
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
      await db.update(photoConsentsTable).set({ codeAttempts: row.codeAttempts + 1 }).where(eq(photoConsentsTable.id, row.id));
      return "code_wrong";
    }
  }
  const language = toMailLanguage(input.language || row.language);
  const identity = await clinicIdentity(lead.centerId);
  await db.update(photoConsentsTable).set({
    status: "granted", grantedAt: new Date(), language, textVersion: PHOTO_CONSENT_VERSION, textSnapshot: snapshotOf(language, identity.name),
    verifiedBy: hasEmail ? "email_code" : "link", ip: input.ip.slice(0, 80), userAgent: input.userAgent.slice(0, 300), codeHash: null,
  }).where(eq(photoConsentsTable.id, row.id));
  return "granted";
}

export async function declineByToken(token: string, input: { ip: string; userAgent: string }): Promise<boolean> {
  const found = await byToken(token);
  if (!found || found.row.status !== "pending") return false;
  await db.update(photoConsentsTable).set({ status: "declined", ip: input.ip.slice(0, 80), userAgent: input.userAgent.slice(0, 300), codeHash: null })
    .where(eq(photoConsentsTable.id, found.row.id));
  return true;
}

// ── Documento firmado subido por la clínica ──────────────────────────────
async function storeConsentFile(lead: Lead, mimeType: string, bytes: Buffer): Promise<ConsentFile> {
  const evaluation = await ensureEvaluationForLead(lead);
  await assertCanStore(evaluation.centerId);
  const stored = await privatePhotoStorage.put({
    key: createObjectKey({ centerId: evaluation.centerId, evaluationId: evaluation.id, kind: "original", contentType: mimeType }),
    bytes, contentType: mimeType,
  });
  return { objectPath: stored.objectPath, mimeType, bytes: bytes.length, sha256: sha256(bytes) };
}

export async function registerDocumentConsent(lead: Lead, userId: string, input: { mimeType: string; bytes: Buffer; label: string }): Promise<PhotoConsent> {
  const file = await storeConsentFile(lead, input.mimeType, input.bytes);
  const name = await staffName(userId);
  const [row] = await db.insert(photoConsentsTable).values({
    id: uid(18), centerId: lead.centerId ?? "default-center", leadId: lead.id, method: "document", status: "granted",
    textVersion: input.label.trim().slice(0, 120), verifiedBy: "document", file, requestedByName: name, registeredByName: name, grantedAt: new Date(),
  }).returning();
  return row;
}

// ── Firma en tableta, en la clínica ───────────────────────────────────────
const PNG_HEADER = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_SIGNATURE_BYTES = 400 * 1024;

export function parseSignature(dataUrl: unknown): Buffer | null {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) return null;
  const bytes = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  return bytes.length > 100 && bytes.length <= MAX_SIGNATURE_BYTES && bytes.subarray(0, 8).equals(PNG_HEADER) ? bytes : null;
}

export async function registerTabletConsent(lead: Lead, userId: string, input: { language: string; signature: Buffer }): Promise<PhotoConsent> {
  const file = await storeConsentFile(lead, "image/png", input.signature);
  const name = await staffName(userId);
  const language = toMailLanguage(input.language);
  const identity = await clinicIdentity(lead.centerId);
  const [row] = await db.insert(photoConsentsTable).values({
    id: uid(18), centerId: lead.centerId ?? "default-center", leadId: lead.id, method: "tablet", status: "granted", language,
    textVersion: PHOTO_CONSENT_VERSION, textSnapshot: snapshotOf(language, identity.name), verifiedBy: "in_clinic", file,
    requestedByName: name, registeredByName: name, grantedAt: new Date(),
  }).returning();
  return row;
}

export async function revokeConsent(centerId: string, leadId: string, id: string, note: string): Promise<PhotoConsent | null> {
  const [row] = await db.update(photoConsentsTable)
    .set({ status: "revoked", revokedAt: new Date(), revokeNote: note.trim().slice(0, 500) })
    .where(and(eq(photoConsentsTable.id, id), eq(photoConsentsTable.centerId, centerId), eq(photoConsentsTable.leadId, leadId), eq(photoConsentsTable.status, "granted")))
    .returning();
  return row ?? null;
}

export async function consentFile(centerId: string, leadId: string, id: string) {
  const [row] = await db.select().from(photoConsentsTable)
    .where(and(eq(photoConsentsTable.id, id), eq(photoConsentsTable.centerId, centerId), eq(photoConsentsTable.leadId, leadId)));
  if (!row?.file) return null;
  return privatePhotoStorage.read(row.file.objectPath).catch(() => null);
}

/** Al eliminar la ficha se eliminan sus autorizaciones y los archivos asociados. */
export async function deletePhotoConsentsForLeads(leadIds: string[]): Promise<void> {
  if (!leadIds.length) return;
  try {
    const rows = await db.select().from(photoConsentsTable).where(inArray(photoConsentsTable.leadId, leadIds));
    for (const row of rows) if (row.file) await privatePhotoStorage.remove(row.file.objectPath).catch(() => undefined);
    await db.delete(photoConsentsTable).where(inArray(photoConsentsTable.leadId, leadIds));
  } catch {
    // Tabla aún no creada: no hay nada que borrar.
  }
}

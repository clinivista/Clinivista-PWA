import express, { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { requireStaffAuth } from "./auth";
import { baseUrl } from "./results";
import { throttled } from "../lib/patient-accounts";
import { MAX_PHOTO_BYTES, parseImageRequest } from "../lib/image-upload";
import { clinicIdentity } from "../lib/clinic-identity";
import { MailNotConfiguredError, MailSendError, sendMail } from "../lib/mailer";
import { toMailLanguage } from "../lib/mail-i18n";
import { PHOTO_CONSENT_VERSION, photoConsentText } from "../lib/photo-consent-text";
import {
  acceptByToken, consentFile, consentLinkMail, consentsForLead, declineByToken, parseSignature, publicConsent, registerDocumentConsent,
  registerTabletConsent, requestLinkConsent, revokeConsent, sendCode, viewByToken,
} from "../lib/photo-consents";

const router: IRouter = Router();
const clientOf = (req: Request) => ({ ip: req.ip ?? "", userAgent: String(req.headers["user-agent"] ?? "") });
const tooMany = (req: Request) => throttled(`consent-ip:${req.ip}`, 40, 15 * 60_000);

// ── Paciente: abre el enlace que le envió la clínica (no necesita cuenta) ──
router.get("/consents/photo/:token", async (req, res): Promise<void> => {
  if (tooMany(req)) { res.status(429).json({ error: "Demasiados intentos. Intenta más tarde." }); return; }
  res.setHeader("Cache-Control", "private, no-store");
  res.json(await viewByToken(String(req.params.token), typeof req.query.lang === "string" ? req.query.lang : undefined));
});

router.post("/consents/photo/:token/code", async (req, res): Promise<void> => {
  const token = String(req.params.token);
  if (tooMany(req) || throttled(`consent-code:${token.slice(0, 16)}`, 3, 15 * 60_000)) { res.status(429).json({ error: "Demasiados códigos pedidos. Espera unos minutos." }); return; }
  try {
    const result = await sendCode(token, typeof req.body?.language === "string" ? req.body.language : undefined);
    if (result === "invalid") { res.status(404).json({ error: "Este enlace no es válido o venció." }); return; }
    if (result === "no_email") { res.status(422).json({ error: "No hay correo para enviar el código." }); return; }
    res.json({ ok: true });
  } catch (error) {
    res.status(error instanceof MailNotConfiguredError ? 503 : 502).json({ error: "No pudimos enviar el código. Pide ayuda a la clínica." });
  }
});

router.post("/consents/photo/:token/accept", async (req, res): Promise<void> => {
  if (tooMany(req)) { res.status(429).json({ error: "Demasiados intentos. Intenta más tarde." }); return; }
  const result = await acceptByToken(String(req.params.token), {
    language: typeof req.body?.language === "string" ? req.body.language : undefined,
    code: typeof req.body?.code === "string" ? req.body.code : undefined,
    ...clientOf(req),
  });
  if (result === "granted") { res.json({ ok: true }); return; }
  res.status(result === "invalid" ? 404 : result === "too_many_attempts" ? 429 : 422).json({ error: result, code: result });
});

router.post("/consents/photo/:token/decline", async (req, res): Promise<void> => {
  if (tooMany(req)) { res.status(429).json({ error: "Demasiados intentos. Intenta más tarde." }); return; }
  if (!(await declineByToken(String(req.params.token), clientOf(req)))) { res.status(404).json({ error: "Este enlace no es válido o venció." }); return; }
  res.json({ ok: true });
});

// ── Clínica ───────────────────────────────────────────────────────────────
async function leadOfCenter(centerId: string, id: string) {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  return lead && (lead.centerId ?? "default-center") === centerId ? lead : null;
}

router.get("/leads/:id/photo-consent", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  const rows = (await consentsForLead(staff.centerId, lead.id).catch(() => [] as Awaited<ReturnType<typeof consentsForLead>>)).filter((row) => row.status !== "cancelled");
  res.json({ consents: rows.map(publicConsent), hasEmail: Boolean((lead.email ?? "").trim()), email: (lead.email ?? "").trim(), language: lead.language || "es", currentVersion: PHOTO_CONSENT_VERSION });
});

// El texto que se le muestra al paciente en la tableta, con el nombre de la clínica.
router.get("/leads/:id/photo-consent/text", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  const language = toMailLanguage(req.query.lang || lead.language);
  const text = photoConsentText(language);
  const identity = await clinicIdentity(lead.centerId);
  res.json({ language, version: PHOTO_CONSENT_VERSION, clinicName: identity.name, clinicLogo: identity.logoDataUrl, patientName: lead.name, title: text.title, intro: text.intro(identity.name), points: text.points, checkbox: text.checkbox });
});

router.post("/leads/:id/photo-consent/request", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  const channel = req.body?.channel;
  if (channel !== "email" && channel !== "whatsapp" && channel !== "link") { res.status(400).json({ error: "Canal inválido." }); return; }
  const email = (lead.email ?? "").trim();
  if (channel === "email" && !email) { res.status(422).json({ error: "El paciente no tiene correo registrado." }); return; }
  const language = toMailLanguage(req.body?.language || lead.language);
  const { row, token } = await requestLinkConsent(lead, staff.userId, language);
  const url = `${baseUrl(req).replace(/\/+$/, "")}/consentimiento/${token}`;
  const identity = await clinicIdentity(lead.centerId);
  let emailSent = false;
  let emailError = "";
  if (channel === "email") {
    try {
      await sendMail(consentLinkMail({ to: email, clinicName: identity.name, patientName: lead.name, link: url, language }));
      emailSent = true;
    } catch (error) {
      emailError = error instanceof MailNotConfiguredError || error instanceof MailSendError ? error.message : "No pudimos enviar el correo.";
    }
  }
  res.status(201).json({
    ok: true, id: row.id, url, emailSent, emailError, expiresAt: row.expiresAt,
    whatsappText: photoConsentText(language).mail.whatsapp(lead.name, identity.name, url),
  });
});

const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
router.post("/leads/:id/photo-consent/document", express.raw({ type: DOCUMENT_TYPES, limit: MAX_PHOTO_BYTES }), async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  const mimeType = String(req.headers["content-type"] ?? "").split(";")[0].toLowerCase();
  const body = req.body as unknown;
  let valid = false;
  if (mimeType === "application/pdf") valid = Buffer.isBuffer(body) && body.subarray(0, 5).toString("latin1") === "%PDF-";
  else if (DOCUMENT_TYPES.includes(mimeType)) valid = Boolean(await parseImageRequest(req));
  if (!valid) { res.status(400).json({ error: "El documento debe ser un PDF o una imagen JPEG, PNG o WebP de hasta 10 MB." }); return; }
  let label = "";
  try { label = decodeURIComponent(String(req.headers["x-document-label"] ?? "")); } catch { label = ""; }
  const row = await registerDocumentConsent(lead, staff.userId, { mimeType, bytes: body as Buffer, label });
  res.status(201).json({ ok: true, consent: publicConsent(row) });
});

router.post("/leads/:id/photo-consent/tablet", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  const signature = parseSignature(req.body?.signature);
  if (req.body?.accepted !== true || !signature) { res.status(400).json({ error: "Falta la firma o la aceptación del paciente." }); return; }
  const row = await registerTabletConsent(lead, staff.userId, { language: String(req.body?.language ?? lead.language ?? "es"), signature });
  res.status(201).json({ ok: true, consent: publicConsent(row) });
});

router.post("/leads/:id/photo-consent/:consentId/revoke", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  const row = await revokeConsent(staff.centerId, lead.id, String(req.params.consentId), typeof req.body?.note === "string" ? req.body.note : "");
  if (!row) { res.status(404).json({ error: "Autorización no encontrada." }); return; }
  res.json({ ok: true });
});

router.get("/leads/:id/photo-consent/:consentId/file", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  const file = lead ? await consentFile(staff.centerId, lead.id, String(req.params.consentId)) : null;
  if (!file) { res.status(404).json({ error: "Archivo no encontrado." }); return; }
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(file.bytes);
});

export default router;

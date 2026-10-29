import { logger } from "./logger";
import { MAIL_TEXT, toMailLanguage } from "./mail-i18n";
import { STAFF_RESET_TEXT } from "./staff-reset-i18n";
import { EVOLUTION_TEXT } from "./evolution-i18n";
import { toPdfLanguage } from "./result-pdf-i18n";

export class MailNotConfiguredError extends Error {
  constructor() {
    super("El envío de correos no está configurado en el servidor.");
  }
}

export class MailSendError extends Error {}

export type MailAttachment = { filename: string; content: Buffer; contentType?: string };
export type Mail = { to: string; subject: string; text: string; html: string; attachments?: MailAttachment[] };

/**
 * Sends a transactional email through Resend's REST API. The key lives only in
 * the server's environment (RESEND_API_KEY) with the verified sender in
 * MAIL_FROM, e.g. `Clínica Ejemplo <resultados@tudominio.cl>`.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) throw new MailNotConfiguredError();
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html,
        ...(mail.attachments?.length
          ? { attachments: mail.attachments.map((file) => ({ filename: file.filename, content: file.content.toString("base64"), ...(file.contentType ? { content_type: file.contentType } : {}) })) }
          : {}),
      }),
      signal: AbortSignal.timeout(mail.attachments?.length ? 30_000 : 15_000),
    });
  } catch (error) {
    logger.error({ err: error }, "Mail provider unreachable");
    throw new MailSendError("No pudimos contactar el servicio de correo.");
  }
  if (!response.ok) {
    logger.error({ status: response.status }, "Mail provider rejected the message");
    throw new MailSendError("El servicio de correo rechazó el envío. Revisa el remitente configurado.");
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

function wrap(language: string, body: string): string {
  return `<div dir="${language === "ar" ? "rtl" : "ltr"}">${body}</div>`;
}

export function resultsMail(input: { to: string; clinicName: string; patientName: string; link: string; language?: string | null }): Mail {
  const language = toMailLanguage(input.language);
  const t = MAIL_TEXT[language];
  const link = escapeHtml(input.link);
  return {
    to: input.to,
    subject: t.resultsSubject(input.clinicName),
    text: `${t.hello(input.patientName)}\n\n${t.resultsIntro(input.clinicName)}\n${t.resultsButton}:\n${input.link}\n\n${t.resultsNote}`,
    html: wrap(language,
      `<p>${escapeHtml(t.hello(input.patientName))}</p><p>${escapeHtml(t.resultsIntro(input.clinicName))}</p>` +
      `<p><a href="${link}">${escapeHtml(t.resultsButton)}</a></p>` +
      `<p style="color:#666">${escapeHtml(t.resultsNote)}</p>`),
  };
}

/** The Evolución comparison as a PDF attachment. Sent to the patient (greeting by name) or to another address (names the patient). */
export function evolutionMail(input: { to: string; clinicName: string; patientName: string; pdf: Buffer; filename: string; toPatient: boolean; language?: string | null }): Mail {
  const language = toMailLanguage(input.language);
  const t = EVOLUTION_TEXT[toPdfLanguage(language)];
  const intro = input.toPatient ? t.mailIntro(input.clinicName) : t.mailIntroOther(input.clinicName, input.patientName);
  const greeting = input.toPatient ? `${MAIL_TEXT[language].hello(input.patientName)}\n\n` : "";
  return {
    to: input.to,
    subject: t.subject(input.clinicName),
    text: `${greeting}${intro}\n\n${t.note}`,
    html: wrap(language,
      (input.toPatient ? `<p>${escapeHtml(MAIL_TEXT[language].hello(input.patientName))}</p>` : "") +
      `<p>${escapeHtml(intro)}</p><p style="color:#666">${escapeHtml(t.note)}</p>`),
    attachments: [{ filename: input.filename, content: input.pdf, contentType: "application/pdf" }],
  };
}

export function staffResetMail(input: { to: string; name?: string | null; link: string; language?: string | null }): Mail {
  const language = toMailLanguage(input.language);
  const t = STAFF_RESET_TEXT[language];
  const note = `${t.note} ${t.ignore}`;
  return {
    to: input.to,
    subject: t.subject,
    text: `${t.hello(input.name || undefined)}\n\n${t.intro}\n\n${input.link}\n\n${note}`,
    html: wrap(language,
      `<p>${escapeHtml(t.hello(input.name || undefined))}</p><p>${escapeHtml(t.intro)}</p>` +
      `<p><a href="${escapeHtml(input.link)}">${escapeHtml(t.button)}</a></p>` +
      `<p style="color:#666">${escapeHtml(note)}</p>`),
  };
}

export function accountMail(input: { to: string; clinicName: string; link: string; kind: "setup" | "reset"; language?: string | null }): Mail {
  const language = toMailLanguage(input.language);
  const t = MAIL_TEXT[language];
  const link = escapeHtml(input.link);
  const setup = input.kind === "setup";
  const intro = setup ? t.setupIntro(input.clinicName) : t.resetIntro;
  const button = setup ? t.setupButton : t.resetButton;
  const note = `${t.linkNote(setup ? t.days7 : t.hour1)} ${t.ignore}`;
  return {
    to: input.to,
    subject: setup ? t.setupSubject(input.clinicName) : t.resetSubject,
    text: `${t.hello()}\n\n${intro}\n\n${input.link}\n\n${note}`,
    html: wrap(language,
      `<p>${escapeHtml(t.hello())}</p><p>${escapeHtml(intro)}</p>` +
      `<p><a href="${link}">${escapeHtml(button)}</a></p>` +
      `<p style="color:#666">${escapeHtml(note)}</p>`),
  };
}

/** Internal report for the clinic's staff (Spanish, like the staff panel): who still needs a diagnosis, with a direct link to each. */
export function pendingReportMail(input: {
  to: string;
  clinicName: string;
  patients: Array<{ name: string; documentId: string; waitingDays: number; link: string }>;
  baseUrl: string;
}): Mail {
  const total = input.patients.length;
  const subject = total === 0 ? `Sin pacientes pendientes de diagnóstico - ${input.clinicName}` : `${total} ${total === 1 ? "paciente pendiente" : "pacientes pendientes"} de diagnóstico - ${input.clinicName}`;
  const waiting = (days: number) => (days === 0 ? "hoy" : days === 1 ? "hace 1 día" : `hace ${days} días`);
  const panel = `${input.baseUrl.replace(/\/+$/, "")}/admin`;
  const text =
    total === 0
      ? `No hay pacientes pendientes de diagnóstico en ${input.clinicName}.\n\nPanel: ${panel}`
      : `Pacientes pendientes de diagnóstico en ${input.clinicName} (${total}):\n\n` +
        input.patients.map((p) => `- ${p.name}${p.documentId ? ` (${p.documentId})` : ""} · esperando ${waiting(p.waitingDays)}\n  ${p.link}`).join("\n") +
        `\n\nPanel: ${panel}`;
  const rows = input.patients
    .map(
      (p) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(p.name)}${p.documentId ? `<br><span style="color:#888;font-size:12px">${escapeHtml(p.documentId)}</span>` : ""}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap">${escapeHtml(waiting(p.waitingDays))}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #eee"><a href="${escapeHtml(p.link)}" style="background:#0d3b9e;color:#fff;padding:7px 14px;border-radius:8px;text-decoration:none;font-size:13px">Diagnosticar</a></td></tr>`,
    )
    .join("");
  return {
    to: input.to,
    subject,
    text,
    html:
      `<div><p><strong>${escapeHtml(input.clinicName)}</strong></p>` +
      (total === 0
        ? `<p>No hay pacientes pendientes de diagnóstico.</p>`
        : `<p>Pacientes con la pre-evaluación completa que aún esperan diagnóstico (${total}):</p><table style="border-collapse:collapse;font-size:14px">${rows}</table>`) +
      `<p style="margin-top:16px"><a href="${escapeHtml(panel)}">Abrir el panel</a></p>` +
      `<p style="color:#888;font-size:12px">Los enlaces piden iniciar sesión si no tienes la sesión abierta.</p></div>`,
  };
}

const BRAND = { navy: "#0A1F4D", blue: "#1D5FD8", mist: "#EAF2FC", ink: "#0B1F33", muted: "#4A5F82", line: "#D6E2F5" };
const BRAND_FONT = `'Outfit','Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

/**
 * Contrato de servicio para el representante legal de una clínica. Mismo estilo que el sitio
 * (azul marino, azul Clinivista, Outfit). El correo trae el resumen del plan y el panel de
 * aceptación; la casilla y el botón «Aceptar» están en la página segura a la que lleva el botón.
 */
export function contractMail(input: {
  to: string; name?: string | null; clinicName: string; planLabel: string; version: string;
  annex: { label: string; value: string }[]; link: string; expiresOn: string; logoUrl: string; siteUrl: string;
}): Mail {
  const greeting = input.name ? `Hola ${input.name},` : "Hola,";
  const intro = `Te enviamos el contrato de servicio de ${input.clinicName} con Clinivista (plan ${input.planLabel}). Eres el representante legal registrado de la clínica, por eso te corresponde revisarlo y aceptarlo.`;
  const note = `El enlace es personal y vence el ${input.expiresOn}. Si no esperabas este correo, ignóralo o escríbenos desde el panel de soporte.`;
  const rows = input.annex.map((row) =>
    `<tr><td style="padding:9px 14px;border-bottom:1px solid ${BRAND.line};color:${BRAND.muted};font-size:14px">${escapeHtml(row.label)}</td>` +
    `<td style="padding:9px 14px;border-bottom:1px solid ${BRAND.line};color:${BRAND.ink};font-size:14px;font-weight:600;text-align:right">${escapeHtml(row.value)}</td></tr>`).join("");
  const link = escapeHtml(input.link);
  const text = `${greeting}\n\n${intro}\n\nResumen del plan ${input.planLabel}:\n` +
    input.annex.map((row) => `- ${row.label}: ${row.value}`).join("\n") +
    `\n\nPara leer el contrato completo y aceptarlo (casilla de aceptación y botón «Aceptar contrato»):\n${input.link}\n\n${note}\n\nClinivista · ${input.siteUrl}`;
  const html =
    `<div style="margin:0;padding:24px 12px;background:${BRAND.mist};font-family:${BRAND_FONT}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid ${BRAND.line}">` +
    `<tr><td style="background:${BRAND.navy};padding:22px 28px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="background:#ffffff;border-radius:12px;padding:6px;line-height:0"><img src="${escapeHtml(input.logoUrl)}" width="40" height="40" alt="Clinivista" style="display:block;border:0"></td>` +
    `<td style="padding-left:12px;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:.2px;font-family:${BRAND_FONT}">Clinivista</td></tr></table>` +
    `</td></tr>` +
    `<tr><td style="padding:30px 28px 8px">` +
    `<p style="margin:0 0 6px;color:${BRAND.blue};font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase">Contrato de servicio · versión ${escapeHtml(input.version)}</p>` +
    `<h1 style="margin:0 0 14px;color:${BRAND.navy};font-size:24px;line-height:1.25">${escapeHtml(input.clinicName)}</h1>` +
    `<p style="margin:0 0 12px;color:${BRAND.ink};font-size:15px;line-height:1.6">${escapeHtml(greeting)}</p>` +
    `<p style="margin:0 0 20px;color:${BRAND.ink};font-size:15px;line-height:1.6">${escapeHtml(intro)}</p>` +
    `<p style="margin:0 0 8px;color:${BRAND.navy};font-size:15px;font-weight:700">Resumen del plan ${escapeHtml(input.planLabel)}</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-radius:12px;border-collapse:separate;overflow:hidden">${rows}</table>` +
    `</td></tr>` +
    `<tr><td style="padding:22px 28px 6px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.mist};border:1px solid ${BRAND.line};border-radius:14px"><tr><td style="padding:18px 20px">` +
    `<p style="margin:0 0 10px;color:${BRAND.navy};font-size:15px;font-weight:700">Aceptación del contrato</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr>` +
    `<td valign="top" style="padding-right:10px"><span style="display:inline-block;width:18px;height:18px;border:2px solid ${BRAND.blue};border-radius:4px;background:#ffffff"></span></td>` +
    `<td style="color:${BRAND.ink};font-size:14px;line-height:1.5">He leído el contrato de servicio y lo acepto en nombre de ${escapeHtml(input.clinicName)}.</td></tr></table>` +
    `<a href="${link}" style="display:inline-block;background:${BRAND.blue};color:#ffffff;padding:13px 26px;border-radius:999px;text-decoration:none;font-size:15px;font-weight:700">Leer y aceptar contrato</a>` +
    `<p style="margin:12px 0 0;color:${BRAND.muted};font-size:12px;line-height:1.5">Marcarás la casilla y pulsarás «Aceptar contrato» en la página segura. Queda registrado quién acepta, cuándo y qué versión.</p>` +
    `</td></tr></table>` +
    `</td></tr>` +
    `<tr><td style="padding:16px 28px 26px"><p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.6">${escapeHtml(note)}</p></td></tr>` +
    `<tr><td style="background:${BRAND.navy};padding:16px 28px"><p style="margin:0;color:#9CC0F5;font-size:12px">Clinivista · seguimiento fotográfico clínico · <a href="${escapeHtml(input.siteUrl)}" style="color:#ffffff;text-decoration:underline">${escapeHtml(input.siteUrl.replace(/^https?:\/\//, ""))}</a></p></td></tr>` +
    `</table></div>`;
  return { to: input.to, subject: `Contrato de servicio Clinivista · ${input.clinicName}`, text, html };
}

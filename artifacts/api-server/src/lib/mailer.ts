import { logger } from "./logger";
import { MAIL_TEXT, toMailLanguage } from "./mail-i18n";

export class MailNotConfiguredError extends Error {
  constructor() {
    super("El envío de correos no está configurado en el servidor.");
  }
}

export class MailSendError extends Error {}

export type Mail = { to: string; subject: string; text: string; html: string };

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
      body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(15_000),
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

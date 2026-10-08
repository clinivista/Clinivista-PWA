import { logger } from "./logger";

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

export function resultsMail(input: { to: string; clinicName: string; patientName: string; link: string }): Mail {
  const clinic = escapeHtml(input.clinicName);
  const name = escapeHtml(input.patientName);
  const link = escapeHtml(input.link);
  return {
    to: input.to,
    subject: `Sus resultados - ${input.clinicName}`,
    text:
      `Hola ${input.patientName},\n\nEl equipo médico de ${input.clinicName} ya respondió a su evaluación.\n` +
      `Puede descargar sus resultados (PDF) aquí:\n${input.link}\n\nEl enlace estará disponible por 30 días.`,
    html:
      `<p>Hola ${name},</p><p>El equipo médico de ${clinic} ya respondió a su evaluación.</p>` +
      `<p><a href="${link}">Descargar mis resultados (PDF)</a></p>` +
      `<p style="color:#666">El enlace estará disponible por 30 días.</p>`,
  };
}

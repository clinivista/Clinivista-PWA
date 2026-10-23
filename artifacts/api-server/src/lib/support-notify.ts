import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sendMail, MailNotConfiguredError } from "./mailer";
import { logger } from "./logger";

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/**
 * Avisa por correo a los directores activos que entró un ticket nuevo y queda en espera.
 * Nunca interrumpe la creación del ticket: si el correo no está configurado o falla, solo se registra.
 */
export async function notifyDirectorsNewTicket(input: {
  number: number; subject: string; clinicName: string; requesterName: string; firstMessage: string; panelUrl: string;
}): Promise<void> {
  try {
    const directors = await db.select({ email: usersTable.email }).from(usersTable)
      .where(and(eq(usersTable.role, "director"), eq(usersTable.active, true)));
    const subject = `Nuevo ticket #${input.number} en espera · ${input.clinicName}`;
    const preview = input.firstMessage.length > 300 ? `${input.firstMessage.slice(0, 300)}…` : input.firstMessage;
    const text = `${input.requesterName} (${input.clinicName}) abrió el ticket #${input.number}: ${input.subject}\n\n${preview}\n\nAtiéndelo en el panel de supra-control: ${input.panelUrl}`;
    const html = `<p><b>${esc(input.requesterName)}</b> (${esc(input.clinicName)}) abrió el ticket <b>#${input.number}</b>: ${esc(input.subject)}</p>` +
      `<blockquote>${esc(preview).replace(/\n/g, "<br>")}</blockquote>` +
      `<p><a href="${esc(input.panelUrl)}">Atender en el panel de supra-control</a></p>`;
    for (const director of directors) {
      await sendMail({ to: director.email, subject, text, html }).catch((error) => {
        if (error instanceof MailNotConfiguredError) logger.warn("New support ticket: mail service not configured, no email sent to directors");
        else logger.error({ err: error }, "Could not email a director about a new support ticket");
      });
    }
  } catch (error) {
    logger.error({ err: error }, "Could not notify directors about a new support ticket");
  }
}

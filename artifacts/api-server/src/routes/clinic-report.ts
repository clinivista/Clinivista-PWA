import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { UpdateClinicReportBody } from "@workspace/api-zod";
import { requireStaffAuth } from "./auth";
import { baseUrl } from "./results";
import { MailSendError } from "../lib/mailer";
import { ReportError, getReportConfig, pendingDiagnoses, saveReportConfig, sendReport } from "../lib/pending-report";

const router: IRouter = Router();

/** The clinic's legal representative configures the report (read from the DB on every request). */
async function isLegalRepresentative(userId: string, centerId: string): Promise<boolean> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return Boolean(user && user.active && user.centerId === centerId && user.legalRepresentative);
}

async function state(centerId: string, canEdit: boolean, base: string) {
  const [config, pending] = await Promise.all([getReportConfig(centerId), pendingDiagnoses(centerId, base)]);
  return {
    canEdit,
    mailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM),
    config: { ...config, lastSentAt: config.lastSentAt?.toISOString() ?? null },
    pending,
  };
}

router.get("/clinic/report", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  res.json(await state(staff.centerId, await isLegalRepresentative(staff.userId, staff.centerId), baseUrl(req)));
});

router.put("/clinic/report", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!(await isLegalRepresentative(staff.userId, staff.centerId))) {
    res.status(403).json({ error: "Solo el representante legal puede configurar el informe." });
    return;
  }
  const body = UpdateClinicReportBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "La configuración enviada no es válida." });
    return;
  }
  try {
    await saveReportConfig(staff.centerId, body.data);
  } catch (error) {
    if (error instanceof ReportError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
  res.json(await state(staff.centerId, true, baseUrl(req)));
});

router.post("/clinic/report/send", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!(await isLegalRepresentative(staff.userId, staff.centerId))) {
    res.status(403).json({ error: "Solo el representante legal puede enviar el informe." });
    return;
  }
  try {
    const result = await sendReport(staff.centerId, baseUrl(req));
    res.json({ sent: result.sent, pending: result.pending });
  } catch (error) {
    if (error instanceof ReportError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof MailSendError) {
      res.status(502).json({ error: error.message });
      return;
    }
    throw error;
  }
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable, usersTable } from "@workspace/db";
import { requireStaffAuth } from "./auth";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";
import { buildResultsForLead, deliverResults, listDeliveries, readDeliveryPdf, ResultsError, whatsappNumber } from "../lib/results";
import { DiagnosisError } from "../lib/diagnosis";

const router: IRouter = Router();
const ID = /^[\w.-]{1,200}$/;

function baseUrl(req: Request): string {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) return configured;
  const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol).split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] ?? req.get("host") ?? "").split(",")[0].trim();
  return `${proto}://${host}`;
}

async function open(req: Request, res: Response) {
  const staff = requireStaffAuth(req, res);
  if (!staff) return undefined;
  const id = String(req.params.id);
  const [lead] = ID.test(id) ? await db.select().from(leadsTable).where(eq(leadsTable.id, id)) : [];
  if (!lead || (lead.centerId ?? DEFAULT_CENTER_ID) !== staff.centerId) {
    res.status(404).json({ error: "Caso no encontrado." });
    return undefined;
  }
  return { staff, lead };
}

function fail(error: unknown, res: Response): void {
  if (error instanceof ResultsError || error instanceof DiagnosisError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  throw error;
}

router.get("/leads/:id/results", async (req, res): Promise<void> => {
  const ctx = await open(req, res);
  if (!ctx) return;
  const channel = ctx.lead.deliveryChannel === "email" || ctx.lead.deliveryChannel === "whatsapp" ? ctx.lead.deliveryChannel : null;
  res.json({
    preferredChannel: channel,
    email: ctx.lead.email || null,
    phone: whatsappNumber(ctx.lead.phone) ? ctx.lead.phone : null,
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM),
    deliveries: await listDeliveries(ctx.lead),
  });
});

// Preview/download for staff: always built from the current closed diagnosis.
router.get("/leads/:id/results/pdf", async (req, res): Promise<void> => {
  const ctx = await open(req, res);
  if (!ctx) return;
  try {
    const pdf = await buildResultsForLead(ctx.lead);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="resultados.pdf"');
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(pdf);
  } catch (error) {
    fail(error, res);
  }
});

router.post("/leads/:id/results/deliver", async (req, res): Promise<void> => {
  const ctx = await open(req, res);
  if (!ctx) return;
  const channel = (req.body as { channel?: unknown } | undefined)?.channel;
  if (channel !== "email" && channel !== "whatsapp") {
    res.status(400).json({ error: "Elige correo o WhatsApp." });
    return;
  }
  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, ctx.staff.userId));
  try {
    res.json(await deliverResults(ctx.lead, { userId: ctx.staff.userId, name: user ? (user.name || user.email) : null }, channel, baseUrl(req)));
  } catch (error) {
    fail(error, res);
  }
});

// Public: the patient opens the secret link they were sent. Unknown, expired and
// malformed tokens all look the same.
router.get("/results/:token", async (req, res): Promise<void> => {
  const pdf = await readDeliveryPdf(String(req.params.token));
  if (!pdf) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'inline; filename="resultados.pdf"');
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.send(pdf);
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { requireStaffAuth } from "./auth";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";
import { EvolutionError, buildEvolutionForLead, getEvolution, sendEvolution } from "../lib/evolution";

const router: IRouter = Router();
const ID = /^[\w.-]{1,200}$/;
const ZONE = /^[\w.-]{1,120}$/;

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

function zonesFrom(value: unknown): string[] | undefined {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const keys = list.map((item) => String(item).trim()).filter((item) => ZONE.test(item)).slice(0, 30);
  return keys.length ? keys : undefined;
}

function fail(error: unknown, res: Response): void {
  if (error instanceof EvolutionError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  throw error;
}

// The patient's photos grouped by anatomical zone, one cell per phase.
router.get("/leads/:id/evolution", async (req, res): Promise<void> => {
  const ctx = await open(req, res);
  if (!ctx) return;
  res.json({ ...(await getEvolution(ctx.lead)), patientEmail: ctx.lead.email || null, emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM) });
});

router.get("/leads/:id/evolution/pdf", async (req, res): Promise<void> => {
  const ctx = await open(req, res);
  if (!ctx) return;
  try {
    const pdf = await buildEvolutionForLead(ctx.lead, zonesFrom(req.query.zones));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="evolucion.pdf"');
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(pdf);
  } catch (error) {
    fail(error, res);
  }
});

router.post("/leads/:id/evolution/send", async (req, res): Promise<void> => {
  const ctx = await open(req, res);
  if (!ctx) return;
  const body = (req.body ?? {}) as { email?: unknown; zones?: unknown };
  try {
    res.json(await sendEvolution(ctx.lead, ctx.staff, {
      to: typeof body.email === "string" ? body.email : null,
      zoneKeys: zonesFrom(body.zones),
    }));
  } catch (error) {
    fail(error, res);
  }
});

export default router;

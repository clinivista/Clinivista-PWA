import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { CreateInvitationBody } from "@workspace/api-zod";
import { requireAuth } from "./auth";
import { uid, clean, cleanPhone } from "../lib/helpers";

const router: IRouter = Router();

function leadSummary(lead: typeof leadsTable.$inferSelect) {
  const { photos, symptoms, surgeryHistory, notes, ...safe } = lead;
  return { ...safe, photoCount: Number(safe.photoCount) || 0 };
}

router.post("/invitations", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const parsed = CreateInvitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }

  const token = uid(24);
  const newLead = {
    id: uid(),
    token,
    name: clean(parsed.data.name ?? "", 100),
    phone: cleanPhone(parsed.data.phone ?? ""),
    age: "",
    city: "",
    hairLossTime: "",
    pattern: "",
    previousTreatment: "",
    symptoms: "",
    surgeryHistory: "",
    consent: false,
    photos: [],
    photoCount: "0",
    status: "nuevo",
    notes: "",
    norwood: "",
    appointmentAt: "",
    isDemo: false,
  };

  await db.insert(leadsTable).values(newLead);
  const [inserted] = await db.select().from(leadsTable).where(eq(leadsTable.id, newLead.id));

  const host = req.headers.host ?? "localhost";
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const link = `${protocol}://${host}/patient?token=${token}`;

  res.status(201).json({ ok: true, lead: leadSummary(inserted), link });
});

export default router;

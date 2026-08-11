import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import {
  GetLeadsQueryParams,
  GetLeadByIdParams,
  PatchLeadParams,
  PatchLeadBody,
} from "@workspace/api-zod";
import { requireAuth } from "./auth";
import { clean } from "../lib/helpers";

const router: IRouter = Router();

const ALLOWED_STATUSES = ["nuevo", "incompleto", "listo", "contactar", "agendado", "cerrado"];

function leadSummary(lead: typeof leadsTable.$inferSelect) {
  const { photos, symptoms, surgeryHistory, notes, ...safe } = lead;
  return {
    ...safe,
    photoCount: Number(safe.photoCount) || 0,
  };
}

function leadFull(lead: typeof leadsTable.$inferSelect) {
  return {
    ...lead,
    photoCount: Number(lead.photoCount) || 0,
    photos: Array.isArray(lead.photos) ? lead.photos : [],
  };
}

router.get("/leads", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const qp = GetLeadsQueryParams.safeParse(req.query);
  const status = qp.success ? (qp.data.status ?? "") : "";
  const search = qp.success ? (qp.data.search ?? "") : "";

  const allLeads = await db.select().from(leadsTable).orderBy(sql`${leadsTable.createdAt} desc`);

  let leads = allLeads;
  if (status && status !== "todos") {
    leads = leads.filter((l) => l.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    leads = leads.filter(
      (l) =>
        `${l.name} ${l.phone} ${l.city}`.toLowerCase().includes(q),
    );
  }

  res.json({ leads: leads.map(leadSummary) });
});

router.get("/leads/stats", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const allLeads = await db.select().from(leadsTable);
  const counts: Record<string, number> = {};
  for (const lead of allLeads) {
    const s = lead.status || "nuevo";
    counts[s] = (counts[s] || 0) + 1;
  }

  res.json({ total: allLeads.length, counts });
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const params = GetLeadByIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id));

  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }

  res.json(leadFull(lead));
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const params = PatchLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const body = PatchLeadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }

  const updates: Partial<typeof leadsTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.data.status && ALLOWED_STATUSES.includes(body.data.status)) {
    updates.status = body.data.status;
  }
  if (body.data.notes !== undefined) updates.notes = clean(body.data.notes, 1200);
  if (body.data.norwood !== undefined) updates.norwood = clean(body.data.norwood, 20);
  if (body.data.appointmentAt !== undefined) updates.appointmentAt = clean(body.data.appointmentAt, 40);

  const [updated] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }

  res.json(leadFull(updated));
});

export default router;

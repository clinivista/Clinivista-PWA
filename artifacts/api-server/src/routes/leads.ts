import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, leadsTable, centersTable } from "@workspace/db";
import {
  GetLeadPhotoFileParams,
  GetLeadsQueryParams,
  GetLeadByIdParams,
  PatchLeadParams,
  PatchLeadBody,
} from "@workspace/api-zod";
import { requireStaffAuth } from "./auth";
import { clean } from "../lib/helpers";
import { DEFAULT_CENTER_ID, deleteClinicalDataForLead, ensureClinicalConfiguration, getPhotoForStaff, getPhotoStatusesForLead } from "../lib/clinical-photos";
import { privatePhotoStorage } from "../lib/clinical-photo-storage";
import { clinicIdentity } from "../lib/clinic-identity";

const router: IRouter = Router();

const ALLOWED_STATUSES = ["nuevo", "incompleto", "listo", "contactar", "agendado", "cerrado"];

async function leadSummary(lead: typeof leadsTable.$inferSelect) {
  const { photos, symptoms, surgeryHistory, notes, ...safe } = lead;
  const clinicalPhotos = await getPhotoStatusesForLead(lead);
  const legacyKeys = Array.isArray(photos)
    ? (photos as Array<{ key?: unknown }>).flatMap((photo) => typeof photo?.key === "string" ? [photo.key] : [])
    : [];
  const visibleClinical = clinicalPhotos.filter((photo) => ["draft", "confirmed"].includes(photo.status));
  return {
    ...safe,
    photoCount: new Set([...legacyKeys, ...visibleClinical.map((photo) => photo.key)]).size,
    photoKeys: [...new Set([...legacyKeys, ...visibleClinical.map((photo) => photo.key)])],
  };
}

async function leadFull(lead: typeof leadsTable.$inferSelect) {
  const { photos: _legacyPhotos, ...safe } = lead;
  const photos = await getPhotoStatusesForLead(lead);
  return {
    ...safe,
    photoCount: photos.filter((photo) => ["draft", "confirmed"].includes(photo.status)).length,
    photos,
  };
}

// The signed-in staff member's own clinic, with the address patients use to
// register (app.../c/{slug}). Replaces the old generic /patient link, which
// always dropped patients into the main clinic whoever shared it.
router.get("/clinic/me", async (req, res): Promise<void> => {
  const context = requireStaffAuth(req, res);
  if (!context) return;
  // Only clinics with a row can be reached by address; make sure there is one.
  await ensureClinicalConfiguration(context.centerId);
  const [center] = await db.select({ slug: centersTable.slug }).from(centersTable).where(eq(centersTable.id, context.centerId));
  res.json({ ...(await clinicIdentity(context.centerId)), slug: center.slug });
});

router.get("/leads", async (req, res): Promise<void> => {
  const context = requireStaffAuth(req, res);
  if (!context) return;

  const qp = GetLeadsQueryParams.safeParse(req.query);
  const status = qp.success ? (qp.data.status ?? "") : "";
  const search = qp.success ? (qp.data.search ?? "") : "";

  const allLeads = (await db.select().from(leadsTable).orderBy(sql`${leadsTable.createdAt} desc`))
    .filter((lead) => (lead.centerId ?? DEFAULT_CENTER_ID) === context.centerId);

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

  res.json({ leads: await Promise.all(leads.map(leadSummary)) });
});

router.get("/leads/stats", async (req, res): Promise<void> => {
  const context = requireStaffAuth(req, res);
  if (!context) return;

  const allLeads = (await db.select().from(leadsTable))
    .filter((lead) => (lead.centerId ?? DEFAULT_CENTER_ID) === context.centerId);
  const counts: Record<string, number> = {};
  for (const lead of allLeads) {
    const s = lead.status || "nuevo";
    counts[s] = (counts[s] || 0) + 1;
  }

  res.json({ total: allLeads.length, counts });
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const context = requireStaffAuth(req, res);
  if (!context) return;

  const params = GetLeadByIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id));

  if (!lead || (lead.centerId ?? DEFAULT_CENTER_ID) !== context.centerId) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }

  res.json(await leadFull(lead));
});

router.get("/leads/:id/photos/:photoId", async (req, res): Promise<void> => {
  const context = requireStaffAuth(req, res);
  if (!context) return;
  const params = GetLeadPhotoFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!lead || (lead.centerId ?? DEFAULT_CENTER_ID) !== context.centerId) {
    res.status(404).json({ error: "Foto no encontrada." });
    return;
  }
  const photo = await getPhotoForStaff(lead, params.data.photoId);
  if (!photo) {
    res.status(404).json({ error: "Foto no encontrada." });
    return;
  }
  try {
    const file = await privatePhotoStorage.read(photo.derivativeObjectPath ?? photo.originalObjectPath);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Length", String(file.bytes.length));
    res.send(file.bytes);
  } catch {
    res.status(404).json({ error: "Foto no encontrada." });
  }
});

router.delete("/leads/:id", async (req, res): Promise<void> => {
  const context = requireStaffAuth(req, res);
  if (!context) return;

  const params = GetLeadByIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id));

  if (!lead || (lead.centerId ?? DEFAULT_CENTER_ID) !== context.centerId) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }

  await deleteClinicalDataForLead(lead);
  await db.delete(leadsTable).where(eq(leadsTable.id, params.data.id));

  res.json({ ok: true });
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const context = requireStaffAuth(req, res);
  if (!context) return;

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

  const [existing] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!existing || (existing.centerId ?? DEFAULT_CENTER_ID) !== context.centerId) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }

  const [updated] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }

  res.json(await leadFull(updated));
});

export default router;

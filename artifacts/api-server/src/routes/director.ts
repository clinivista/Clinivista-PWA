import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, centersTable, leadsTable, usersTable } from "@workspace/db";
import { GetDirectorCenterExportParams, PatchDirectorCenterBody, PatchDirectorCenterParams } from "@workspace/api-zod";
import { requireDirectorAuth } from "./auth";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";

const router: IRouter = Router();

async function centerSummaries() {
  const centers = await db.select().from(centersTable);
  // Every clinic that has ever received a patient or a staff account shows up,
  // even if `clinical_centers` doesn't have a row for it yet (it's created
  // lazily on first evaluation) — otherwise a brand-new clinic would be
  // invisible to the director until its first patient photo is captured.
  const leadCenterIds = await db.select({ centerId: leadsTable.centerId }).from(leadsTable);
  const userCenterIds = await db.select({ centerId: usersTable.centerId }).from(usersTable);
  const knownIds = new Set<string>(centers.map((center) => center.id));
  for (const row of leadCenterIds) knownIds.add(row.centerId ?? DEFAULT_CENTER_ID);
  for (const row of userCenterIds) if (row.centerId) knownIds.add(row.centerId);

  const centerById = new Map(centers.map((center) => [center.id, center]));
  const results = await Promise.all(
    [...knownIds].map(async (id) => {
      const center = centerById.get(id);
      const [{ patientCount }] = await db.select({ patientCount: sql<number>`count(*)::int` })
        .from(leadsTable)
        .where(sql`coalesce(${leadsTable.centerId}, ${DEFAULT_CENTER_ID}) = ${id}`);
      const [{ staffCount }] = await db.select({ staffCount: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.centerId, id));
      return {
        id,
        name: center?.name ?? (id === DEFAULT_CENTER_ID ? "Centro principal" : id),
        slug: center?.slug ?? id,
        active: center?.active ?? true,
        createdAt: center?.createdAt ?? new Date(0),
        patientCount,
        staffCount,
      };
    }),
  );
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

router.get("/director/centers", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;
  res.json({ centers: await centerSummaries() });
});

router.patch("/director/centers/:id", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;

  const params = PatchDirectorCenterParams.safeParse(req.params);
  const body = PatchDirectorCenterBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }

  const [existing] = await db.select().from(centersTable).where(eq(centersTable.id, params.data.id));
  if (existing) {
    await db.update(centersTable).set({ active: body.data.active }).where(eq(centersTable.id, params.data.id));
  } else {
    // A clinic that only exists implicitly (via leads/users) gets its row
    // created here, the first time a director touches its status.
    await db.insert(centersTable).values({
      id: params.data.id,
      name: params.data.id === DEFAULT_CENTER_ID ? "Centro principal" : params.data.id,
      slug: params.data.id,
      active: body.data.active,
    }).onConflictDoNothing();
  }

  const summaries = await centerSummaries();
  const updated = summaries.find((center) => center.id === params.data.id);
  if (!updated) {
    res.status(404).json({ error: "Clínica no encontrada." });
    return;
  }
  res.json(updated);
});

router.get("/director/centers/:id/export", async (req, res): Promise<void> => {
  const context = requireDirectorAuth(req, res);
  if (!context) return;

  const params = GetDirectorCenterExportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }

  const [center] = await db.select().from(centersTable).where(eq(centersTable.id, params.data.id));
  const leads = (await db.select().from(leadsTable))
    .filter((lead) => (lead.centerId ?? DEFAULT_CENTER_ID) === params.data.id);
  const staff = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    active: usersTable.active,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.centerId, params.data.id));

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    center: center ?? { id: params.data.id, name: params.data.id, slug: params.data.id, active: true },
    staff,
    // `token` is the patient's bearer credential for /api/patients/:token
    // (their data and clinical photos). This file is meant to leave the
    // platform, so it must carry the data, never access to it.
    patients: leads.map(({ photos: _photos, token: _token, ...lead }) => lead),
    note: "Este archivo no incluye las fotografías clínicas en sí (se guardan aparte, en almacenamiento de objetos privado). Contacta a Clinivista para coordinar la transferencia de esas fotos si la clínica deja la plataforma.",
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${params.data.id}-export-${Date.now()}.json"`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

export default router;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { UpdateClinicProtocolBody } from "@workspace/api-zod";
import { CONSULT_TEMPLATES, createCustomType, deleteType, enableTemplate, listConsultTypes, updateType } from "../lib/consult-types";
import { canManageClinicUsers, requireStaffAuth } from "./auth";
import { ProtocolConfigError, getProtocolStructure, replaceProtocolStructure } from "../lib/protocol-config";

const router: IRouter = Router();

/** Only the clinic's legal representative defines its phases (read from the DB on every request). */
async function isLegalRepresentative(userId: string, centerId: string): Promise<boolean> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return Boolean(user && user.active && user.centerId === centerId && user.legalRepresentative);
}

const typeParam = (req: { query: Record<string, unknown> }): string | undefined =>
  typeof req.query.typeId === "string" && req.query.typeId ? req.query.typeId : undefined;

router.get("/clinic/protocol", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  try {
    const { phases } = await getProtocolStructure(staff.centerId, typeParam(req));
    res.json({ canEdit: await isLegalRepresentative(staff.userId, staff.centerId), phases });
  } catch (error) {
    if (error instanceof ProtocolConfigError) { res.status(404).json({ error: error.message }); return; }
    throw error;
  }
});

router.put("/clinic/protocol", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!(await isLegalRepresentative(staff.userId, staff.centerId))) {
    res.status(403).json({ error: "Solo el representante legal puede configurar las fases." });
    return;
  }
  const body = UpdateClinicProtocolBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "La configuración enviada no es válida." });
    return;
  }
  try {
    await replaceProtocolStructure(staff.centerId, body.data.phases, typeParam(req));
  } catch (error) {
    if (error instanceof ProtocolConfigError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
  const { phases } = await getProtocolStructure(staff.centerId, typeParam(req));
  res.json({ canEdit: true, phases });
});

// ── Tipos de consulta (dermatología) ────────────────────────────────────
// Todo el personal los ve (para elegir uno al agregar un paciente); solo el
// representante legal los activa, crea, renombra o desactiva.

router.get("/clinic/consult-types", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  res.json({ ...(await listConsultTypes(staff.centerId)), canEdit: await isLegalRepresentative(staff.userId, staff.centerId) });
});

async function manage(req: Parameters<typeof requireStaffAuth>[0], res: Parameters<typeof requireStaffAuth>[1], action: (centerId: string) => Promise<unknown>, status = 201): Promise<void> {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!(await isLegalRepresentative(staff.userId, staff.centerId))) {
    res.status(403).json({ error: "Solo el representante legal puede configurar los tipos de consulta." });
    return;
  }
  try {
    const result = await action(staff.centerId);
    res.status(status).json({ ...(await listConsultTypes(staff.centerId)), canEdit: true, ...(typeof result === "string" ? { id: result } : {}) });
  } catch (error) {
    if (error instanceof ProtocolConfigError) { res.status(400).json({ error: error.message }); return; }
    throw error;
  }
}

router.post("/clinic/consult-types", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as { templateKey?: unknown; name?: unknown };
  await manage(req, res, (centerId) => {
    if (typeof body.templateKey === "string" && CONSULT_TEMPLATES.some((template) => template.key === body.templateKey)) return enableTemplate(centerId, body.templateKey);
    if (typeof body.name === "string") return createCustomType(centerId, body.name);
    throw new ProtocolConfigError("Elige una plantilla o escribe el nombre del nuevo tipo.");
  });
});

router.patch("/clinic/consult-types/:id", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as { name?: unknown; active?: unknown };
  await manage(req, res, async (centerId) => {
    await updateType(centerId, String(req.params.id), {
      ...(typeof body.name === "string" ? { name: body.name } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    });
  }, 200);
});

router.delete("/clinic/consult-types/:id", async (req, res): Promise<void> => {
  await manage(req, res, async (centerId) => {
    await deleteType(centerId, String(req.params.id));
  }, 200);
});

export default router;

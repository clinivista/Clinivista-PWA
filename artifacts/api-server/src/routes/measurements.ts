import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable, usersTable } from "@workspace/db";
import { requireStaffAuth } from "./auth";
import { DEFAULT_CENTER_ID, MeasurementError, saveMeasurement } from "../lib/clinical-photos";

const router: IRouter = Router();
const ID = /^[\w.-]{1,200}$/;
const TOKEN = /^[\w-]{10,200}$/;

async function respond(res: import("express").Response, run: () => Promise<unknown>): Promise<void> {
  try {
    const photo = await run();
    if (!photo) { res.status(404).json({ error: "Foto no encontrada." }); return; }
    res.json(photo);
  } catch (error) {
    if (error instanceof MeasurementError) { res.status(400).json({ error: error.message }); return; }
    throw error;
  }
}

// El paciente mide su propia foto de la pre-evaluación (el token de su enlace es la autorización).
const patientAction = (clear: boolean) => async (req: import("express").Request, res: import("express").Response): Promise<void> => {
  const token = String(req.params.token);
  const photoId = String(req.params.photoId);
  if (!TOKEN.test(token) || !ID.test(photoId)) { res.status(400).json({ error: "Solicitud inválida." }); return; }
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.token, token));
  if (!lead) { res.status(404).json({ error: "Este enlace ya no está disponible." }); return; }
  await respond(res, () => saveMeasurement(lead, photoId, { type: "patient", id: lead.id, name: lead.name ?? "" }, clear ? null : req.body));
};
router.put("/patients/:token/photos/:photoId/measurement", patientAction(false));
router.delete("/patients/:token/photos/:photoId/measurement", patientAction(true));

// El personal mide (o corrige) cualquier foto marcada para medir de un paciente de su clínica.
const staffAction = (clear: boolean) => async (req: import("express").Request, res: import("express").Response): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const leadId = String(req.params.id);
  const photoId = String(req.params.photoId);
  if (!ID.test(leadId) || !ID.test(photoId)) { res.status(404).json({ error: "Foto no encontrada." }); return; }
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead || (lead.centerId ?? DEFAULT_CENTER_ID) !== staff.centerId) { res.status(404).json({ error: "Foto no encontrada." }); return; }
  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, staff.userId));
  await respond(res, () => saveMeasurement(lead, photoId, { type: "staff", id: staff.userId, name: user?.name || user?.email || "" }, clear ? null : req.body));
};
router.put("/leads/:id/photos/:photoId/measurement", staffAction(false));
router.delete("/leads/:id/photos/:photoId/measurement", staffAction(true));

export default router;

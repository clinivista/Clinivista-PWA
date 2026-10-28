import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, centersTable, leadsTable, protocolViewsTable, usersTable } from "@workspace/db";
import { requireStaffAuth, requireSupraAuth } from "./auth";
import { DEFAULT_CENTER_ID, getPhotoForStaff } from "../lib/clinical-photos";
import { privatePhotoStorage } from "../lib/clinical-photo-storage";
import {
  MAX_TRANSCRIPTION_CHARS,
  TranscriptionError,
  getTranscriptionStatus,
  saveManualTranscription,
  saveTranscriptionSettings,
  transcribePhoto,
  type TranscriptionTier,
} from "../lib/transcription";
import { photoTranscriptionsTable } from "@workspace/db";

// Transcripción (OCR) de las fotos marcadas como documento en la configuración
// de fases. Es una acción manual del personal; el paciente nunca la ve.
const router: IRouter = Router();
const ID = /^[\w.-]{1,200}$/;

async function staffName(userId: string): Promise<string> {
  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  return user ? (user.name || user.email) : userId;
}

/** La foto debe ser del caso, estar visible y pertenecer a una vista marcada como documento. */
async function documentPhoto(centerId: string, leadId: string, photoId: string) {
  if (!ID.test(leadId) || !ID.test(photoId)) return undefined;
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead || (lead.centerId ?? DEFAULT_CENTER_ID) !== centerId) return undefined;
  const photo = await getPhotoForStaff(lead, photoId);
  if (!photo) return undefined;
  if (photo.originalMimeType.toLowerCase().startsWith("video/")) return null;
  const [view] = await db.select().from(protocolViewsTable).where(eq(protocolViewsTable.id, photo.viewId));
  if (!(view?.requirements as Record<string, unknown> | null)?.document) return null;
  return photo;
}

router.get("/clinic/transcription", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  res.json(await getTranscriptionStatus(staff.centerId));
});

router.post("/leads/:id/phase-photos/:photoId/transcribe", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const photo = await documentPhoto(staff.centerId, req.params.id, req.params.photoId);
  if (photo === undefined) { res.status(404).json({ error: "Foto no encontrada." }); return; }
  if (photo === null) { res.status(409).json({ error: "Esta fotografía no está marcada como documento." }); return; }

  const tier: TranscriptionTier = (req.body as { advanced?: unknown } | undefined)?.advanced === true ? "advanced" : "basic";
  const [existing] = await db.select().from(photoTranscriptionsTable).where(eq(photoTranscriptionsTable.photoId, photo.id));
  if (existing && tier === "basic") {
    res.status(409).json({ error: "Ya tiene transcripción. Edítala o reintenta con el modelo avanzado." });
    return;
  }
  if (existing && existing.tier === "advanced") {
    res.status(409).json({ error: "Ya se transcribió con el modelo avanzado. Edita el texto a mano." });
    return;
  }
  try {
    const { bytes } = await privatePhotoStorage.read(photo.originalObjectPath);
    const result = await transcribePhoto({
      centerId: staff.centerId,
      photoId: photo.id,
      tier,
      bytes,
      userId: staff.userId,
      userName: await staffName(staff.userId),
    });
    res.json({ ...result, status: await getTranscriptionStatus(staff.centerId) });
  } catch (error) {
    if (error instanceof TranscriptionError) { res.status(error.status).json({ error: error.message }); return; }
    throw error;
  }
});

router.put("/leads/:id/phase-photos/:photoId/transcription", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const photo = await documentPhoto(staff.centerId, req.params.id, req.params.photoId);
  if (photo === undefined) { res.status(404).json({ error: "Foto no encontrada." }); return; }
  if (photo === null) { res.status(409).json({ error: "Esta fotografía no está marcada como documento." }); return; }
  const text = (req.body as { text?: unknown } | undefined)?.text;
  if (typeof text !== "string" || text.length > MAX_TRANSCRIPTION_CHARS) {
    res.status(422).json({ error: `El texto es obligatorio y admite hasta ${MAX_TRANSCRIPTION_CHARS} caracteres.` });
    return;
  }
  await saveManualTranscription(photo.id, text, await staffName(staff.userId));
  res.json({ ok: true });
});

// Supra-control: cuota mensual y opciones avanzadas por clínica.
router.get("/director/centers/:id/transcription", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  if (!ID.test(req.params.id)) { res.status(404).json({ error: "Clínica no encontrada." }); return; }
  const [center] = await db.select({ id: centersTable.id }).from(centersTable).where(eq(centersTable.id, req.params.id));
  if (!center) { res.status(404).json({ error: "Clínica no encontrada." }); return; }
  res.json(await getTranscriptionStatus(center.id));
});

router.put("/director/centers/:id/transcription", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  if (!ID.test(req.params.id)) { res.status(404).json({ error: "Clínica no encontrada." }); return; }
  const [center] = await db.select({ id: centersTable.id }).from(centersTable).where(eq(centersTable.id, req.params.id));
  if (!center) { res.status(404).json({ error: "Clínica no encontrada." }); return; }
  const body = (req.body ?? {}) as { monthlyQuota?: unknown; advancedEnabled?: unknown };
  const input: { monthlyQuota?: number; advancedEnabled?: boolean } = {};
  if (body.monthlyQuota !== undefined) {
    if (typeof body.monthlyQuota !== "number") { res.status(422).json({ error: "La cuota debe ser un número." }); return; }
    input.monthlyQuota = body.monthlyQuota;
  }
  if (body.advancedEnabled !== undefined) {
    if (typeof body.advancedEnabled !== "boolean") { res.status(422).json({ error: "Dato inválido." }); return; }
    input.advancedEnabled = body.advancedEnabled;
  }
  try {
    await saveTranscriptionSettings(center.id, input);
  } catch (error) {
    if (error instanceof TranscriptionError) { res.status(422).json({ error: error.message }); return; }
    throw error;
  }
  res.json(await getTranscriptionStatus(center.id));
});

export default router;

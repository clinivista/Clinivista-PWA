import express, { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { requireStaffAuth } from "./auth";
import {
  DEFAULT_CENTER_ID,
  PhaseCaptureError,
  createStaffPhasePhoto,
  discardStaffPhasePhoto,
  getLeadPhases,
} from "../lib/clinical-photos";
import { MAX_PHOTO_BYTES, parseImageRequest } from "../lib/image-upload";

const router: IRouter = Router();
const ID = /^[\w.-]{1,200}$/;
const RAW_IMAGE = express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_PHOTO_BYTES });

async function ownLead(centerId: string, id: string) {
  if (!ID.test(id)) return undefined;
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  return lead && (lead.centerId ?? DEFAULT_CENTER_ID) === centerId ? lead : undefined;
}

// The patient's whole process, phase by phase: which phase is open, which is
// complete, and the photo of every view. Phases open in order.
router.get("/leads/:id/phases", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  res.json({ phases: await getLeadPhases(lead) });
});

// Staff photograph a view of a phase after the pre-evaluación.
router.post("/leads/:id/views/:viewId/photo", RAW_IMAGE, async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead || !ID.test(req.params.viewId)) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  const image = await parseImageRequest(req);
  if (!image) {
    res.status(400).json({ error: "La foto debe ser JPEG, PNG o WebP y pesar hasta 10 MB." });
    return;
  }
  try {
    const photo = await createStaffPhasePhoto({
      lead,
      viewId: req.params.viewId,
      staffUserId: staff.userId,
      source: req.headers["x-photo-source"] === "camera" ? "camera" : "upload",
      ...image,
    });
    res.status(201).json(photo);
  } catch (error) {
    if (error instanceof PhaseCaptureError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.delete("/leads/:id/phase-photos/:photoId", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead || !ID.test(req.params.photoId)) {
    res.status(404).json({ error: "Foto no encontrada." });
    return;
  }
  try {
    if (!(await discardStaffPhasePhoto(lead, req.params.photoId, staff.userId))) {
      res.status(404).json({ error: "Foto no encontrada." });
      return;
    }
  } catch (error) {
    if (error instanceof PhaseCaptureError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
  res.status(204).end();
});

export default router;

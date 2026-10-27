import express, { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { requireStaffAuth } from "./auth";
import { DEFAULT_CENTER_ID, PhaseCaptureError, createStaffPhasePhoto, createStaffPhaseVideo } from "../lib/clinical-photos";
import { closeCaptureSession, createCaptureSession, openCaptureSession } from "../lib/capture-sessions";
import { syncLeadStatus } from "../lib/lead-status";
import { MAX_PHOTO_BYTES, parseImageRequest } from "../lib/image-upload";
import { throttled } from "../lib/patient-accounts";
import { VIDEO_PLAN_MESSAGE, centerHasFeature } from "../lib/plans";
import { VIDEO_INVALID, parseVideoRequest, rawVideo, videoUploadSlot } from "../lib/video-upload";

const router: IRouter = Router();
const ID = /^[\w.-]{1,200}$/;
const RAW_IMAGE = express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_PHOTO_BYTES });

// Staff (tablet / computer): opens the phone link for ONE phase of ONE patient.
router.post("/leads/:id/phases/:phaseId/capture-session", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!ID.test(req.params.id) || !ID.test(req.params.phaseId)) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, req.params.id));
  if (!lead || (lead.centerId ?? DEFAULT_CENTER_ID) !== staff.centerId) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  try {
    const { token, expiresAt } = await createCaptureSession(lead, req.params.phaseId, staff.userId);
    res.setHeader("Cache-Control", "no-store");
    res.status(201).json({ token, path: `/captura/${token}`, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    if (error instanceof PhaseCaptureError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

// Phone (no login: the link's token is the authorization). It can only look at the
// list of views to photograph and upload photos for that one phase — never read patient data or photos.
const guard = (req: express.Request, res: express.Response): boolean => {
  if (throttled(`capture:${req.ip}`, 120, 10 * 60_000)) {
    res.status(429).json({ error: "Demasiados intentos. Espera unos minutos." });
    return false;
  }
  return true;
};
const GONE = { error: "Este enlace ya no está activo. Pide uno nuevo desde la tablet o el computador." };

router.get("/capture/:token", async (req, res): Promise<void> => {
  if (!guard(req, res)) return;
  const session = await openCaptureSession(req.params.token);
  if (!session) {
    res.status(410).json(GONE);
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({
    clinicName: session.clinicName,
    expiresAt: session.expiresAt.toISOString(),
    phase: { key: session.phase.key, name: session.phase.name },
    views: session.phase.views.map((view) => ({ id: view.id, key: view.key, label: view.label, required: view.required, video: view.video, taken: view.photo !== null })),
  });
});

router.post("/capture/:token/views/:viewId/photo", RAW_IMAGE, async (req, res): Promise<void> => {
  if (!guard(req, res)) return;
  const session = await openCaptureSession(req.params.token);
  if (!session) {
    res.status(410).json(GONE);
    return;
  }
  if (!ID.test(req.params.viewId) || !session.phase.views.some((view) => view.id === req.params.viewId)) {
    res.status(404).json({ error: "Esa fotografía no pertenece a esta fase." });
    return;
  }
  const image = await parseImageRequest(req);
  if (!image) {
    res.status(400).json({ error: "La foto debe ser JPEG, PNG o WebP y pesar hasta 10 MB." });
    return;
  }
  try {
    await createStaffPhasePhoto({ lead: session.lead, viewId: req.params.viewId, staffUserId: session.userId, source: "camera", ...image });
    await syncLeadStatus(session.lead.id);
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error instanceof PhaseCaptureError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

// The phone records the short video of a view of that phase (Titanium plan).
// Link, view and plan are checked before the body (up to 25 MB) is read.
const captureVideoGate = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  if (!guard(req, res)) return;
  const session = await openCaptureSession(String(req.params.token));
  if (!session) {
    res.status(410).json(GONE);
    return;
  }
  const viewId = String(req.params.viewId);
  if (!ID.test(viewId) || !session.phase.views.some((view) => view.id === viewId)) {
    res.status(404).json({ error: "Esa vista no pertenece a esta fase." });
    return;
  }
  if (!(await centerHasFeature(session.lead.centerId ?? DEFAULT_CENTER_ID, "video"))) {
    res.status(403).json({ error: VIDEO_PLAN_MESSAGE });
    return;
  }
  res.locals.session = session;
  next();
};

router.post("/capture/:token/views/:viewId/video", videoUploadSlot, captureVideoGate, rawVideo, async (req, res): Promise<void> => {
  const video = parseVideoRequest(req);
  if (!video) {
    res.status(400).json({ error: VIDEO_INVALID });
    return;
  }
  const session = res.locals.session as NonNullable<Awaited<ReturnType<typeof openCaptureSession>>>;
  try {
    await createStaffPhaseVideo({ lead: session.lead, viewId: String(req.params.viewId), staffUserId: session.userId, source: "camera", video });
    await syncLeadStatus(session.lead.id);
    res.status(201).json({ ok: true });
  } catch (error) {
    if (error instanceof PhaseCaptureError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    throw error;
  }
});

// Closes the link (from the phone when done, or from the tablet when cancelling).
router.post("/capture/:token/finish", async (req, res): Promise<void> => {
  if (!guard(req, res)) return;
  await closeCaptureSession(req.params.token);
  res.json({ ok: true });
});

export default router;

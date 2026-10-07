import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { requireStaffAuth, type StaffAuthContext } from "./auth";
import { DEFAULT_CENTER_ID } from "../lib/clinical-photos";
import {
  DiagnosisError,
  closeDiagnosis,
  deleteAnnotation,
  getDiagnosisState,
  parseStrokes,
  readAnnotationFile,
  reopenDiagnosis,
  saveAnnotation,
  saveDiagnosisText,
} from "../lib/diagnosis";
import { parseImageBytes } from "../lib/image-upload";

const router: IRouter = Router();
const ID = /^[\w.-]{1,200}$/;

async function ownLead(staff: StaffAuthContext, id: string) {
  if (!ID.test(id)) return undefined;
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  return lead && (lead.centerId ?? DEFAULT_CENTER_ID) === staff.centerId ? lead : undefined;
}

/** Only a médico diagnoses; everyone in the clinic can read the result. */
function requireDoctor(staff: StaffAuthContext, res: Response): boolean {
  if (staff.role === "medico") return true;
  res.status(403).json({ error: "Solo el médico puede editar el diagnóstico." });
  return false;
}

function fail(error: unknown, res: Response): void {
  if (error instanceof DiagnosisError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  throw error;
}

async function open(req: Request, res: Response, doctorOnly: boolean) {
  const staff = requireStaffAuth(req, res);
  if (!staff) return undefined;
  if (doctorOnly && !requireDoctor(staff, res)) return undefined;
  const lead = await ownLead(staff, String(req.params.id));
  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return undefined;
  }
  return { staff, lead };
}

router.get("/leads/:id/diagnosis", async (req, res): Promise<void> => {
  const ctx = await open(req, res, false);
  if (!ctx) return;
  res.json({ ...(await getDiagnosisState(ctx.lead)), canEdit: ctx.staff.role === "medico" });
});

router.put("/leads/:id/diagnosis", async (req, res): Promise<void> => {
  const ctx = await open(req, res, true);
  if (!ctx) return;
  const text = (req.body as { responseText?: unknown } | undefined)?.responseText;
  if (typeof text !== "string") {
    res.status(400).json({ error: "Falta la respuesta." });
    return;
  }
  try {
    await saveDiagnosisText(ctx.lead, ctx.staff.userId, text);
  } catch (error) {
    return fail(error, res);
  }
  res.json({ ...(await getDiagnosisState(ctx.lead)), canEdit: true });
});

router.post("/leads/:id/diagnosis/close", async (req, res): Promise<void> => {
  const ctx = await open(req, res, true);
  if (!ctx) return;
  const text = (req.body as { responseText?: unknown } | undefined)?.responseText;
  if (text !== undefined && typeof text !== "string") {
    res.status(400).json({ error: "La respuesta no es válida." });
    return;
  }
  try {
    await closeDiagnosis(ctx.lead, ctx.staff.userId, text);
  } catch (error) {
    return fail(error, res);
  }
  res.json({ ...(await getDiagnosisState(ctx.lead)), canEdit: true });
});

router.post("/leads/:id/diagnosis/reopen", async (req, res): Promise<void> => {
  const ctx = await open(req, res, true);
  if (!ctx) return;
  try {
    await reopenDiagnosis(ctx.lead, ctx.staff.userId);
  } catch (error) {
    return fail(error, res);
  }
  res.json({ ...(await getDiagnosisState(ctx.lead)), canEdit: true });
});

// The doctor's drawing over a patient photo: { image: <data URL>, strokes: [...] }.
router.put("/leads/:id/photos/:photoId/annotation", async (req, res): Promise<void> => {
  const ctx = await open(req, res, true);
  if (!ctx) return;
  const body = req.body as { image?: unknown; strokes?: unknown } | undefined;
  const match = typeof body?.image === "string" ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.image) : null;
  const strokes = parseStrokes(body?.strokes);
  const image = match ? await parseImageBytes(match[1], Buffer.from(match[2], "base64")) : null;
  if (!image || !strokes || !ID.test(String(req.params.photoId))) {
    res.status(400).json({ error: "El dibujo no es válido." });
    return;
  }
  try {
    await saveAnnotation(ctx.lead, ctx.staff.userId, String(req.params.photoId), image, strokes);
  } catch (error) {
    return fail(error, res);
  }
  res.json({ ...(await getDiagnosisState(ctx.lead)), canEdit: true });
});

router.delete("/leads/:id/photos/:photoId/annotation", async (req, res): Promise<void> => {
  const ctx = await open(req, res, true);
  if (!ctx) return;
  try {
    if (!ID.test(String(req.params.photoId)) || !(await deleteAnnotation(ctx.lead, String(req.params.photoId)))) {
      res.status(404).json({ error: "No hay dibujo en esa foto." });
      return;
    }
  } catch (error) {
    return fail(error, res);
  }
  res.status(204).end();
});

router.get("/leads/:id/photos/:photoId/annotation", async (req, res): Promise<void> => {
  const ctx = await open(req, res, false);
  if (!ctx) return;
  try {
    const file = ID.test(String(req.params.photoId)) ? await readAnnotationFile(ctx.lead, String(req.params.photoId)) : null;
    if (!file) {
      res.status(404).json({ error: "No hay dibujo en esa foto." });
      return;
    }
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(file.bytes);
  } catch (error) {
    if (error instanceof DiagnosisError) return fail(error, res);
    res.status(404).json({ error: "No hay dibujo en esa foto." });
  }
});

export default router;

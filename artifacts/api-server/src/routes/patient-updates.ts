import express, { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { requireStaffAuth } from "./auth";
import { throttled } from "../lib/patient-accounts";
import { MAX_PHOTO_BYTES, parseImageRequest } from "../lib/image-upload";
import {
  LOCKED_MESSAGE, addAdditionFile, additionFile, additionsForPatient, createAddition, isEvaluationLocked, markUpdatesSeen, resolveAddition, unseenCounts, updatesForLead,
} from "../lib/patient-edits";

const router: IRouter = Router();

// Qué rutas del enlace del paciente quedan abiertas aunque la evaluación esté en revisión:
// sus derechos sobre los datos y el envío de información adicional.
const ALWAYS_OPEN = /^\/(?:data-requests|additions|edit-state)(?:\/|$)/;

/**
 * Cierra la edición del paciente cuando la clínica ya empezó a revisar su evaluación.
 * Solo toca peticiones que modifican algo (PUT, POST, DELETE) bajo /patients/:token.
 */
export async function patientEditGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS" || ALWAYS_OPEN.test(req.path)) { next(); return; }
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.token, String(req.params.token)));
  if (lead && (await isEvaluationLocked(lead))) {
    res.status(423).json({ error: LOCKED_MESSAGE, locked: true });
    return;
  }
  next();
}

async function leadByToken(req: Request, res: Response) {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.token, String(req.params.token)));
  if (!lead) res.status(404).json({ error: "Este enlace ya no está disponible." });
  return lead;
}

// ── Paciente ──────────────────────────────────────────────────────────────
router.get("/patients/:token/edit-state", async (req, res): Promise<void> => {
  const lead = await leadByToken(req, res);
  if (!lead) return;
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ locked: await isEvaluationLocked(lead), additions: await additionsForPatient(lead).catch(() => []) });
});

router.post("/patients/:token/additions", async (req, res): Promise<void> => {
  if (throttled(`addition-ip:${req.ip}`, 20, 60 * 60_000)) { res.status(429).json({ error: "Demasiados envíos. Intenta más tarde." }); return; }
  const lead = await leadByToken(req, res);
  if (!lead) return;
  if (!(await isEvaluationLocked(lead))) {
    res.status(409).json({ error: "Tu evaluación aún se puede modificar directamente.", locked: false });
    return;
  }
  const note = typeof req.body?.note === "string" ? req.body.note : "";
  const addition = await createAddition(lead, note);
  if (!addition) { res.status(429).json({ error: "Ya tienes varios envíos pendientes de revisión." }); return; }
  res.status(201).json({ ok: true, id: addition.id });
});

router.post("/patients/:token/additions/:id/files", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_PHOTO_BYTES }), async (req, res): Promise<void> => {
  const image = await parseImageRequest(req);
  if (!image) { res.status(400).json({ error: "La foto debe ser JPEG, PNG o WebP y pesar hasta 10 MB." }); return; }
  const lead = await leadByToken(req, res);
  if (!lead) return;
  const result = await addAdditionFile(lead, String(req.params.id), image).catch(() => null);
  if (result === "full") { res.status(409).json({ error: "Ya enviaste el máximo de fotos en este envío." }); return; }
  if (!result) { res.status(404).json({ error: "Envío no encontrado." }); return; }
  res.status(201).json({ ok: true });
});

// ── Clínica ───────────────────────────────────────────────────────────────
router.get("/clinic/patient-updates/summary", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  res.json({ unseen: await unseenCounts(staff.centerId).catch(() => ({})) });
});

async function leadOfCenter(centerId: string, id: string) {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  return lead && (lead.centerId ?? "default-center") === centerId ? lead : null;
}

router.get("/leads/:id/patient-updates", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  res.json(await updatesForLead(staff.centerId, lead.id).catch(() => ({ updates: [], additions: [] })));
});

router.post("/leads/:id/patient-updates/seen", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  await markUpdatesSeen(staff.centerId, lead.id, staff.userId);
  res.json({ ok: true });
});

router.get("/leads/:id/additions/:additionId/files/:index", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  const file = lead ? await additionFile(staff.centerId, lead.id, String(req.params.additionId), Number(req.params.index)) : null;
  if (!file) { res.status(404).json({ error: "Archivo no encontrado." }); return; }
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(file.bytes);
});

router.patch("/leads/:id/additions/:additionId", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  const status = req.body?.status;
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  if (status !== "incorporated" && status !== "dismissed") { res.status(400).json({ error: "Estado inválido." }); return; }
  const row = await resolveAddition(staff.centerId, lead.id, String(req.params.additionId), staff.userId, status);
  if (!row) { res.status(404).json({ error: "Envío no encontrado." }); return; }
  res.json({ ok: true });
});

export default router;

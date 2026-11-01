import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import { requireStaffAuth } from "./auth";
import { throttled } from "../lib/patient-accounts";
import {
  accessEventsForLead, createDataRequest, exportPatientData, isDataRequestStatus, isDataRequestType, listDataRequests, logStaffAccess, updateDataRequest,
} from "../lib/data-rights";

const router: IRouter = Router();

// El paciente (con el enlace de su ficha) pide acceso, rectificación, supresión, oposición, portabilidad o bloqueo.
router.post("/patients/:token/data-requests", async (req, res): Promise<void> => {
  if (throttled(`data-request-ip:${req.ip}`, 10, 60 * 60_000)) {
    res.status(429).json({ error: "Demasiadas solicitudes. Intenta más tarde." });
    return;
  }
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.token, String(req.params.token)));
  if (!lead) { res.status(404).json({ error: "Este enlace ya no está disponible." }); return; }
  const type = req.body?.type;
  if (!isDataRequestType(type)) { res.status(400).json({ error: "Tipo de solicitud inválido." }); return; }
  const request = await createDataRequest(lead, type, typeof req.body?.message === "string" ? req.body.message : "");
  res.status(201).json({ ok: true, id: request.id, dueAt: request.dueAt });
});

// La clínica ve y responde las solicitudes de sus pacientes.
router.get("/clinic/data-requests", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  res.json({ requests: await listDataRequests(staff.centerId) });
});

router.patch("/clinic/data-requests/:id", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const status = req.body?.status;
  if (!isDataRequestStatus(status)) { res.status(400).json({ error: "Estado inválido." }); return; }
  const updated = await updateDataRequest(staff.centerId, String(req.params.id), staff.userId, status, typeof req.body?.note === "string" ? req.body.note : "");
  if (!updated) { res.status(404).json({ error: "Solicitud no encontrada." }); return; }
  res.json({ ok: true, request: updated });
});

async function leadOfCenter(centerId: string, id: string) {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  return lead && (lead.centerId ?? "default-center") === centerId ? lead : null;
}

// Exportación de los datos de un paciente (acceso y portabilidad). Queda registrada como acceso.
router.get("/leads/:id/data-export", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  await logStaffAccess(staff.centerId, lead.id, staff.userId, "export");
  res.setHeader("Content-Disposition", `attachment; filename="datos-paciente-${lead.id}.json"`);
  res.json(await exportPatientData(lead));
});

// Quién abrió esta ficha y cuándo.
router.get("/leads/:id/access-log", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await leadOfCenter(staff.centerId, String(req.params.id));
  if (!lead) { res.status(404).json({ error: "Caso no encontrado." }); return; }
  res.json({ events: await accessEventsForLead(staff.centerId, lead.id) });
});

export default router;

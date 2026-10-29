import { Router, type IRouter } from "express";
import { requireStaffAuth } from "./auth";
import { INTEGRATION_CATALOG, cancelIntegrationRequest, isIntegration, requestIntegration, requestedIntegrations } from "../lib/integrations";

const router: IRouter = Router();

// Catálogo «Integraciones disponibles» del panel de la clínica: lo ve todo el personal de la clínica.
router.get("/clinic/integrations", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  res.json({ catalog: INTEGRATION_CATALOG, requested: await requestedIntegrations(staff.centerId) });
});

router.put("/clinic/integrations/:id/request", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const id = req.params.id;
  if (!isIntegration(id)) { res.status(404).json({ error: "Integración no encontrada." }); return; }
  await requestIntegration(staff.centerId, id, staff.userId);
  res.json({ catalog: INTEGRATION_CATALOG, requested: await requestedIntegrations(staff.centerId) });
});

router.delete("/clinic/integrations/:id/request", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const id = req.params.id;
  if (!isIntegration(id)) { res.status(404).json({ error: "Integración no encontrada." }); return; }
  await cancelIntegrationRequest(staff.centerId, id);
  res.json({ catalog: INTEGRATION_CATALOG, requested: await requestedIntegrations(staff.centerId) });
});

export default router;

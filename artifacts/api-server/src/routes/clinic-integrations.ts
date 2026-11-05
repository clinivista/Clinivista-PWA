import { Router, type IRouter } from "express";
import { requireStaffAuth } from "./auth";
import { INTEGRATION_CATALOG, bookingLinksOf, cancelIntegrationRequest, isBookingIntegration, isIntegration, parseBookingUrl, requestIntegration, requestedIntegrations, saveBookingLink } from "../lib/integrations";

const router: IRouter = Router();

const view = async (centerId: string) => ({ catalog: INTEGRATION_CATALOG, requested: await requestedIntegrations(centerId), links: await bookingLinksOf(centerId) });

// Catálogo «Integraciones disponibles» del panel de la clínica: lo ve todo el personal de la clínica.
router.get("/clinic/integrations", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  res.json(await view(staff.centerId));
});

router.put("/clinic/integrations/:id/request", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const id = req.params.id;
  if (!isIntegration(id)) { res.status(404).json({ error: "Integración no encontrada." }); return; }
  await requestIntegration(staff.centerId, id, staff.userId);
  res.json(await view(staff.centerId));
});

router.delete("/clinic/integrations/:id/request", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const id = req.params.id;
  if (!isIntegration(id)) { res.status(404).json({ error: "Integración no encontrada." }); return; }
  await cancelIntegrationRequest(staff.centerId, id);
  res.json(await view(staff.centerId));
});

// Link de agendamiento en línea (Medilink, AgendaPro, Reservo): el paciente lo ve en su pantalla final y en su portal. Vacío lo quita.
router.put("/clinic/integrations/:id/link", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const id = req.params.id;
  if (!isBookingIntegration(id)) { res.status(404).json({ error: "Esta integración no admite un link de agendamiento." }); return; }
  const url = parseBookingUrl((req.body as { url?: unknown } | undefined)?.url);
  if (url === null) { res.status(400).json({ error: "Escribe un enlace válido que empiece con https://" }); return; }
  await saveBookingLink(staff.centerId, id, url);
  res.json(await view(staff.centerId));
});

export default router;

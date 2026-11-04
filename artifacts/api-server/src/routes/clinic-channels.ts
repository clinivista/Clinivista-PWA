import { Router, type IRouter } from "express";
import { requireStaffAuth } from "./auth";
import { clinicManagerOf, requireClinicUserManager } from "./clinic-users";
import { ACTIVE_CHANNELS, COMING_CHANNELS, getClinicChannels, setClinicChannels, type ResultChannel } from "../lib/clinic-channels";

const router: IRouter = Router();

// Canales de comunicación de la clínica con sus pacientes. Todo el personal los ve (para saber cómo entregar
// resultados); solo administración o el representante legal los elige. SMS está preparado y todavía no se puede activar.
router.get("/clinic/channels", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const manager = await clinicManagerOf(staff);
  res.json({ channels: await getClinicChannels(staff.centerId), available: ACTIVE_CHANNELS, coming: COMING_CHANNELS, canEdit: Boolean(manager) });
});

router.put("/clinic/channels", async (req, res): Promise<void> => {
  const manager = await requireClinicUserManager(req, res, "elegir los canales de comunicación");
  if (!manager) return;
  const sent = (req.body as { channels?: unknown } | undefined)?.channels;
  if (!Array.isArray(sent) || sent.some((item) => !(ACTIVE_CHANNELS as readonly string[]).includes(String(item)))) {
    res.status(400).json({ error: "Los canales enviados no son válidos. SMS todavía no está disponible." });
    return;
  }
  const channels = ACTIVE_CHANNELS.filter((channel) => sent.includes(channel)) as ResultChannel[];
  if (channels.length === 0) {
    res.status(400).json({ error: "Activa al menos un canal para poder entregar resultados a tus pacientes." });
    return;
  }
  await setClinicChannels(manager.centerId, channels);
  res.json({ channels, available: ACTIVE_CHANNELS, coming: COMING_CHANNELS, canEdit: true });
});

export default router;

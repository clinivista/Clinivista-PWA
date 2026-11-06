import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, centersTable } from "@workspace/db";
import { requireStaffAuth } from "./auth";
import { isLegalRepresentative } from "../lib/legal-representative";
import { LEGAL_REP_FIELDS, SUPPORT_ONLY_FIELDS, clinicProfileOf, documentKind, parseClinicProfile, saveClinicProfile } from "../lib/profiles";

const router: IRouter = Router();

async function view(centerId: string) {
  const [center] = await db.select({ name: centersTable.name }).from(centersTable).where(eq(centersTable.id, centerId));
  const profile = await clinicProfileOf(centerId);
  return { name: center?.name ?? "", documentKind: documentKind(profile.country), ...profile };
}

// Datos de contacto de la clínica. Los ve y los edita solo su representante legal; el país y el RUT (o pasaporte)
// se muestran pero solo los cambia soporte desde supra-control.
router.get("/clinic/profile", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!(await isLegalRepresentative(staff))) {
    res.status(403).json({ error: "Solo el representante legal puede ver los datos de la clínica." });
    return;
  }
  res.json(await view(staff.centerId));
});

router.put("/clinic/profile", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!(await isLegalRepresentative(staff))) {
    res.status(403).json({ error: "Solo el representante legal puede cambiar los datos de la clínica." });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (SUPPORT_ONLY_FIELDS.some((key) => body[key] !== undefined)) {
    res.status(403).json({ error: "El país y el RUT de la clínica solo los puede cambiar soporte." });
    return;
  }
  const sent = Object.fromEntries(LEGAL_REP_FIELDS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
  const profile = parseClinicProfile(sent, { require: false });
  if ("error" in profile) {
    res.status(400).json({ error: profile.error });
    return;
  }
  await saveClinicProfile(staff.centerId, profile.value);
  res.json(await view(staff.centerId));
});

export default router;

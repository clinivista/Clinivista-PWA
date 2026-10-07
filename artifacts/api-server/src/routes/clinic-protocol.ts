import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { UpdateClinicProtocolBody } from "@workspace/api-zod";
import { canManageClinicUsers, requireStaffAuth } from "./auth";
import { ProtocolConfigError, getProtocolStructure, replaceProtocolStructure } from "../lib/protocol-config";

const router: IRouter = Router();

/** Only the clinic's legal representative defines its phases (read from the DB on every request). */
async function isLegalRepresentative(userId: string, centerId: string): Promise<boolean> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return Boolean(user && user.active && user.centerId === centerId && user.legalRepresentative);
}

router.get("/clinic/protocol", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const { phases } = await getProtocolStructure(staff.centerId);
  res.json({ canEdit: await isLegalRepresentative(staff.userId, staff.centerId), phases });
});

router.put("/clinic/protocol", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!(await isLegalRepresentative(staff.userId, staff.centerId))) {
    res.status(403).json({ error: "Solo el representante legal puede configurar las fases." });
    return;
  }
  const body = UpdateClinicProtocolBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "La configuración enviada no es válida." });
    return;
  }
  try {
    await replaceProtocolStructure(staff.centerId, body.data.phases);
  } catch (error) {
    if (error instanceof ProtocolConfigError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
  const { phases } = await getProtocolStructure(staff.centerId);
  res.json({ canEdit: true, phases });
});

export default router;

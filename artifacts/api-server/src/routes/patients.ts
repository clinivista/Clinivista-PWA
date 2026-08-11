import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import {
  CreatePatientBody,
  GetPatientParams,
  UpdatePatientParams,
  UpdatePatientBody,
} from "@workspace/api-zod";
import { uid, clean, cleanPhone } from "../lib/helpers";

const router: IRouter = Router();

interface PhotoInput {
  key: string;
  label: string;
  dataUrl: string;
  quality?: string;
}

function isValidPhoto(p: unknown): p is PhotoInput {
  if (!p || typeof p !== "object") return false;
  const photo = p as Record<string, unknown>;
  return (
    typeof photo.key === "string" &&
    typeof photo.label === "string" &&
    typeof photo.dataUrl === "string" &&
    /^data:image\/(jpeg|jpg|png|webp);base64,/.test(photo.dataUrl) &&
    photo.dataUrl.length < 2_500_000
  );
}

function normalizePhotos(photos: unknown[]): object[] {
  const seen = new Set<string>();
  return (Array.isArray(photos) ? photos : [])
    .filter(isValidPhoto)
    .filter((p) => {
      if (seen.has(p.key)) return false;
      seen.add(p.key);
      return true;
    })
    .slice(0, 5)
    .map((p) => ({
      key: clean(p.key, 30),
      label: clean(p.label, 50),
      dataUrl: p.dataUrl,
      quality: clean(p.quality ?? "Control técnico pendiente", 80),
      createdAt: new Date().toISOString(),
    }));
}

function buildLead(payload: Record<string, unknown>, existing: Partial<typeof leadsTable.$inferInsert> = {}) {
  const rawPhotos = Array.isArray(payload.photos) ? payload.photos : [];
  const photos = normalizePhotos(rawPhotos);

  return {
    ...existing,
    updatedAt: new Date(),
    name: clean(payload.name, 100),
    phone: cleanPhone(payload.phone),
    age: clean(payload.age, 3),
    city: clean(payload.city, 80),
    hairLossTime: clean(payload.hairLossTime, 120),
    pattern: clean(payload.pattern, 100),
    previousTreatment: clean(payload.previousTreatment, 250),
    symptoms: clean(payload.symptoms, 250),
    surgeryHistory: clean(payload.surgeryHistory, 250),
    consent: Boolean(payload.consent),
    photos: photos.length ? photos : (existing.photos ?? []),
    photoCount: String(photos.length ? photos.length : Number(existing.photoCount ?? 0)),
  };
}

function leadSummary(lead: typeof leadsTable.$inferSelect) {
  const { photos, symptoms, surgeryHistory, notes, ...safe } = lead;
  return { ...safe, photoCount: Number(safe.photoCount) || 0 };
}

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }

  const data = buildLead(parsed.data as unknown as Record<string, unknown>);

  if (!data.consent || !data.name || !data.phone) {
    res.status(422).json({ error: "Completa tu nombre, teléfono y consentimiento." });
    return;
  }

  const photoCount = Number(data.photoCount);
  const status = photoCount < 5 ? "incompleto" : "listo";

  const newLead = {
    id: uid(),
    token: uid(24),
    status,
    notes: "",
    norwood: "",
    appointmentAt: "",
    isDemo: false,
    ...data,
  };

  await db.insert(leadsTable).values(newLead);
  const [inserted] = await db.select().from(leadsTable).where(eq(leadsTable.id, newLead.id));

  res.status(201).json({ ok: true, lead: leadSummary(inserted) });
});

router.get("/patients/:token", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Token inválido." });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.token, params.data.token));

  if (!lead) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }

  res.json({ ok: true, lead: leadSummary(lead) });
});

router.put("/patients/:token", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Token inválido." });
    return;
  }

  const [existing] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.token, params.data.token));

  if (!existing) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }

  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }

  const data = buildLead(parsed.data as unknown as Record<string, unknown>, existing as Partial<typeof leadsTable.$inferInsert>);

  if (!data.consent || !data.name || !data.phone) {
    res.status(422).json({ error: "Completa tu nombre, teléfono y consentimiento." });
    return;
  }

  const photoCount = Number(data.photoCount);
  let status = existing.status ?? "nuevo";
  if (photoCount < 5) {
    status = "incompleto";
  } else if (status === "nuevo" || status === "incompleto") {
    status = "listo";
  }

  const [updated] = await db
    .update(leadsTable)
    .set({ ...data, status })
    .where(eq(leadsTable.id, existing.id))
    .returning();

  res.json({ ok: true, lead: leadSummary(updated) });
});

export default router;

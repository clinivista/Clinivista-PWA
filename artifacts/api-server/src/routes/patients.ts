import { Router, type IRouter, type Request, type Response } from "express";
import { eq, or } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import {
  CreatePatientBody,
  GetPatientParams,
  UpdatePatientParams,
  UpdatePatientBody,
} from "@workspace/api-zod";
import { uid, clean, cleanPhone } from "../lib/helpers";
import { validateRut, normalizeRut, formatRut } from "../lib/rut";

const router: IRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const incoming = normalizePhotos(rawPhotos);

  // Merge with any photos already stored on the lead so incremental
  // draft saves never drop previously uploaded photos. Incoming wins by key.
  const existingPhotos = Array.isArray(existing.photos) ? (existing.photos as { key?: string }[]) : [];
  const incomingKeys = new Set(incoming.map((p) => (p as { key: string }).key));
  const photos = [
    ...existingPhotos.filter((p) => p?.key && !incomingKeys.has(p.key)),
    ...incoming,
  ].slice(0, 5);

  return {
    ...existing,
    updatedAt: new Date(),
    name: clean(payload.name, 100),
    phone: cleanPhone(payload.phone),
    documentId: formatRut(clean(payload.documentId, 30)),
    documentNormalized: normalizeRut(clean(payload.documentId, 30)),
    email: clean(payload.email, 120).toLowerCase(),
    age: clean(payload.age, 3),
    city: clean(payload.city, 80),
    hairLossTime: clean(payload.hairLossTime, 120),
    pattern: clean(payload.pattern, 100),
    previousTreatment: clean(payload.previousTreatment, 250),
    symptoms: clean(payload.symptoms, 250),
    surgeryHistory: clean(payload.surgeryHistory, 250),
    consent: Boolean(payload.consent),
    marketingConsent: Boolean(payload.marketingConsent),
    photos,
    photoCount: String(photos.length),
  };
}

function leadSummary(lead: typeof leadsTable.$inferSelect) {
  const { photos, symptoms, surgeryHistory, notes, ...safe } = lead;
  const photoKeys = (Array.isArray(photos) ? (photos as { key?: string }[]) : [])
    .map((p) => p?.key)
    .filter((k): k is string => typeof k === "string");
  return { ...safe, photoCount: Number(safe.photoCount) || 0, photoKeys };
}

router.post("/patients", async (req, res): Promise<void> => {
  const parsed = CreatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }

  const rutCheck = validateRut(String((parsed.data as Record<string, unknown>).documentId ?? ""));
  if (!rutCheck.valid) {
    res.status(400).json({ error: rutCheck.error });
    return;
  }

  const data = buildLead(parsed.data as unknown as Record<string, unknown>);

  if (!data.consent || !data.name || !data.phone) {
    res.status(422).json({ error: "Completa tu nombre, teléfono y consentimiento." });
    return;
  }

  if (data.email && !EMAIL_REGEX.test(data.email)) {
    res.status(422).json({ error: "Ingresa un correo electrónico válido." });
    return;
  }

  // Duplicate by RUT. Never disclose the existing lead's token here: this is an
  // unauthenticated endpoint, and the token is the bearer credential for the
  // existing record. Patients who already registered must reuse their original
  // invitation link (PUT /patients/:token) to update their evaluation.
  const [rutDuplicate] = await db
    .select({ id: leadsTable.id })
    .from(leadsTable)
    .where(eq(leadsTable.documentNormalized, data.documentNormalized))
    .limit(1);

  if (rutDuplicate) {
    res.status(409).json({
      error: "Ya existe una evaluación registrada con este RUT.",
      duplicate: true,
    });
    return;
  }

  const conditions = [eq(leadsTable.phone, data.phone)];
  if (data.email) {
    conditions.push(eq(leadsTable.email, data.email));
  }
  const [duplicate] = await db
    .select({ id: leadsTable.id })
    .from(leadsTable)
    .where(or(...conditions))
    .limit(1);

  if (duplicate) {
    res.status(409).json({
      error: "Ya existe una evaluación con este teléfono o correo.",
      duplicate: true,
    });
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

  const rutCheck = validateRut(String((parsed.data as Record<string, unknown>).documentId ?? ""));
  if (!rutCheck.valid) {
    res.status(400).json({ error: rutCheck.error });
    return;
  }

  const data = buildLead(parsed.data as unknown as Record<string, unknown>, existing as Partial<typeof leadsTable.$inferInsert>);

  // Prevent this update from colliding with a different lead's RUT.
  const [rutClash] = await db
    .select({ id: leadsTable.id })
    .from(leadsTable)
    .where(eq(leadsTable.documentNormalized, data.documentNormalized))
    .limit(1);

  if (rutClash && rutClash.id !== existing.id) {
    res.status(409).json({
      error: "Ya existe una evaluación registrada con este RUT.",
      duplicate: true,
    });
    return;
  }

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

// Discard all draft photos for a lead. The invitation token acts as the bearer
// credential, mirroring GET/PUT /patients/:token. Personal/contact data is kept
// (the lead itself is not deleted); only the sensitive clinical photos are removed.
router.delete("/patients/:token/photos", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
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

  const [updated] = await db
    .update(leadsTable)
    .set({ photos: [], photoCount: "0", status: "incompleto", updatedAt: new Date() })
    .where(eq(leadsTable.id, existing.id))
    .returning();

  res.json({ ok: true, lead: leadSummary(updated) });
});

export default router;

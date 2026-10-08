import express, { Router, type IRouter } from "express";
import sharp from "sharp";
import { and, eq, or } from "drizzle-orm";
import { db, centersTable, leadsTable, normalizeEmail } from "@workspace/db";
import {
  ConfirmPatientPhotoParams,
  CreateClinicPatientParams,
  CreatePatientBody,
  CreatePatientAdjustedPhotoHeader,
  CreatePatientAdjustedPhotoParams,
  DiscardPatientPhotoParams,
  DiscardPatientPhotosParams,
  GetClinicParams,
  GetPatientParams,
  GetPatientPhotoStatusParams,
  UpdatePatientBody,
  UpdatePatientParams,
  UploadPatientPhotoHeader,
  UploadPatientPhotoParams,
} from "@workspace/api-zod";
import { uid, clean, cleanPhone } from "../lib/helpers";
import { validateRut, normalizeRut, formatRut } from "../lib/rut";
import {
  DEFAULT_CENTER_ID,
  confirmClinicalPhoto,
  createAdjustedPhoto,
  createClinicalPhoto,
  discardAdjustedPhoto,
  discardAllPatientCapturePhotos,
  discardClinicalPhoto,
  defaultProtocolIdForCenter,
  ensureClinicalConfiguration,
  getPatientPhaseViews,
  getPatientPhotoFile,
  getPhotoStatusesForLead,
  getRequiredViewKeysForLead,
} from "../lib/clinical-photos";
import { privatePhotoStorage } from "../lib/clinical-photo-storage";
import { toMailLanguage } from "../lib/mail-i18n";
import { ensurePatientAccountForLead } from "../lib/patient-accounts";
import { baseUrl } from "./results";
import { isCenterActive } from "../lib/centers";
import { clinicIdentity, findCenterBySlug } from "../lib/clinic-identity";
import { cleanIntake, getSpecialty } from "../lib/specialties";
import { ALLOWED_IMAGE_TYPES, MAX_PHOTO_BYTES, parseImageRequest, parseOptionalPixelDimension } from "../lib/image-upload";

const router: IRouter = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildLead(payload: Record<string, unknown>, existing: Partial<typeof leadsTable.$inferInsert> = {}, clinicalData?: Record<string, string>) {
  return {
    ...existing,
    ...(clinicalData ? { clinicalData } : {}),
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
    language: payload.language === undefined ? existing.language ?? "" : toMailLanguage(payload.language) === payload.language ? String(payload.language) : "",
    deliveryChannel: payload.deliveryChannel === undefined
      ? existing.deliveryChannel ?? ""
      : ["email", "whatsapp"].includes(String(payload.deliveryChannel)) ? String(payload.deliveryChannel) : "",
  };
}

function legacyPhotoKeys(lead: typeof leadsTable.$inferSelect): string[] {
  return Array.isArray(lead.photos)
    ? (lead.photos as Array<{ key?: unknown }>).flatMap((photo) => typeof photo?.key === "string" ? [photo.key] : [])
    : [];
}

async function leadSummary(lead: typeof leadsTable.$inferSelect) {
  const { photos, symptoms, surgeryHistory, notes, patientAccountId, ...safe } = lead;
  const clinicalPhotos = await getPhotoStatusesForLead(lead);
  const visibleClinical = clinicalPhotos.filter((photo) => ["draft", "confirmed"].includes(photo.status));
  const keys = [...new Set([...legacyPhotoKeys(lead), ...visibleClinical.map((photo) => photo.key)])];
  return { ...safe, photoCount: keys.length, photoKeys: keys };
}

async function findLeadByToken(token: string) {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.token, token));
  return lead;
}

const EDIT_NUMERIC_LIMITS = {
  rotation: [-5, 5],
  exposure: [-0.35, 0.35],
  brightness: [-12, 12],
  contrast: [-15, 15],
  highlights: [-15, 15],
  shadows: [-15, 15],
  temperature: [-10, 10],
  saturation: [-12, 12],
  clarity: [0, 15],
  sharpness: [0, 15],
  noiseReduction: [0, 15],
} as const;

function parseTechnicalEditParams(value: string | undefined, original: { width: number | null; height: number | null }): Record<string, unknown> | null {
  if (!value || value.length > 6_000 || !original.width || !original.height) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const params = parsed as Record<string, unknown>;
    const allowedKeys = new Set(["version", "crop", ...Object.keys(EDIT_NUMERIC_LIMITS)]);
    if (Object.keys(params).some((key) => !allowedKeys.has(key)) || params.version !== 1) return null;
    for (const [key, [min, max]] of Object.entries(EDIT_NUMERIC_LIMITS)) {
      const numeric = params[key];
      if (typeof numeric !== "number" || !Number.isFinite(numeric) || numeric < min || numeric > max) return null;
    }
    const crop = params.crop;
    if (!crop || typeof crop !== "object" || Array.isArray(crop)) return null;
    const cropValues = crop as Record<string, unknown>;
    if (Object.keys(cropValues).some((key) => !["x", "y", "width", "height", "aspectRatio"].includes(key))) return null;
    const numericCrop = ["x", "y", "width", "height"].every((key) => (
      typeof cropValues[key] === "number" && Number.isFinite(cropValues[key])
    ));
    const cropFits = (width: number, height: number) => (
      Number(cropValues.x) >= 0 && Number(cropValues.y) >= 0
      && Number(cropValues.width) >= width / 1.25 && Number(cropValues.height) >= height / 1.25
      && Number(cropValues.x) + Number(cropValues.width) <= width
      && Number(cropValues.y) + Number(cropValues.height) <= height
    );
    // Browsers normalize EXIF orientation while decoding. A portrait JPEG can
    // therefore have the same pixels as the stored original with width/height
    // swapped; accept that equivalent orientation, never a larger pixel area.
    if (!numericCrop || !(cropFits(original.width, original.height) || cropFits(original.height, original.width))) return null;
    if (cropValues.aspectRatio !== undefined
      && (typeof cropValues.aspectRatio !== "number" || !Number.isFinite(cropValues.aspectRatio)
        || cropValues.aspectRatio < 0.5 || cropValues.aspectRatio > 2)) return null;
    return {
      version: 1,
      crop: {
        x: Math.round(Number(cropValues.x)),
        y: Math.round(Number(cropValues.y)),
        width: Math.round(Number(cropValues.width)),
        height: Math.round(Number(cropValues.height)),
        ...(cropValues.aspectRatio === undefined ? {} : { aspectRatio: Number(cropValues.aspectRatio) }),
      },
      ...Object.fromEntries(Object.keys(EDIT_NUMERIC_LIMITS).map((key) => [key, Number(params[key])])),
    };
  } catch {
    return null;
  }
}

const ALLOWED_TECHNICAL_WARNING_CODES = new Set(["low_resolution", "aspect_ratio", "orientation", "exposure", "low_contrast", "low_sharpness"]);

function parseCaptureMetadata(value: string | undefined): Record<string, unknown> | null {
  if (!value) return {};
  if (value.length > 8_000) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).some(key => key !== "technicalReview")) return null;
    const review = (parsed as Record<string, unknown>).technicalReview;
    if (!review || typeof review !== "object" || Array.isArray(review)) return null;
    const allowedKeys = new Set(["width", "height", "sizeBytes", "mimeType", "orientation", "aspectRatio", "brightness", "contrast", "sharpness", "warningCodes"]);
    if (Object.keys(review as Record<string, unknown>).some(key => !allowedKeys.has(key))) return null;
    const values = review as Record<string, unknown>;
    const integer = (key: string, max: number) => Number.isInteger(values[key]) && Number(values[key]) > 0 && Number(values[key]) <= max;
    const metric = (key: string) => values[key] === null || (typeof values[key] === "number" && Number.isFinite(values[key]) && values[key] >= 0 && values[key] <= 255);
    if (!integer("width", 20_000) || !integer("height", 20_000) || !integer("sizeBytes", 100_000_000)
      || !["image/jpeg", "image/png", "image/webp"].includes(String(values.mimeType))
      || !["portrait", "landscape", "square"].includes(String(values.orientation))
      || typeof values.aspectRatio !== "number" || !Number.isFinite(values.aspectRatio) || values.aspectRatio <= 0 || values.aspectRatio > 10
      || !metric("brightness") || !metric("contrast") || !metric("sharpness")
      || !Array.isArray(values.warningCodes) || values.warningCodes.length > ALLOWED_TECHNICAL_WARNING_CODES.size
      || values.warningCodes.some(code => typeof code !== "string" || !ALLOWED_TECHNICAL_WARNING_CODES.has(code))) return null;
    return { technicalReview: { width: values.width, height: values.height, sizeBytes: values.sizeBytes, mimeType: values.mimeType, orientation: values.orientation, aspectRatio: values.aspectRatio, brightness: values.brightness, contrast: values.contrast, sharpness: values.sharpness, warningCodes: values.warningCodes } };
  } catch {
    return null;
  }
}

function updatedStatus(existingStatus: string | null, completedPhotos: number, requiredCount: number): string {
  if (completedPhotos < requiredCount) return "incompleto";
  return existingStatus === "nuevo" || existingStatus === "incompleto" ? "listo" : existingStatus ?? "listo";
}

// The required view count is per-protocol (see getRequiredViewKeysForLead) —
// today it's always the 5 capilar views, but this stops assuming that number
// so a future specialty's protocol, with a different set of required views,
// is gated correctly without changing this code.
function completedRequiredViews(
  photos: Awaited<ReturnType<typeof getPhotoStatusesForLead>>,
  requiredKeys: string[],
): number {
  const required = new Set(requiredKeys);
  return new Set(
    photos
      .filter((photo) => photo.status === "confirmed" && required.has(photo.key))
      .map((photo) => photo.key),
  ).size;
}

/**
 * The answers to the clinic specialty's own questions. Capilar keeps its
 * historical columns, so it has none here; any other specialty's answers are
 * validated against its question list (unknown keys and unlisted options are
 * dropped). An update that omits them keeps what was saved.
 */
async function specialtyAnswers(centerId: string, payload: Record<string, unknown>, existing?: unknown): Promise<Record<string, string> | undefined> {
  const [center] = await db.select({ specialty: centersTable.specialty }).from(centersTable).where(eq(centersTable.id, centerId));
  const intake = getSpecialty(center?.specialty).intake;
  if (!intake) return undefined;
  return cleanIntake(intake, payload.clinicalData === undefined ? existing : payload.clinicalData);
}

async function createPatientInCenter(req: express.Request, res: express.Response, centerId: string): Promise<void> {
  // A suspended clinic stops taking new patients too, not just staff logins —
  // otherwise "suspend" would only block the people reviewing evaluations,
  // not the public form still collecting them.
  if (!(await isCenterActive(centerId))) {
    res.status(403).json({ error: "Esta clínica no está aceptando nuevas evaluaciones en este momento." });
    return;
  }
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
  const data = buildLead(parsed.data as Record<string, unknown>, {}, await specialtyAnswers(centerId, parsed.data as Record<string, unknown>));
  if (!data.consent || !data.name || !data.phone) {
    res.status(422).json({ error: "Completa tu nombre, teléfono y consentimiento." });
    return;
  }
  if (data.email && !EMAIL_REGEX.test(data.email)) {
    res.status(422).json({ error: "Ingresa un correo electrónico válido." });
    return;
  }
  if (data.deliveryChannel === "email" && !data.email) {
    res.status(422).json({ error: "Para recibir los resultados por correo, ingresa tu correo electrónico." });
    return;
  }
  // Duplicates never return the existing token: phone, email and RUT are not
  // secrets. `resumable` only tells the client that the evaluation is still in
  // progress, so it can point the patient back to the device that holds it.
  // Scoped to this clinic: the same RUT/phone/email at a different clinic is
  // not a duplicate (a patient can be evaluated at several clinics, each one
  // through that clinic's own address).
  const [rutDuplicate] = await db.select({ id: leadsTable.id, status: leadsTable.status }).from(leadsTable)
    .where(and(eq(leadsTable.documentNormalized, data.documentNormalized), eq(leadsTable.centerId, centerId)))
    .limit(1);
  if (rutDuplicate) {
    res.status(409).json({ error: "Ya existe una evaluación registrada con este RUT.", duplicate: true, resumable: rutDuplicate.status === "incompleto" });
    return;
  }
  const contactConditions = [eq(leadsTable.phone, data.phone)];
  if (data.email) contactConditions.push(eq(leadsTable.email, data.email));
  const [duplicate] = await db.select({ id: leadsTable.id, status: leadsTable.status }).from(leadsTable)
    .where(and(or(...contactConditions), eq(leadsTable.centerId, centerId)))
    .limit(1);
  if (duplicate) {
    res.status(409).json({ error: "Ya existe una evaluación con este teléfono o correo.", duplicate: true, resumable: duplicate.status === "incompleto" });
    return;
  }

  const protocolId = defaultProtocolIdForCenter(centerId);
  await ensureClinicalConfiguration(centerId, protocolId);
  const newLead = {
    id: uid(),
    token: uid(24),
    status: "incompleto",
    notes: "",
    norwood: "",
    appointmentAt: "",
    isDemo: false,
    photos: [],
    photoCount: "0",
    centerId,
    protocolId,
    ...data,
  };
  await db.insert(leadsTable).values(newLead);
  const [inserted] = await db.select().from(leadsTable).where(eq(leadsTable.id, newLead.id));
  // The patient's portal account is created from the email they typed; the
  // mail with the link to choose a password goes out in the background.
  void ensurePatientAccountForLead(inserted, baseUrl(req));
  res.status(201).json({ ok: true, lead: await leadSummary(inserted) });
}


// Legacy generic address (/patient): always the main clinic. Kept so links
// already out in the world keep working.
router.post("/patients", async (req, res): Promise<void> => {
  await createPatientInCenter(req, res, DEFAULT_CENTER_ID);
});

// A clinic's own address (app.../c/{slug}): the patient registers at that
// clinic and no other. To be evaluated at another clinic, the patient repeats
// the process through that clinic's address.
router.get("/clinics/:slug", async (req, res): Promise<void> => {
  const params = GetClinicParams.safeParse(req.params);
  const center = params.success ? await findCenterBySlug(params.data.slug) : undefined;
  if (!center) {
    res.status(404).json({ error: "Esta clínica no existe." });
    return;
  }
  res.json(await clinicIdentity(center.id));
});

router.post("/clinics/:slug/patients", async (req, res): Promise<void> => {
  const params = CreateClinicPatientParams.safeParse(req.params);
  const center = params.success ? await findCenterBySlug(params.data.slug) : undefined;
  if (!center) {
    res.status(404).json({ error: "Esta clínica no existe." });
    return;
  }
  await createPatientInCenter(req, res, center.id);
});

// Who is taking these photos? The patient view shows the clinic's own name and
// logo (not the platform's), resolved from the invitation token. GetPatientParams
// is the same { token } shape, so it's reused.
router.get("/patients/:token/clinic", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Token inválido." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  if (!lead) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }
  res.json(await clinicIdentity(lead.centerId));
});

// The photos this patient must take (the clinic's configured pre-evaluación).
router.get("/patients/:token/protocol", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Token inválido." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  if (!lead) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }
  const centerId = lead.centerId || DEFAULT_CENTER_ID;
  const protocolId = lead.protocolId || defaultProtocolIdForCenter(centerId);
  await ensureClinicalConfiguration(centerId, protocolId);
  const { phase, views } = await getPatientPhaseViews(protocolId);
  res.json({
    phaseName: phase?.name ?? "Pre-evaluación",
    views: views.map((view) => ({
      key: view.key,
      label: view.label,
      required: (view.requirements as Record<string, unknown> | null)?.required !== false,
    })),
  });
});

router.get("/patients/:token", async (req, res): Promise<void> => {
  const params = GetPatientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Token inválido." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  if (!lead) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }
  res.json({ ok: true, lead: await leadSummary(lead) });
});

router.put("/patients/:token", async (req, res): Promise<void> => {
  const params = UpdatePatientParams.safeParse(req.params);
  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }
  const existing = await findLeadByToken(params.data.token);
  if (!existing) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }
  const rutCheck = validateRut(String((parsed.data as Record<string, unknown>).documentId ?? ""));
  if (!rutCheck.valid) {
    res.status(400).json({ error: rutCheck.error });
    return;
  }
  const existingCenterId = existing.centerId ?? DEFAULT_CENTER_ID;
  const data = buildLead(parsed.data as Record<string, unknown>, existing, await specialtyAnswers(existingCenterId, parsed.data as Record<string, unknown>, existing.clinicalData));
  const [rutClash] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.documentNormalized, data.documentNormalized), eq(leadsTable.centerId, existingCenterId)))
    .limit(1);
  if (rutClash && rutClash.id !== existing.id) {
    res.status(409).json({ error: "Ya existe una evaluación registrada con este RUT.", duplicate: true });
    return;
  }
  if (!data.consent || !data.name || !data.phone) {
    res.status(422).json({ error: "Completa tu nombre, teléfono y consentimiento." });
    return;
  }
  if (data.deliveryChannel === "email" && !data.email) {
    res.status(422).json({ error: "Para recibir los resultados por correo, ingresa tu correo electrónico." });
    return;
  }
  const clinicalPhotos = await getPhotoStatusesForLead(existing);
  const requiredKeys = await getRequiredViewKeysForLead(existing);
  const completed = completedRequiredViews(clinicalPhotos, requiredKeys);
  if ((req.body as Record<string, unknown>).submit === true && completed < requiredKeys.length) {
    res.status(422).json({ error: "Debes guardar las cinco fotografías obligatorias antes de enviar." });
    return;
  }
  const [updated] = await db.update(leadsTable)
    .set({ ...data, status: updatedStatus(existing.status, completed, requiredKeys.length), photoCount: String(completed) })
    .where(eq(leadsTable.id, existing.id)).returning();
  if (normalizeEmail(updated.email ?? "") !== normalizeEmail(existing.email ?? "") && existing.patientAccountId) {
    // A different email is a different account.
    await db.update(leadsTable).set({ patientAccountId: null }).where(eq(leadsTable.id, updated.id));
    updated.patientAccountId = null;
  }
  void ensurePatientAccountForLead(updated, baseUrl(req));
  res.json({ ok: true, lead: await leadSummary(updated) });
});

router.get("/patients/:token/photos", async (req, res): Promise<void> => {
  const params = GetPatientPhotoStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Token inválido." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  if (!lead) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }
  res.json({ ok: true, photos: await getPhotoStatusesForLead(lead) });
});

router.post("/patients/:token/photos", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_PHOTO_BYTES }), async (req, res): Promise<void> => {
  const params = UploadPatientPhotoParams.safeParse(req.params);
  const headers = UploadPatientPhotoHeader.safeParse(req.headers);
  const image = await parseImageRequest(req);
  const width = headers.success ? parseOptionalPixelDimension(headers.data["x-photo-width"]) : null;
  const height = headers.success ? parseOptionalPixelDimension(headers.data["x-photo-height"]) : null;
  const captureMetadata = parseCaptureMetadata(req.headers["x-photo-metadata"] as string | undefined);
  if (!params.success || !headers.success || !image || width === null || height === null || !captureMetadata
    || (width !== undefined && width !== image.width) || (height !== undefined && height !== image.height)) {
    res.status(400).json({ error: "La foto debe ser JPEG, PNG o WebP y pesar hasta 10 MB." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  if (!lead) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }
  try {
    const photo = await createClinicalPhoto({
      lead,
      key: headers.data["x-photo-key"],
      source: headers.data["x-photo-source"],
      contentType: image.contentType,
      bytes: image.bytes,
      width: image.width,
      height: image.height,
      captureMetadata,
    });
    res.status(201).json(photo);
  } catch {
    res.status(400).json({ error: "No pudimos guardar esa foto para esta vista." });
  }
});

const MAX_PHOTO_NOTE_LENGTH = 500;

router.post("/patients/:token/photos/:photoId/confirm", async (req, res): Promise<void> => {
  const params = ConfirmPatientPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }
  // Optional description the patient adds to the photo (plain text, trimmed).
  const rawNote = (req.body as { note?: unknown } | undefined)?.note;
  if (rawNote !== undefined && rawNote !== null && (typeof rawNote !== "string" || rawNote.length > MAX_PHOTO_NOTE_LENGTH)) {
    res.status(400).json({ error: `La descripción no puede superar ${MAX_PHOTO_NOTE_LENGTH} caracteres.` });
    return;
  }
  const note = typeof rawNote === "string" ? rawNote.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim() || null : undefined;
  const lead = await findLeadByToken(params.data.token);
  const photo = lead ? await confirmClinicalPhoto(lead, params.data.photoId, note) : null;
  if (!photo) {
    res.status(404).json({ error: "Borrador no encontrado." });
    return;
  }
  res.json(photo);
});

async function streamPatientPhotoRendition(req: express.Request, res: express.Response, rendition: "original" | "adjusted"): Promise<void> {
  const params = CreatePatientAdjustedPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  const photo = lead ? await getPatientPhotoFile(lead, params.data.photoId, rendition) : null;
  if (!photo) {
    res.status(404).json({ error: "Foto no encontrada." });
    return;
  }
  try {
    const file = await privatePhotoStorage.read(photo.objectPath);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Length", String(file.bytes.length));
    res.send(file.bytes);
  } catch {
    res.status(404).json({ error: "Foto no encontrada." });
  }
}

router.get("/patients/:token/photos/:photoId/original", async (req, res): Promise<void> => {
  await streamPatientPhotoRendition(req, res, "original");
});

router.get("/patients/:token/photos/:photoId/adjusted", async (req, res): Promise<void> => {
  await streamPatientPhotoRendition(req, res, "adjusted");
});

router.post("/patients/:token/photos/:photoId/adjusted", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_PHOTO_BYTES }), async (req, res): Promise<void> => {
  const params = CreatePatientAdjustedPhotoParams.safeParse(req.params);
  const headers = CreatePatientAdjustedPhotoHeader.safeParse(req.headers);
  const image = await parseImageRequest(req);
  if (!params.success || !headers.success || !image) {
    res.status(400).json({ error: "La versión ajustada debe ser JPEG, PNG o WebP válido." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  if (!lead) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }
  const statuses = await getPhotoStatusesForLead(lead);
  const original = statuses.find((photo) => photo.id === params.data.photoId);
  const editParams = original ? parseTechnicalEditParams(headers.data["x-edit-params"], original) : null;
  if (!original || !editParams) {
    res.status(400).json({ error: "Los ajustes técnicos exceden los límites permitidos." });
    return;
  }
  const photo = await createAdjustedPhoto({
    lead,
    photoId: params.data.photoId,
    editParams: {
      ...editParams,
      original: {
        sha256: original.sha256,
        width: original.width,
        height: original.height,
      },
      output: {
        width: Math.round((editParams.crop as { width: number }).width),
        height: Math.round((editParams.crop as { height: number }).height),
      },
    },
  });
  if (!photo) {
    res.status(404).json({ error: "Foto no encontrada." });
    return;
  }
  res.status(201).json(photo);
});

router.delete("/patients/:token/photos/:photoId/adjusted", async (req, res): Promise<void> => {
  const params = CreatePatientAdjustedPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  if (!lead || !(await discardAdjustedPhoto(lead, params.data.photoId))) {
    res.status(404).json({ error: "Versión ajustada no encontrada." });
    return;
  }
  res.json({ ok: true });
});

router.delete("/patients/:token/photos/:photoId", async (req, res): Promise<void> => {
  const params = DiscardPatientPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  if (!lead || !(await discardClinicalPhoto(lead, params.data.photoId))) {
    res.status(404).json({ error: "Borrador no encontrado." });
    return;
  }
  res.json({ ok: true });
});

router.delete("/patients/:token/photos", async (req, res): Promise<void> => {
  const params = DiscardPatientPhotosParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Token inválido." });
    return;
  }
  const existing = await findLeadByToken(params.data.token);
  if (!existing) {
    res.status(404).json({ error: "Este enlace ya no está disponible." });
    return;
  }
  await discardAllPatientCapturePhotos(existing);
  const [updated] = await db.select().from(leadsTable).where(eq(leadsTable.id, existing.id));
  res.json({ ok: true, lead: await leadSummary(updated) });
});

export default router;
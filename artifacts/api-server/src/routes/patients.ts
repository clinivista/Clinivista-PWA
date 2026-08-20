import express, { Router, type IRouter } from "express";
import { spawn } from "node:child_process";
import { eq, or } from "drizzle-orm";
import { db, leadsTable } from "@workspace/db";
import {
  ConfirmPatientPhotoParams,
  CreatePatientBody,
  DiscardPatientPhotoParams,
  DiscardPatientPhotosParams,
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
  DEFAULT_PROTOCOL_ID,
  confirmClinicalPhoto,
  createClinicalPhoto,
  discardAllDraftPhotos,
  discardClinicalPhoto,
  ensureDefaultClinicalConfiguration,
  getPhotoStatusesForLead,
} from "../lib/clinical-photos";

const router: IRouter = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 20_000;
const MAX_IMAGE_PIXELS = 40_000_000;

function buildLead(payload: Record<string, unknown>, existing: Partial<typeof leadsTable.$inferInsert> = {}) {
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
  };
}

function legacyPhotoKeys(lead: typeof leadsTable.$inferSelect): string[] {
  return Array.isArray(lead.photos)
    ? (lead.photos as Array<{ key?: unknown }>).flatMap((photo) => typeof photo?.key === "string" ? [photo.key] : [])
    : [];
}

async function leadSummary(lead: typeof leadsTable.$inferSelect) {
  const { photos, symptoms, surgeryHistory, notes, ...safe } = lead;
  const clinicalPhotos = await getPhotoStatusesForLead(lead);
  const visibleClinical = clinicalPhotos.filter((photo) => ["draft", "confirmed"].includes(photo.status));
  const keys = [...new Set([...legacyPhotoKeys(lead), ...visibleClinical.map((photo) => photo.key)])];
  return { ...safe, photoCount: keys.length, photoKeys: keys };
}

async function findLeadByToken(token: string) {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.token, token));
  return lead;
}

function readImageDimensions(contentType: string, bytes: Buffer): { width: number; height: number } | null {
  if (contentType === "image/png") {
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      || bytes.toString("ascii", 12, 16) !== "IHDR") return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (contentType === "image/jpeg") {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
    for (let offset = 2; offset + 9 < bytes.length;) {
      if (bytes[offset] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)
        || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
      }
      offset += length;
    }
    return null;
  }
  if (bytes.length < 30 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  if (chunk === "VP8 ") {
    if (bytes.length < 30 || bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (bytes.length < 25 || bytes[20] !== 0x2f) return null;
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
    };
  }
  return null;
}

async function fullyDecodeImage(
  contentType: string,
  bytes: Buffer,
  dimensions: { width: number; height: number },
): Promise<boolean> {
  return new Promise((resolve) => {
    const expectedFormat = contentType === "image/jpeg" ? "JPEG"
      : contentType === "image/png" ? "PNG" : "WEBP";
    const decoder = spawn("identify", [
      "-limit", "memory", "64MiB",
      "-limit", "map", "128MiB",
      "-limit", "disk", "0",
      "-quiet", "-format", "%m:%w:%h", "-",
    ], { stdio: ["pipe", "pipe", "ignore"] });
    let output = "";
    decoder.stdout?.setEncoding("utf8");
    decoder.stdout?.on("data", (chunk: string) => {
      output = (output + chunk).slice(0, 100);
    });
    const timeout = setTimeout(() => decoder.kill("SIGKILL"), 10_000);
    decoder.once("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
    decoder.once("close", (code) => {
      clearTimeout(timeout);
      resolve(code === 0 && output === `${expectedFormat}:${dimensions.width}:${dimensions.height}`);
    });
    decoder.stdin.end(bytes);
  });
}

async function parseImageRequest(req: express.Request): Promise<{
  contentType: string;
  bytes: Buffer;
  width: number;
  height: number;
} | null> {
  const contentType = req.headers["content-type"]?.split(";")[0]?.toLowerCase() ?? "";
  if (!ALLOWED_IMAGE_TYPES.has(contentType) || !Buffer.isBuffer(req.body) || req.body.length === 0 || req.body.length > MAX_PHOTO_BYTES) {
    return null;
  }
  const dimensions = readImageDimensions(contentType, req.body);
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1
    || dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION
    || dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
    || !(await fullyDecodeImage(contentType, req.body, dimensions))) return null;
  return { contentType, bytes: req.body, ...dimensions };
}

function parseOptionalPixelDimension(value: string | undefined): number | undefined | null {
  if (value === undefined) return undefined;
  if (!/^\d{1,5}$/.test(value)) return null;
  const numeric = Number(value);
  return numeric > 0 && numeric <= 20_000 ? numeric : null;
}

function updatedStatus(existingStatus: string | null, completedPhotos: number): string {
  if (completedPhotos < 5) return "incompleto";
  return existingStatus === "nuevo" || existingStatus === "incompleto" ? "listo" : existingStatus ?? "listo";
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
  const data = buildLead(parsed.data as Record<string, unknown>);
  if (!data.consent || !data.name || !data.phone) {
    res.status(422).json({ error: "Completa tu nombre, teléfono y consentimiento." });
    return;
  }
  if (data.email && !EMAIL_REGEX.test(data.email)) {
    res.status(422).json({ error: "Ingresa un correo electrónico válido." });
    return;
  }
  const [rutDuplicate] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(eq(leadsTable.documentNormalized, data.documentNormalized)).limit(1);
  if (rutDuplicate) {
    res.status(409).json({ error: "Ya existe una evaluación registrada con este RUT.", duplicate: true });
    return;
  }
  const conditions = [eq(leadsTable.phone, data.phone)];
  if (data.email) conditions.push(eq(leadsTable.email, data.email));
  const [duplicate] = await db.select({ id: leadsTable.id }).from(leadsTable).where(or(...conditions)).limit(1);
  if (duplicate) {
    res.status(409).json({ error: "Ya existe una evaluación con este teléfono o correo.", duplicate: true });
    return;
  }

  await ensureDefaultClinicalConfiguration();
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
    centerId: DEFAULT_CENTER_ID,
    protocolId: DEFAULT_PROTOCOL_ID,
    ...data,
  };
  await db.insert(leadsTable).values(newLead);
  const [inserted] = await db.select().from(leadsTable).where(eq(leadsTable.id, newLead.id));
  res.status(201).json({ ok: true, lead: await leadSummary(inserted) });
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
  const data = buildLead(parsed.data as Record<string, unknown>, existing);
  const [rutClash] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(eq(leadsTable.documentNormalized, data.documentNormalized)).limit(1);
  if (rutClash && rutClash.id !== existing.id) {
    res.status(409).json({ error: "Ya existe una evaluación registrada con este RUT.", duplicate: true });
    return;
  }
  if (!data.consent || !data.name || !data.phone) {
    res.status(422).json({ error: "Completa tu nombre, teléfono y consentimiento." });
    return;
  }
  const clinicalPhotos = await getPhotoStatusesForLead(existing);
  const completed = clinicalPhotos.filter((photo) => photo.status === "confirmed").length;
  const [updated] = await db.update(leadsTable)
    .set({ ...data, status: updatedStatus(existing.status, completed), photoCount: String(completed) })
    .where(eq(leadsTable.id, existing.id)).returning();
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
  if (!params.success || !headers.success || !image || width === null || height === null
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
    });
    res.status(201).json(photo);
  } catch {
    res.status(400).json({ error: "No pudimos guardar esa foto para esta vista." });
  }
});

router.post("/patients/:token/photos/:photoId/confirm", async (req, res): Promise<void> => {
  const params = ConfirmPatientPhotoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }
  const lead = await findLeadByToken(params.data.token);
  const photo = lead ? await confirmClinicalPhoto(lead, params.data.photoId) : null;
  if (!photo) {
    res.status(404).json({ error: "Borrador no encontrado." });
    return;
  }
  res.json(photo);
});

router.post("/patients/:token/photos/:photoId/adjusted", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_PHOTO_BYTES }), async (req, res): Promise<void> => {
  res.status(403).json({ error: "La edición técnica solo está disponible desde el editor clínico autorizado." });
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
  await discardAllDraftPhotos(existing);
  const statuses = await getPhotoStatusesForLead(existing);
  const completed = statuses.filter((photo) => photo.status === "confirmed").length;
  const [updated] = await db.update(leadsTable)
    .set({ photoCount: String(completed), status: updatedStatus(existing.status, completed), updatedAt: new Date() })
    .where(eq(leadsTable.id, existing.id)).returning();
  res.json({ ok: true, lead: await leadSummary(updated) });
});

export default router;
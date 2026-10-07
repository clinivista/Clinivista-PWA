import crypto from "crypto";
import sharp from "sharp";
import { and, asc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import {
  centersTable,
  clinicalPhotosTable,
  db,
  evaluationsTable,
  leadsTable,
  photoAuditEventsTable,
  protocolPhasesTable,
  protocolsTable,
  protocolViewsTable,
  type ClinicalPhoto,
  type Lead,
} from "@workspace/db";
import { uid } from "./helpers";
import { createObjectKey, privatePhotoStorage } from "./clinical-photo-storage";
import { SPECIALTY_ID, PROTOCOL_VIEWS, DEFAULT_PHASES, clinicalDataFromLead } from "./specialties/capilar";

export const DEFAULT_CENTER_ID = process.env.DEFAULT_CENTER_ID ?? "default-center";
export const DEFAULT_PROTOCOL_ID = process.env.DEFAULT_PROTOCOL_ID
  ?? (DEFAULT_CENTER_ID === "default-center" ? "capillary-initial" : `${DEFAULT_CENTER_ID}-capillary-initial`);
const photoMutationChains = new Map<string, Promise<void>>();

async function serializePhotoMutation<T>(photoId: string, operation: () => Promise<T>): Promise<T> {
  const previous = photoMutationChains.get(photoId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const next = previous.catch(() => undefined).then(() => gate);
  photoMutationChains.set(photoId, next);
  await previous.catch(() => undefined);
  try {
    return await operation();
  } finally {
    release();
    if (photoMutationChains.get(photoId) === next) photoMutationChains.delete(photoId);
  }
}

export type PhotoStatus = {
  id: string;
  key: string;
  label: string;
  status: string;
  source: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: Date;
  confirmedAt: Date | null;
  hasOriginal: boolean;
  hasAdjusted: boolean;
  width: number | null;
  height: number | null;
  captureMetadata: unknown;
  note: string | null;
  editParams?: unknown;
};

function photoStatus(photo: ClinicalPhoto, view: { key: string; label: string }): PhotoStatus {
  return {
    id: photo.id,
    key: view.key,
    label: view.label,
    status: photo.status,
    source: photo.source,
    mimeType: photo.originalMimeType,
    sizeBytes: photo.originalBytes,
    sha256: photo.originalSha256,
    createdAt: photo.createdAt,
    confirmedAt: photo.confirmedAt,
    hasOriginal: Boolean(photo.originalObjectPath),
    hasAdjusted: Boolean(photo.derivativeObjectPath),
    width: photo.width,
    height: photo.height,
    captureMetadata: photo.captureMetadata,
    note: photo.note ?? null,
    ...(photo.editParams ? { editParams: photo.editParams } : {}),
  };
}

export function defaultProtocolIdForCenter(centerId: string): string {
  return centerId === DEFAULT_CENTER_ID ? DEFAULT_PROTOCOL_ID : `${centerId}-capillary-initial`;
}

export async function ensureClinicalConfiguration(
  centerId = DEFAULT_CENTER_ID,
  protocolId = defaultProtocolIdForCenter(centerId),
): Promise<void> {
  await db.insert(centersTable).values({
    id: centerId,
    name: centerId === DEFAULT_CENTER_ID ? "Centro principal" : `Centro ${centerId}`,
    slug: centerId,
  }).onConflictDoNothing();
  await db.insert(protocolsTable).values({
    id: protocolId,
    centerId,
    name: "Protocolo capilar inicial",
    version: "1",
    specialty: SPECIALTY_ID,
  }).onConflictDoNothing();
  // Once a protocol has phases the clinic owns its photo list: never re-insert
  // the starting views (they would bring back what the clinic removed).
  const [configured] = await db.select({ id: protocolPhasesTable.id }).from(protocolPhasesTable)
    .where(eq(protocolPhasesTable.protocolId, protocolId)).limit(1);
  if (configured) return;
  await db.insert(protocolViewsTable).values(
    PROTOCOL_VIEWS.map(({ key, label, required }, position) => ({
      id: `${protocolId}-${key}`,
      protocolId,
      key,
      label,
      position,
      requirements: {
        quality: ["rostro o zona completa visible", "iluminación uniforme", "imagen enfocada"],
        required,
      },
    })),
  ).onConflictDoNothing();
  await ensureDefaultPhases(protocolId);
}

/**
 * First use of a protocol: loads the clinic's six starting phases
 * (pre-evaluación … control médico 2), each with the same five views, and
 * attaches the views that existed before phases to the first one. Once a
 * protocol has phases the clinic's legal representative owns the structure
 * and this never touches it again. A cheap "any phase?" check keeps it free
 * on the hot path.
 */
async function ensureDefaultPhases(protocolId: string): Promise<void> {
  const phases = DEFAULT_PHASES.map(({ key, name }, position) => ({
    id: `${protocolId}-phase-${key}`,
    protocolId,
    key,
    name,
    position,
  }));
  await db.insert(protocolPhasesTable).values(phases).onConflictDoNothing();
  await db.update(protocolViewsTable)
    .set({ phaseId: phases[0].id })
    .where(and(eq(protocolViewsTable.protocolId, protocolId), isNull(protocolViewsTable.phaseId)));
  await db.insert(protocolViewsTable).values(
    phases.slice(1).flatMap((phase) =>
      PROTOCOL_VIEWS.map(({ key, label, required }, position) => ({
        id: `${protocolId}-${phase.key}-${key}`,
        protocolId,
        phaseId: phase.id,
        key: `${phase.key}-${key}`,
        label,
        position,
        requirements: { required },
      })),
    ),
  ).onConflictDoNothing();
}

/**
 * The views the patient captures: those of the protocol's first (active)
 * phase, the pre-evaluación. Later phases are captured by the clinic's staff,
 * so they never count toward the patient's submission nor accept uploads
 * from a patient token.
 */
export async function getPatientPhaseViews(protocolId: string) {
  const [firstPhase] = await db.select().from(protocolPhasesTable)
    .where(and(eq(protocolPhasesTable.protocolId, protocolId), eq(protocolPhasesTable.active, true)))
    .orderBy(asc(protocolPhasesTable.position)).limit(1);
  const views = await db.select().from(protocolViewsTable).where(and(
    eq(protocolViewsTable.protocolId, protocolId),
    eq(protocolViewsTable.active, true),
    firstPhase
      ? or(eq(protocolViewsTable.phaseId, firstPhase.id), isNull(protocolViewsTable.phaseId))
      : isNull(protocolViewsTable.phaseId),
  ));
  views.sort((a, b) => a.position - b.position);
  return { phase: firstPhase ?? null, views };
}

/** How many of the patient's views are mandatory before an evaluation can be
 * submitted — sourced from the protocol's own first phase instead of a
 * hardcoded number, so each clinic's configuration gates its own patients. */
export async function getRequiredViewKeys(protocolId: string): Promise<string[]> {
  const { views } = await getPatientPhaseViews(protocolId);
  return views
    .filter((view) => (view.requirements as Record<string, unknown> | null)?.required !== false)
    .map((view) => view.key);
}

export async function ensureDefaultClinicalConfiguration(): Promise<void> {
  await ensureClinicalConfiguration();
}

export async function ensureEvaluationForLead(lead: Lead) {
  const centerId = lead.centerId || DEFAULT_CENTER_ID;
  const protocolId = lead.protocolId || defaultProtocolIdForCenter(centerId);
  await ensureClinicalConfiguration(centerId, protocolId);

  if (lead.centerId !== centerId || lead.protocolId !== protocolId) {
    await db.update(leadsTable)
      .set({ centerId, protocolId, updatedAt: new Date() })
      .where(eq(leadsTable.id, lead.id));
  }

  await db.insert(evaluationsTable).values({
    id: `evaluation-${lead.id}`,
    leadId: lead.id,
    centerId,
    protocolId,
    status: "draft",
    clinicalData: clinicalDataFromLead(lead),
  }).onConflictDoNothing();

  const [evaluation] = await db.select().from(evaluationsTable)
    .where(eq(evaluationsTable.leadId, lead.id));
  if (!evaluation) throw new Error("Unable to initialize clinical evaluation.");

  // Keep clinicalData mirroring the lead's own (still authoritative for now)
  // capilar columns, so it never drifts stale after the lead is edited.
  const freshClinicalData = clinicalDataFromLead(lead);
  if (JSON.stringify(freshClinicalData) !== JSON.stringify(evaluation.clinicalData ?? {})) {
    await db.update(evaluationsTable)
      .set({ clinicalData: freshClinicalData, updatedAt: new Date() })
      .where(eq(evaluationsTable.id, evaluation.id));
    evaluation.clinicalData = freshClinicalData;
  }
  return evaluation;
}

export async function getRequiredViewKeysForLead(lead: Lead): Promise<string[]> {
  const evaluation = await ensureEvaluationForLead(lead);
  return getRequiredViewKeys(evaluation.protocolId);
}

export async function getPhotoStatusesForLead(lead: Lead): Promise<PhotoStatus[]> {
  const evaluation = await ensureEvaluationForLead(lead);
  const views = await db.select().from(protocolViewsTable)
    .where(eq(protocolViewsTable.protocolId, evaluation.protocolId));
  await migrateLegacyPhotoReferences(lead, evaluation.id, evaluation.protocolId, views);
  const photos = await db.select().from(clinicalPhotosTable)
    .where(and(
      eq(clinicalPhotosTable.evaluationId, evaluation.id),
      ne(clinicalPhotosTable.status, "discarded"),
    ));
  const viewsById = new Map(views.map((view) => [view.id, view]));
  return photos
    .map((photo) => {
      const view = viewsById.get(photo.viewId);
      return view ? photoStatus(photo, view) : null;
    })
    .filter((value): value is PhotoStatus => value !== null);
}

async function migrateLegacyPhotoReferences(
  lead: Lead,
  evaluationId: string,
  protocolId: string,
  views: Array<typeof protocolViewsTable.$inferSelect>,
): Promise<void> {
  if (!Array.isArray(lead.photos)) return;
  const legacyPhotos = lead.photos as Array<{ key?: unknown; dataUrl?: unknown }>;
  if (!legacyPhotos.length) return;
  const existing = await db.select({
    viewId: clinicalPhotosTable.viewId,
  }).from(clinicalPhotosTable).where(eq(clinicalPhotosTable.evaluationId, evaluationId));
  const existingViewIds = new Set(existing.map((photo) => photo.viewId));
  const viewsByKey = new Map(views.map((view) => [view.key, view]));
  const sanitizedLegacy = [...legacyPhotos] as Array<Record<string, unknown>>;
  let didSanitize = false;

  for (const [index, legacy] of legacyPhotos.entries()) {
    const safeLegacy = legacy && typeof legacy === "object" ? legacy as Record<string, unknown> : {};
    if (typeof safeLegacy.dataUrl !== "string") {
      sanitizedLegacy[index] = safeLegacy;
      continue;
    }
    didSanitize = true;
    const match = safeLegacy.dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!match) {
      sanitizedLegacy[index] = { key: typeof safeLegacy.key === "string" ? safeLegacy.key : undefined, migrationDisposition: "redacted_invalid_legacy_payload" };
      continue;
    }
    const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
      sanitizedLegacy[index] = { key: typeof safeLegacy.key === "string" ? safeLegacy.key : undefined, migrationDisposition: "redacted_invalid_legacy_payload" };
      continue;
    }
    const legacyKey = typeof safeLegacy.key === "string" ? safeLegacy.key : "";
    const configuredView = viewsByKey.get(legacyKey);
    const isMappedImage = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(match[1].toLowerCase())
      && configuredView && !existingViewIds.has(configuredView.id);
    let view = configuredView;
    let status = "confirmed";
    let contentType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
    if (!isMappedImage) {
      const quarantineKey = `legacy-${lead.id.slice(0, 12)}-${index}`;
      const quarantineId = `${protocolId}-${quarantineKey}`;
      await db.insert(protocolViewsTable).values({
        id: quarantineId,
        protocolId,
        key: quarantineKey,
        label: "Referencia histórica en cuarentena",
        position: 10_000 + index,
        requirements: { legacyQuarantine: true },
        active: false,
      }).onConflictDoNothing();
      [view] = await db.select().from(protocolViewsTable).where(eq(protocolViewsTable.id, quarantineId));
      status = "quarantined";
      contentType = "application/octet-stream";
    }
    if (!view) {
      sanitizedLegacy[index] = { key: legacyKey || undefined, migrationDisposition: "redacted_invalid_legacy_payload" };
      continue;
    }
    const stored = await privatePhotoStorage.put({
      key: createObjectKey({
        centerId: lead.centerId || DEFAULT_CENTER_ID,
        evaluationId,
        kind: status === "quarantined" ? "legacy-quarantine" : "original",
        contentType,
      }),
      bytes,
      contentType,
    });
    const originalHash = crypto.createHash("sha256").update(bytes).digest("hex");
    const verification = await privatePhotoStorage.read(stored.objectPath);
    const verificationHash = crypto.createHash("sha256").update(verification.bytes).digest("hex");
    if (verificationHash !== originalHash) {
      throw new Error("Legacy clinical photo storage verification failed.");
    }
    const id = uid(18);
    const [photo] = await db.insert(clinicalPhotosTable).values({
      id,
      evaluationId,
      viewId: view.id,
      status,
      originalObjectPath: stored.objectPath,
      originalMimeType: contentType,
      originalBytes: bytes.length,
      originalSha256: originalHash,
      source: "legacy",
      captureMetadata: { migratedLegacyReference: true, storage: privatePhotoStorage.mode, disposition: status },
      confirmedAt: status === "confirmed" ? new Date() : null,
    }).returning();
    await writeAuditEvent(photo, "legacy_reference_migrated", "system", null, { view: view.key, disposition: status });
    existingViewIds.add(view.id);
    sanitizedLegacy[index] = {
      key: legacyKey || undefined,
      migratedPhotoId: id,
      migratedAt: new Date().toISOString(),
      migrationDisposition: status === "confirmed" ? "migrated" : "quarantined",
    };
    didSanitize = true;
  }
  if (didSanitize) {
    await db.update(leadsTable)
      .set({ photos: sanitizedLegacy, updatedAt: new Date() })
      .where(eq(leadsTable.id, lead.id));
  }
}

export async function createClinicalPhoto(input: {
  lead: Lead;
  key: string;
  label?: string;
  source: "camera" | "upload";
  contentType: string;
  bytes: Buffer;
  width?: number;
  height?: number;
  captureMetadata?: Record<string, unknown>;
}): Promise<PhotoStatus> {
  const evaluation = await ensureEvaluationForLead(input.lead);
  // A patient token only captures the pre-evaluación; later phases are the staff's.
  const { views: patientViews } = await getPatientPhaseViews(evaluation.protocolId);
  const view = patientViews.find((candidate) => candidate.key === input.key);
  if (!view) throw new Error("Unsupported protocol photo view.");

  const hash = crypto.createHash("sha256").update(input.bytes).digest("hex");
  const stored = await privatePhotoStorage.put({
    key: createObjectKey({
      centerId: evaluation.centerId,
      evaluationId: evaluation.id,
      kind: "original",
      contentType: input.contentType,
    }),
    bytes: input.bytes,
    contentType: input.contentType,
  });

  // A new capture supersedes only the previously selectable capture for this view.
  await db.update(clinicalPhotosTable)
    .set({ status: "superseded" })
    .where(and(
      eq(clinicalPhotosTable.evaluationId, evaluation.id),
      eq(clinicalPhotosTable.viewId, view.id),
      inArray(clinicalPhotosTable.status, ["draft", "confirmed"]),
    ));

  const id = uid(18);
  const now = new Date();
  const [photo] = await db.insert(clinicalPhotosTable).values({
    id,
    evaluationId: evaluation.id,
    viewId: view.id,
    status: "draft",
    originalObjectPath: stored.objectPath,
    originalMimeType: input.contentType,
    originalBytes: input.bytes.length,
    originalSha256: hash,
    width: input.width,
    height: input.height,
    source: input.source,
    captureMetadata: { storage: privatePhotoStorage.mode, ...(input.captureMetadata ?? {}) },
    createdAt: now,
  }).returning();
  await writeAuditEvent(photo, "uploaded", "patient", input.lead.id, { view: input.key });
  return photoStatus(photo, view);
}

export async function confirmClinicalPhoto(lead: Lead, photoId: string, note?: string | null): Promise<PhotoStatus | null> {
  const located = await findOwnedPhoto(lead, photoId);
  if (!located || located.photo.status !== "draft") return null;
  const now = new Date();
  const [photo] = await db.update(clinicalPhotosTable)
    .set({ status: "confirmed", confirmedAt: now, ...(note !== undefined ? { note } : {}) })
    .where(eq(clinicalPhotosTable.id, photoId))
    .returning();
  await writeAuditEvent(photo, "confirmed", "patient", lead.id, { hasNote: Boolean(photo.note) });
  return photoStatus(photo, located.view);
}

export async function createAdjustedPhoto(input: {
  lead: Lead;
  photoId: string;
  editParams: Record<string, unknown>;
}): Promise<PhotoStatus | null> {
  return serializePhotoMutation(input.photoId, async () => {
    const located = await findOwnedPhoto(input.lead, input.photoId);
    if (!located || located.photo.status !== "confirmed") return null;

    const rendered = await renderTrustedTechnicalDerivative(located.photo, input.editParams);
    const derivativeSha256 = crypto.createHash("sha256").update(rendered.bytes).digest("hex");
    let stored: { objectPath: string } | null = null;
    try {
      stored = await privatePhotoStorage.put({
        key: createObjectKey({
          centerId: input.lead.centerId || DEFAULT_CENTER_ID,
          evaluationId: located.photo.evaluationId,
          kind: "adjusted",
          contentType: "image/jpeg",
        }),
        bytes: rendered.bytes,
        contentType: "image/jpeg",
      });
      const derivativeDetails = {
        sha256: derivativeSha256,
        sizeBytes: rendered.bytes.length,
        mimeType: "image/jpeg",
        width: rendered.width,
        height: rendered.height,
        renderer: "server-sharp-v1",
      };
      const [photo] = await db.transaction(async (tx) => {
        const [updated] = await tx.update(clinicalPhotosTable)
          .set({
            derivativeObjectPath: stored!.objectPath,
            editParams: { ...input.editParams, derivative: derivativeDetails },
          })
          .where(and(eq(clinicalPhotosTable.id, input.photoId), eq(clinicalPhotosTable.status, "confirmed")))
          .returning();
        if (!updated) throw new Error("Clinical photo was no longer confirmed.");
        await tx.insert(photoAuditEventsTable).values({
          id: uid(18),
          photoId: updated.id,
          evaluationId: updated.evaluationId,
          action: "adjusted_version_created",
          actorType: "patient",
          actorId: input.lead.id,
          details: {
            originalSha256: located.photo.originalSha256,
            derivativeSha256,
            derivativeBytes: rendered.bytes.length,
            params: input.editParams,
            renderer: "server-sharp-v1",
          },
        });
        return [updated];
      });
      if (located.photo.derivativeObjectPath) {
        await privatePhotoStorage.remove(located.photo.derivativeObjectPath).catch(() => undefined);
      }
      return photoStatus(photo, located.view);
    } catch (error) {
      if (stored) await privatePhotoStorage.remove(stored.objectPath).catch(() => undefined);
      throw error;
    }
  });
}

export async function discardAdjustedPhoto(lead: Lead, photoId: string): Promise<boolean> {
  return serializePhotoMutation(photoId, async () => {
    const located = await findOwnedPhoto(lead, photoId);
    if (!located || located.photo.status !== "confirmed" || !located.photo.derivativeObjectPath) return false;
    const derivativePath = located.photo.derivativeObjectPath;
    const [photo] = await db.transaction(async (tx) => {
      const [updated] = await tx.update(clinicalPhotosTable)
        .set({ derivativeObjectPath: null, editParams: null })
        .where(and(
          eq(clinicalPhotosTable.id, photoId),
          eq(clinicalPhotosTable.status, "confirmed"),
          eq(clinicalPhotosTable.derivativeObjectPath, derivativePath),
        ))
        .returning();
      if (!updated) throw new Error("Clinical derivative changed before discard.");
      await tx.insert(photoAuditEventsTable).values({
        id: uid(18),
        photoId: updated.id,
        evaluationId: updated.evaluationId,
        action: "adjusted_version_discarded",
        actorType: "patient",
        actorId: lead.id,
        details: { originalSha256: located.photo.originalSha256 },
      });
      return [updated];
    });
    await privatePhotoStorage.remove(derivativePath);
    return Boolean(photo);
  });
}

async function renderTrustedTechnicalDerivative(photo: ClinicalPhoto, params: Record<string, unknown>) {
  const crop = params.crop as { x: number; y: number; width: number; height: number };
  const original = await privatePhotoStorage.read(photo.originalObjectPath);
  const oriented = await sharp(original.bytes, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .toBuffer({ resolveWithObject: true });
  if (crop.x < 0 || crop.y < 0 || crop.x + crop.width > oriented.info.width || crop.y + crop.height > oriented.info.height) {
    throw new Error("Technical crop did not match the normalized original.");
  }
  const value = (key: string) => Number(params[key]);
  const exposure = 2 ** value("exposure");
  const brightness = (1 + value("brightness") / 100) * exposure * (1 + (value("highlights") + value("shadows")) / 500);
  const contrast = 1 + value("contrast") / 100;
  const temperature = value("temperature");
  const detail = value("clarity") + value("sharpness");
  const pipeline = sharp(oriented.data, { failOn: "error" })
    .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
    .rotate(value("rotation"), { background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .resize(crop.width, crop.height, { fit: "fill", withoutEnlargement: true })
    .modulate({ brightness, saturation: 1 + value("saturation") / 100 })
    .linear(contrast, 128 * (1 - contrast));
  if (temperature !== 0) {
    pipeline.tint(temperature > 0 ? { r: 255, g: 250, b: 245 } : { r: 245, g: 250, b: 255 });
  }
  if (value("noiseReduction") > 0) pipeline.blur(Math.min(1.2, value("noiseReduction") / 12));
  if (detail > 0) pipeline.sharpen({ sigma: Math.min(1.2, 0.3 + detail / 30) });
  const result = await pipeline.jpeg({ quality: 92, progressive: true }).toBuffer({ resolveWithObject: true });
  return { bytes: result.data, width: result.info.width, height: result.info.height };
}

export async function getPatientPhotoFile(
  lead: Lead,
  photoId: string,
  rendition: "original" | "adjusted",
): Promise<{ objectPath: string; mimeType: string } | null> {
  const located = await findOwnedPhoto(lead, photoId);
  if (!located || located.photo.status !== "confirmed") return null;
  const objectPath = rendition === "original"
    ? located.photo.originalObjectPath
    : located.photo.derivativeObjectPath;
  if (!objectPath) return null;
  return {
    objectPath,
    mimeType: rendition === "original"
      ? located.photo.originalMimeType
      : String((located.photo.editParams as Record<string, unknown> | null)?.derivative
        && typeof (located.photo.editParams as Record<string, unknown>).derivative === "object"
        ? ((located.photo.editParams as Record<string, unknown>).derivative as Record<string, unknown>).mimeType ?? "image/jpeg"
        : "image/jpeg"),
  };
}

export async function discardClinicalPhoto(lead: Lead, photoId: string): Promise<boolean> {
  const located = await findOwnedPhoto(lead, photoId);
  if (!located || located.photo.status !== "draft") return false;
  await privatePhotoStorage.remove(located.photo.derivativeObjectPath ?? located.photo.originalObjectPath);
  if (located.photo.derivativeObjectPath) await privatePhotoStorage.remove(located.photo.originalObjectPath);
  const [photo] = await db.update(clinicalPhotosTable)
    .set({ status: "discarded", discardedAt: new Date(), derivativeObjectPath: null })
    .where(eq(clinicalPhotosTable.id, photoId))
    .returning();
  await writeAuditEvent(photo, "discarded", "patient", lead.id, {});
  return true;
}

/** Patient restart/discard is a privacy operation: remove every capture object
 * and its database/audit references, including already confirmed drafts. */
export async function discardAllPatientCapturePhotos(lead: Lead): Promise<void> {
  const evaluation = await ensureEvaluationForLead(lead);
  const photos = await db.select().from(clinicalPhotosTable)
    .where(eq(clinicalPhotosTable.evaluationId, evaluation.id));
  for (const photo of photos) {
    await privatePhotoStorage.remove(photo.derivativeObjectPath ?? photo.originalObjectPath);
    if (photo.derivativeObjectPath) await privatePhotoStorage.remove(photo.originalObjectPath);
  }
  const ids = photos.map((photo) => photo.id);
  await db.transaction(async (tx) => {
    if (ids.length) {
      await tx.delete(photoAuditEventsTable).where(inArray(photoAuditEventsTable.photoId, ids));
      await tx.delete(clinicalPhotosTable).where(inArray(clinicalPhotosTable.id, ids));
    }
    // Clear the historical JSON payload in the same operation. The status
    // endpoint lazily migrates that payload, so it must not survive restart.
    await tx.update(leadsTable)
      .set({ photos: [], photoCount: "0", status: "incompleto", updatedAt: new Date() })
      .where(eq(leadsTable.id, lead.id));
  });
}

export async function getPhotoForStaff(lead: Lead, photoId: string) {
  const located = await findOwnedPhoto(lead, photoId);
  if (!located || ["discarded", "quarantined"].includes(located.photo.status)) return null;
  return located.photo;
}

export async function deleteClinicalDataForLead(lead: Lead): Promise<void> {
  const [evaluation] = await db.select().from(evaluationsTable)
    .where(eq(evaluationsTable.leadId, lead.id));
  if (!evaluation) return;
  const photos = await db.select().from(clinicalPhotosTable)
    .where(eq(clinicalPhotosTable.evaluationId, evaluation.id));
  for (const photo of photos) {
    await privatePhotoStorage.remove(photo.originalObjectPath);
    if (photo.derivativeObjectPath) await privatePhotoStorage.remove(photo.derivativeObjectPath);
  }
  await db.transaction(async (tx) => {
    if (photos.length) {
      await tx.delete(photoAuditEventsTable)
        .where(inArray(photoAuditEventsTable.photoId, photos.map((photo) => photo.id)));
    }
    await tx.delete(clinicalPhotosTable).where(eq(clinicalPhotosTable.evaluationId, evaluation.id));
    await tx.delete(evaluationsTable).where(eq(evaluationsTable.id, evaluation.id));
  });
}

async function findOwnedPhoto(lead: Lead, photoId: string) {
  const evaluation = await ensureEvaluationForLead(lead);
  const [photo] = await db.select().from(clinicalPhotosTable)
    .where(and(eq(clinicalPhotosTable.id, photoId), eq(clinicalPhotosTable.evaluationId, evaluation.id)));
  if (!photo) return null;
  const [view] = await db.select().from(protocolViewsTable).where(eq(protocolViewsTable.id, photo.viewId));
  return view ? { photo, view } : null;
}

async function writeAuditEvent(
  photo: ClinicalPhoto,
  action: string,
  actorType: "patient" | "staff" | "system",
  actorId: string | null,
  details: Record<string, unknown>,
): Promise<void> {
  await db.insert(photoAuditEventsTable).values({
    id: uid(18),
    photoId: photo.id,
    evaluationId: photo.evaluationId,
    action,
    actorType,
    actorId,
    details,
  });
}
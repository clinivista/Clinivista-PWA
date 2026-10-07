import crypto from "crypto";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db, clinicalPhotosTable, protocolPhasesTable, protocolViewsTable } from "@workspace/db";
import { defaultProtocolIdForCenter, ensureClinicalConfiguration } from "./clinical-photos";

export const MAX_PHASES = 12;
export const MAX_VIEWS_PER_PHASE = 12;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 60;

export type PhaseInput = { id?: string; name: string; views: Array<{ id?: string; label: string }> };

export type ProtocolPhaseDto = {
  id: string;
  key: string;
  name: string;
  position: number;
  /** The first phase is the patient's own pre-evaluación; the rest are captured by staff. */
  patientCaptured: boolean;
  /** "diagnosis": the doctor marks up the patient's photos; it has no photo list of its own. */
  kind: "capture" | "diagnosis";
  views: Array<{ id: string; key: string; label: string; position: number; hasPhotos: boolean }>;
};

export class ProtocolConfigError extends Error {}

/** Loads (creating the starting six phases on first use) the clinic's protocol structure. */
export async function getProtocolStructure(centerId: string): Promise<{ protocolId: string; phases: ProtocolPhaseDto[] }> {
  const protocolId = defaultProtocolIdForCenter(centerId);
  await ensureClinicalConfiguration(centerId, protocolId);

  const phases = await db.select().from(protocolPhasesTable)
    .where(and(eq(protocolPhasesTable.protocolId, protocolId), eq(protocolPhasesTable.active, true)))
    .orderBy(asc(protocolPhasesTable.position));
  const views = await db.select().from(protocolViewsTable)
    .where(and(eq(protocolViewsTable.protocolId, protocolId), eq(protocolViewsTable.active, true)));
  const withPhotos = await viewIdsWithPhotos(views.map((view) => view.id));

  return {
    protocolId,
    phases: phases.map((phase, index) => ({
      id: phase.id,
      key: phase.key,
      name: phase.name,
      position: index,
      patientCaptured: index === 0,
      kind: phase.kind === "diagnosis" && index > 0 ? "diagnosis" : "capture",
      views: views
        .filter((view) => view.phaseId === phase.id || (index === 0 && view.phaseId === null))
        .sort((a, b) => a.position - b.position)
        .map((view, position) => ({ id: view.id, key: view.key, label: view.label, position, hasPhotos: withPhotos.has(view.id) })),
    })),
  };
}

async function viewIdsWithPhotos(viewIds: string[]): Promise<Set<string>> {
  if (!viewIds.length) return new Set();
  const rows = await db.select({ viewId: clinicalPhotosTable.viewId }).from(clinicalPhotosTable)
    .where(and(inArray(clinicalPhotosTable.viewId, viewIds), ne(clinicalPhotosTable.status, "discarded")));
  return new Set(rows.map((row) => row.viewId));
}

const shortId = () => crypto.randomBytes(4).toString("hex");
const normalize = (text: string) => text.trim().replace(/\s+/g, " ");

/**
 * Replaces the clinic's phase structure with `input` (the legal
 * representative's edit). Items are matched by id: renamed and reordered in
 * place; new ones created; omitted ones deleted only when they hold no
 * photos — otherwise they are hidden (active = false), never erased.
 */
export async function replaceProtocolStructure(centerId: string, input: PhaseInput[]): Promise<void> {
  const current = await getProtocolStructure(centerId);
  const { protocolId } = current;

  if (input.length < 1 || input.length > MAX_PHASES) {
    throw new ProtocolConfigError(`Debe haber entre 1 y ${MAX_PHASES} fases.`);
  }
  const currentKind = new Map(current.phases.map((phase) => [phase.id, phase.kind]));
  const isDiagnosis = (phase: PhaseInput) => Boolean(phase.id && currentKind.get(phase.id) === "diagnosis");
  const phaseNames = new Set<string>();
  for (const phase of input) {
    const name = normalize(phase.name);
    if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
      throw new ProtocolConfigError(`El nombre de cada fase debe tener entre ${MIN_NAME_LENGTH} y ${MAX_NAME_LENGTH} caracteres.`);
    }
    if (phaseNames.has(name.toLowerCase())) throw new ProtocolConfigError(`Hay dos fases llamadas “${name}”.`);
    phaseNames.add(name.toLowerCase());
    if (isDiagnosis(phase)) continue; // its photos are the patient's; nothing to configure
    if (phase.views.length < 1 || phase.views.length > MAX_VIEWS_PER_PHASE) {
      throw new ProtocolConfigError(`Cada fase necesita entre 1 y ${MAX_VIEWS_PER_PHASE} fotografías (“${name}”).`);
    }
    const labels = new Set<string>();
    for (const view of phase.views) {
      const label = normalize(view.label);
      if (label.length < MIN_NAME_LENGTH || label.length > MAX_NAME_LENGTH) {
        throw new ProtocolConfigError(`El nombre de cada fotografía debe tener entre ${MIN_NAME_LENGTH} y ${MAX_NAME_LENGTH} caracteres (“${name}”).`);
      }
      if (labels.has(label.toLowerCase())) throw new ProtocolConfigError(`En “${name}” hay dos fotografías llamadas “${label}”.`);
      labels.add(label.toLowerCase());
    }
  }

  const currentById = new Map(current.phases.map((phase) => [phase.id, phase]));
  // The first phase is the patient's pre-evaluación: it stays first.
  if (current.phases.length > 0 && input[0].id !== current.phases[0].id) {
    throw new ProtocolConfigError("La primera fase es la pre-evaluación del paciente y no se puede mover ni reemplazar.");
  }
  for (const phase of input) {
    if (phase.id && !currentById.has(phase.id)) throw new ProtocolConfigError("Una fase no existe en esta clínica.");
    const known = phase.id ? new Set(currentById.get(phase.id)!.views.map((view) => view.id)) : new Set<string>();
    for (const view of phase.views) {
      if (view.id && !known.has(view.id)) throw new ProtocolConfigError("Una fotografía no pertenece a esa fase.");
    }
  }
  const seenPhaseIds = input.flatMap((phase) => (phase.id ? [phase.id] : []));
  if (new Set(seenPhaseIds).size !== seenPhaseIds.length) throw new ProtocolConfigError("Una fase está repetida.");
  for (const phase of current.phases) {
    if (phase.kind === "diagnosis" && !seenPhaseIds.includes(phase.id)) {
      throw new ProtocolConfigError(`La fase “${phase.name}” es el diagnóstico del médico y no se puede eliminar.`);
    }
  }

  await db.transaction(async (tx) => {
    const keptViewIds = new Set<string>();
    for (const [phaseIndex, phase] of input.entries()) {
      const name = normalize(phase.name);
      let phaseId = phase.id;
      if (phaseId) {
        await tx.update(protocolPhasesTable).set({ name, position: phaseIndex }).where(eq(protocolPhasesTable.id, phaseId));
      } else {
        const key = `fase-${shortId()}`;
        phaseId = `${protocolId}-phase-${key}`;
        await tx.insert(protocolPhasesTable).values({ id: phaseId, protocolId, key, name, position: phaseIndex });
      }
      if (isDiagnosis(phase)) continue;
      for (const [viewIndex, view] of phase.views.entries()) {
        const label = normalize(view.label);
        if (view.id) {
          keptViewIds.add(view.id);
          await tx.update(protocolViewsTable).set({ label, position: viewIndex }).where(eq(protocolViewsTable.id, view.id));
        } else {
          const key = `${phaseIndex === 0 ? "vista" : phaseId.split("-phase-")[1]}-${shortId()}`;
          await tx.insert(protocolViewsTable).values({
            id: `${protocolId}-${key}`,
            protocolId,
            phaseId,
            key,
            label,
            position: viewIndex,
            requirements: { required: true },
          });
        }
      }
    }

    // Omitted views / phases: delete if empty, hide if they hold photos.
    const dropViews = current.phases.flatMap((phase) => phase.views).filter((view) => !keptViewIds.has(view.id));
    const emptyViews = dropViews.filter((view) => !view.hasPhotos).map((view) => view.id);
    const photoViews = dropViews.filter((view) => view.hasPhotos).map((view) => view.id);
    if (emptyViews.length) await tx.delete(protocolViewsTable).where(inArray(protocolViewsTable.id, emptyViews));
    if (photoViews.length) await tx.update(protocolViewsTable).set({ active: false }).where(inArray(protocolViewsTable.id, photoViews));

    const dropPhases = current.phases.filter((phase) => !seenPhaseIds.includes(phase.id));
    for (const phase of dropPhases) {
      const hasPhotos = phase.views.some((view) => view.hasPhotos);
      if (hasPhotos) {
        await tx.update(protocolPhasesTable).set({ active: false }).where(eq(protocolPhasesTable.id, phase.id));
      } else {
        await tx.delete(protocolPhasesTable).where(eq(protocolPhasesTable.id, phase.id));
      }
    }
  });
}

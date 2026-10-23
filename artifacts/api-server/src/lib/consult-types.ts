import crypto from "crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, centersTable, leadsTable, protocolPhasesTable, protocolViewsTable, protocolsTable } from "@workspace/db";
import { defaultProtocolIdForCenter, ensureClinicalConfiguration } from "./clinical-photos";
import { ProtocolConfigError, MAX_NAME_LENGTH, MIN_NAME_LENGTH } from "./protocol-config";
import { PROTOCOL_VIEWS, DEFAULT_PHASES } from "./specialties/dermatologia";

/**
 * Tipos de consulta de dermatología. Cada tipo es un proceso propio del centro
 * (sus etapas y sus fotos), con la misma estructura que el proceso base: el
 * representante legal parte de una plantilla y la edita desde «Fases».
 * Solo los centros de dermatología tienen varios tipos.
 */
export const CONSULT_SPECIALTY = "dermatologia";
export const MAX_CONSULT_TYPES = 12;
/** Cómo se llama, entre los tipos de consulta, el proceso base de un centro de dermatología. */
export const BASE_TYPE_NAME = "Consulta general";

type TemplateView = { key: string; label: string; required: boolean };
type TemplatePhase = { key: string; name: string; kind?: "diagnosis"; views: TemplateView[] };
export type ConsultTemplate = { key: string; name: string; phases: TemplatePhase[] };

const closeUp = { key: "dermClose", label: "Primer plano con referencia", required: true };
const overview = { key: "dermOverview", label: "Vista panorámica", required: true };
const dermoscopy = { key: "dermDermoscopy", label: "Dermatoscopía", required: false };

export const CONSULT_TEMPLATES: ReadonlyArray<ConsultTemplate> = [
  {
    key: "lesiones",
    name: "Lesión o lunares",
    phases: [
      { key: "preevaluacion", name: "Pre-evaluación", views: [overview, closeUp, dermoscopy] },
      { key: "diagnostico", name: "Diagnóstico", kind: "diagnosis", views: [] },
      { key: "control-1", name: "Control 1", views: [closeUp, dermoscopy] },
      { key: "control-2", name: "Control 2", views: [closeUp, dermoscopy] },
    ],
  },
  {
    key: "acne",
    name: "Acné",
    phases: [
      { key: "preevaluacion", name: "Pre-evaluación", views: [
        { key: "front", label: "Frente", required: true },
        { key: "right", label: "Perfil derecho", required: true },
        { key: "left", label: "Perfil izquierdo", required: true },
      ] },
      { key: "diagnostico", name: "Diagnóstico", kind: "diagnosis", views: [] },
      { key: "tratamiento", name: "Tratamiento", views: [
        { key: "front", label: "Frente", required: true },
        { key: "right", label: "Perfil derecho", required: true },
        { key: "left", label: "Perfil izquierdo", required: true },
      ] },
      { key: "control-1", name: "Control 1", views: [
        { key: "front", label: "Frente", required: true },
        { key: "right", label: "Perfil derecho", required: true },
        { key: "left", label: "Perfil izquierdo", required: true },
      ] },
    ],
  },
  {
    key: "manchas",
    name: "Manchas",
    phases: [
      { key: "preevaluacion", name: "Pre-evaluación", views: [overview, closeUp] },
      { key: "diagnostico", name: "Diagnóstico", kind: "diagnosis", views: [] },
      { key: "tratamiento", name: "Tratamiento", views: [overview, closeUp] },
      { key: "control-1", name: "Control 1", views: [overview, closeUp] },
      { key: "control-2", name: "Control 2", views: [overview, closeUp] },
    ],
  },
  {
    key: "biopsia",
    name: "Biopsia",
    phases: [
      { key: "preevaluacion", name: "Pre-evaluación", views: [overview, closeUp, dermoscopy] },
      { key: "diagnostico", name: "Diagnóstico", kind: "diagnosis", views: [] },
      { key: "toma-de-muestra", name: "Toma de muestra", views: [
        { key: "site", label: "Sitio marcado antes de la toma", required: true },
        { key: "sample", label: "Muestra extraída", required: false },
        { key: "closed", label: "Herida cerrada", required: true },
      ] },
      { key: "control", name: "Control de cicatrización", views: [closeUp, { key: "scar", label: "Cicatriz", required: true }] },
    ],
  },
];

export type ConsultType = {
  id: string;
  name: string;
  /** El proceso base de la clínica: siempre existe y no se puede desactivar. */
  isBase: boolean;
  active: boolean;
  templateKey: string;
  patientCount: number;
};

export type ConsultTypesInfo = {
  /** Solo los centros de dermatología tienen varios tipos de consulta. */
  enabled: boolean;
  types: ConsultType[];
  /** Plantillas que el centro todavía no activó. */
  templates: Array<{ key: string; name: string }>;
};

const shortId = () => crypto.randomBytes(4).toString("hex");
const normalize = (text: string) => text.trim().replace(/\s+/g, " ");

async function centerSpecialty(centerId: string): Promise<string> {
  const [center] = await db.select({ specialty: centersTable.specialty }).from(centersTable).where(eq(centersTable.id, centerId));
  return center?.specialty ?? "";
}

export async function listConsultTypes(centerId: string): Promise<ConsultTypesInfo> {
  const baseId = defaultProtocolIdForCenter(centerId);
  await ensureClinicalConfiguration(centerId, baseId);
  const enabled = (await centerSpecialty(centerId)) === CONSULT_SPECIALTY;
  const rows = await db.select().from(protocolsTable).where(eq(protocolsTable.centerId, centerId)).orderBy(asc(protocolsTable.createdAt));
  const counts = await db.select({ protocolId: leadsTable.protocolId, total: sql<number>`count(*)::int` })
    .from(leadsTable).where(eq(leadsTable.centerId, centerId)).groupBy(leadsTable.protocolId);
  const countOf = new Map(counts.map((row) => [row.protocolId ?? "", row.total]));
  const base = rows.find((row) => row.id === baseId);
  const extras = enabled ? rows.filter((row) => row.id !== baseId && row.specialty === CONSULT_SPECIALTY) : [];
  const types: ConsultType[] = [
    ...(base ? [{ id: base.id, name: enabled ? BASE_TYPE_NAME : base.name, isBase: true, active: true, templateKey: "", patientCount: countOf.get(base.id) ?? 0 }] : []),
    ...extras.map((row) => ({ id: row.id, name: row.name, isBase: false, active: row.active, templateKey: row.templateKey, patientCount: countOf.get(row.id) ?? 0 })),
  ];
  const used = new Set(extras.map((row) => row.templateKey));
  return {
    enabled,
    types,
    templates: enabled ? CONSULT_TEMPLATES.filter((template) => !used.has(template.key)).map(({ key, name }) => ({ key, name })) : [],
  };
}

function checkName(name: string): string {
  const clean = normalize(name);
  if (clean.length < MIN_NAME_LENGTH || clean.length > MAX_NAME_LENGTH) {
    throw new ProtocolConfigError(`El nombre del tipo de consulta debe tener entre ${MIN_NAME_LENGTH} y ${MAX_NAME_LENGTH} caracteres.`);
  }
  return clean;
}

async function assertCanAdd(centerId: string, name: string): Promise<void> {
  if ((await centerSpecialty(centerId)) !== CONSULT_SPECIALTY) {
    throw new ProtocolConfigError("Los tipos de consulta solo existen en centros de dermatología.");
  }
  const { types } = await listConsultTypes(centerId);
  if (types.length >= MAX_CONSULT_TYPES) throw new ProtocolConfigError(`Un centro puede tener hasta ${MAX_CONSULT_TYPES} tipos de consulta.`);
  if (types.some((type) => type.name.toLowerCase() === name.toLowerCase())) throw new ProtocolConfigError(`Ya existe un tipo llamado “${name}”.`);
}

async function insertType(centerId: string, key: string, name: string, templateKey: string, phases: TemplatePhase[]): Promise<string> {
  const protocolId = `${centerId}-consulta-${key}`;
  await db.transaction(async (tx) => {
    await tx.insert(protocolsTable).values({ id: protocolId, centerId, name, version: "1", specialty: CONSULT_SPECIALTY, templateKey });
    for (const [phaseIndex, phase] of phases.entries()) {
      const phaseId = `${protocolId}-phase-${phase.key}`;
      await tx.insert(protocolPhasesTable).values({ id: phaseId, protocolId, key: phase.key, name: phase.name, position: phaseIndex, kind: phase.kind ?? "capture" });
      if (phase.kind === "diagnosis") continue;
      for (const [viewIndex, view] of phase.views.entries()) {
        await tx.insert(protocolViewsTable).values({
          id: `${protocolId}-${phase.key}-${view.key}`,
          protocolId,
          phaseId,
          key: phaseIndex === 0 ? view.key : `${phase.key}-${view.key}`,
          label: view.label,
          position: viewIndex,
          requirements: { required: view.required },
        });
      }
    }
  });
  return protocolId;
}

/** Activa una plantilla para el centro (una sola vez por plantilla). */
export async function enableTemplate(centerId: string, templateKey: string): Promise<string> {
  const template = CONSULT_TEMPLATES.find((candidate) => candidate.key === templateKey);
  if (!template) throw new ProtocolConfigError("Esa plantilla no existe.");
  await assertCanAdd(centerId, template.name);
  const [already] = await db.select({ id: protocolsTable.id }).from(protocolsTable)
    .where(and(eq(protocolsTable.centerId, centerId), eq(protocolsTable.templateKey, templateKey)));
  if (already) throw new ProtocolConfigError("Esa plantilla ya está activada en tu clínica.");
  return insertType(centerId, template.key, template.name, template.key, template.phases);
}

/** Crea un tipo propio con las etapas y fotos del proceso inicial de dermatología. */
export async function createCustomType(centerId: string, rawName: string): Promise<string> {
  const name = checkName(rawName);
  await assertCanAdd(centerId, name);
  const phases: TemplatePhase[] = DEFAULT_PHASES.map((phase) => ({
    key: phase.key,
    name: phase.name,
    ...(phase.kind ? { kind: phase.kind } : {}),
    views: phase.kind === "diagnosis" ? [] : (PROTOCOL_VIEWS as ReadonlyArray<TemplateView>).map((view) => ({ ...view })),
  }));
  return insertType(centerId, `propio-${shortId()}`, name, "custom", phases);
}

export async function updateType(centerId: string, typeId: string, change: { name?: string; active?: boolean }): Promise<void> {
  const [row] = await db.select().from(protocolsTable).where(and(eq(protocolsTable.id, typeId), eq(protocolsTable.centerId, centerId)));
  if (!row || row.id === defaultProtocolIdForCenter(centerId) || row.specialty !== CONSULT_SPECIALTY) {
    throw new ProtocolConfigError("Ese tipo de consulta no se puede modificar.");
  }
  const set: Partial<typeof protocolsTable.$inferInsert> = {};
  if (change.name !== undefined) {
    const name = checkName(change.name);
    const { types } = await listConsultTypes(centerId);
    if (types.some((type) => type.id !== typeId && type.name.toLowerCase() === name.toLowerCase())) throw new ProtocolConfigError(`Ya existe un tipo llamado “${name}”.`);
    set.name = name;
  }
  if (change.active !== undefined) set.active = change.active;
  if (Object.keys(set).length) await db.update(protocolsTable).set(set).where(eq(protocolsTable.id, typeId));
}

/** Tipos que el personal puede elegir al agregar una consulta (el base y los activos). */
export async function selectableTypeIds(centerId: string): Promise<string[]> {
  const { types } = await listConsultTypes(centerId);
  return types.filter((type) => type.isBase || type.active).map((type) => type.id);
}

export async function typeNames(centerId: string): Promise<Map<string, string>> {
  const { types } = await listConsultTypes(centerId);
  return new Map(types.map((type) => [type.id, type.name]));
}


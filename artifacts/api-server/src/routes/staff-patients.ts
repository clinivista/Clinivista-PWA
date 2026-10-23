import { Router, type IRouter } from "express";
import { and, eq, or } from "drizzle-orm";
import { db, leadsTable, usersTable, centersTable, type SkippedPhase, type PhaseAttention } from "@workspace/db";
import { requireStaffAuth, type StaffAuthContext } from "./auth";
import { uid, clean } from "../lib/helpers";
import { validateRut } from "../lib/rut";
import {
  DEFAULT_CENTER_ID,
  defaultProtocolIdForCenter,
  ensureClinicalConfiguration,
  getLeadPhases,
} from "../lib/clinical-photos";
import { syncLeadStatus } from "../lib/lead-status";
import { isCenterActive } from "../lib/centers";
import { ensurePatientAccountForLead } from "../lib/patient-accounts";
import { selectableTypeIds, listConsultTypes, CONSULT_SPECIALTY } from "../lib/consult-types";
import { baseUrl } from "./results";
import { EMAIL_REGEX, buildLead, specialtyAnswers } from "./patients";

const router: IRouter = Router();
const ID = /^[\w.-]{1,200}$/;
export const MIN_REASON = 3;
export const MAX_REASON = 300;

async function ownLead(centerId: string, id: string) {
  if (!ID.test(id)) return undefined;
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  return lead && (lead.centerId ?? DEFAULT_CENTER_ID) === centerId ? lead : undefined;
}

async function staffName(userId: string): Promise<string> {
  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  return user ? (user.name || user.email) : "";
}

function requireDoctor(staff: StaffAuthContext): boolean {
  return staff.role === "medico";
}

// El personal (médico o administrativo) registra a un paciente desde el panel.
// El consentimiento lo da el paciente en persona o por escrito; el personal deja
// constancia (quién y cuándo) y no se puede guardar sin ella.
router.post("/leads", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!(await isCenterActive(staff.centerId))) {
    res.status(403).json({ error: "Esta clínica no está aceptando nuevos pacientes en este momento." });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (body.consentConfirmed !== true) {
    res.status(422).json({ error: "Confirma que el paciente dio su consentimiento para guardar su ficha." });
    return;
  }
  const rutCheck = validateRut(String(body.documentId ?? ""));
  if (!rutCheck.valid) {
    res.status(400).json({ error: rutCheck.error });
    return;
  }
  const data = buildLead(
    { ...body, consent: true, marketingConsent: false, deliveryChannel: body.deliveryChannel ?? (body.email ? "email" : "") },
    {},
    await specialtyAnswers(staff.centerId, body),
  );
  if (!data.name || !data.phone) {
    res.status(422).json({ error: "Completa el nombre y el teléfono del paciente." });
    return;
  }
  if (data.email && !EMAIL_REGEX.test(data.email)) {
    res.status(422).json({ error: "Ingresa un correo electrónico válido." });
    return;
  }
  if (data.deliveryChannel === "email" && !data.email) {
    res.status(422).json({ error: "Para enviar los resultados por correo, ingresa el correo del paciente." });
    return;
  }
  const [rutDuplicate] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(eq(leadsTable.documentNormalized, data.documentNormalized), eq(leadsTable.centerId, staff.centerId)))
    .limit(1);
  if (rutDuplicate) {
    res.status(409).json({ error: "Ya existe un paciente con este RUT en tu clínica.", duplicate: true, leadId: rutDuplicate.id });
    return;
  }
  const contactConditions = [eq(leadsTable.phone, data.phone)];
  if (data.email) contactConditions.push(eq(leadsTable.email, data.email));
  const [duplicate] = await db.select({ id: leadsTable.id }).from(leadsTable)
    .where(and(or(...contactConditions), eq(leadsTable.centerId, staff.centerId)))
    .limit(1);
  if (duplicate) {
    res.status(409).json({ error: "Ya existe un paciente con este teléfono o correo en tu clínica.", duplicate: true, leadId: duplicate.id });
    return;
  }

  let protocolId = defaultProtocolIdForCenter(staff.centerId);
  await ensureClinicalConfiguration(staff.centerId, protocolId);
  if (typeof body.consultTypeId === "string" && body.consultTypeId && body.consultTypeId !== protocolId) {
    if (!(await selectableTypeIds(staff.centerId)).includes(body.consultTypeId)) {
      res.status(422).json({ error: "Elige un tipo de consulta válido." });
      return;
    }
    protocolId = body.consultTypeId;
  }
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
    centerId: staff.centerId,
    protocolId,
    ...data,
    consentRecordedBy: await staffName(staff.userId) || staff.userId,
    consentRecordedAt: new Date(),
  };
  await db.insert(leadsTable).values(newLead);
  const [inserted] = await db.select().from(leadsTable).where(eq(leadsTable.id, newLead.id));
  // Acceso al portal del paciente por correo, solo si el personal lo pide.
  if (body.sendPortalAccess === true && inserted.email) void ensurePatientAccountForLead(inserted, baseUrl(req));
  res.status(201).json({ ok: true, lead: { id: inserted.id, token: inserted.token, name: inserted.name, status: inserted.status } });
});

// ── Consultas adicionales (dermatología) ──────────────────────────────────
// Un paciente puede tener varias consultas de tipos distintos en la misma
// ficha. Cada consulta adicional es un caso propio (con sus fotos, etapas,
// diagnóstico y alta) que apunta a la ficha principal y copia sus datos
// personales; no lleva RUT normalizado porque el RUT es único por clínica.

async function mainFileOf(lead: typeof leadsTable.$inferSelect) {
  if (!lead.parentLeadId) return lead;
  const [parent] = await db.select().from(leadsTable).where(eq(leadsTable.id, lead.parentLeadId));
  return parent ?? lead;
}

router.get("/leads/:id/consultations", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  const main = await mainFileOf(lead);
  const extras = await db.select().from(leadsTable).where(and(eq(leadsTable.parentLeadId, main.id), eq(leadsTable.centerId, staff.centerId)));
  const names = new Map((await listConsultTypes(staff.centerId)).types.map((type) => [type.id, type.name]));
  const all = [main, ...extras.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())];
  res.json({
    currentId: lead.id,
    consultations: all.map((item) => ({
      id: item.id,
      typeName: names.get(item.protocolId ?? "") ?? "",
      status: item.status,
      createdAt: item.createdAt,
      isMain: item.id === main.id,
    })),
  });
});

router.post("/leads/:id/consultations", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!(await isCenterActive(staff.centerId))) {
    res.status(403).json({ error: "Esta clínica no está aceptando nuevos pacientes en este momento." });
    return;
  }
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  const [center] = await db.select({ specialty: centersTable.specialty }).from(centersTable).where(eq(centersTable.id, staff.centerId));
  if (center?.specialty !== CONSULT_SPECIALTY) {
    res.status(409).json({ error: "Solo los centros de dermatología tienen varios tipos de consulta." });
    return;
  }
  const body = (req.body ?? {}) as { consultTypeId?: unknown };
  const typeId = typeof body.consultTypeId === "string" ? body.consultTypeId : "";
  if (!typeId || !(await selectableTypeIds(staff.centerId)).includes(typeId)) {
    res.status(422).json({ error: "Elige un tipo de consulta válido." });
    return;
  }
  const main = await mainFileOf(lead);
  await ensureClinicalConfiguration(staff.centerId, typeId);
  const created = {
    id: uid(),
    token: uid(24),
    status: "incompleto",
    notes: "",
    norwood: "",
    appointmentAt: "",
    isDemo: main.isDemo ?? false,
    photos: [],
    photoCount: "0",
    centerId: staff.centerId,
    protocolId: typeId,
    parentLeadId: main.id,
    name: main.name,
    phone: main.phone,
    email: main.email,
    age: main.age,
    city: main.city,
    documentId: main.documentId,
    documentNormalized: "",
    consent: main.consent,
    marketingConsent: main.marketingConsent,
    language: main.language,
    deliveryChannel: main.deliveryChannel,
    patientAccountId: main.patientAccountId,
    clinicalData: await specialtyAnswers(staff.centerId, body as Record<string, unknown>) ?? {},
    consentRecordedBy: main.consentRecordedBy,
    consentRecordedAt: main.consentRecordedAt,
  };
  await db.insert(leadsTable).values(created);
  res.status(201).json({ ok: true, lead: { id: created.id, token: created.token, name: created.name, status: created.status } });
});

// Omitir una etapa: cualquiera del personal, con motivo obligatorio. La etapa
// queda como "Omitida" (quién, cuándo y por qué) y se puede deshacer.
router.put("/leads/:id/phases/:phaseId/skip", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  const reason = clean((req.body as { reason?: unknown } | undefined)?.reason, MAX_REASON);
  if (reason.length < MIN_REASON) {
    res.status(422).json({ error: "Escribe el motivo por el que se omite la etapa." });
    return;
  }
  if (lead.status === "alta" || lead.status === "cerrado") {
    res.status(409).json({ error: "El proceso de este paciente está cerrado." });
    return;
  }
  const phases = await getLeadPhases(lead);
  const phase = phases.find((candidate) => candidate.id === req.params.phaseId);
  if (!phase) {
    res.status(404).json({ error: "Etapa no encontrada." });
    return;
  }
  if (phase.complete) {
    res.status(409).json({ error: "Esta etapa ya está completa." });
    return;
  }
  if (!phase.enabled) {
    res.status(409).json({ error: "Solo se puede omitir la etapa que está abierta." });
    return;
  }
  const current: SkippedPhase[] = Array.isArray(lead.skippedPhases) ? lead.skippedPhases as SkippedPhase[] : [];
  const entry: SkippedPhase = {
    phaseId: phase.id,
    reason,
    byUserId: staff.userId,
    byName: (await staffName(staff.userId)) || staff.userId,
    at: new Date().toISOString(),
  };
  await db.update(leadsTable)
    .set({ skippedPhases: [...current.filter((skip) => skip.phaseId !== phase.id), entry], updatedAt: new Date() })
    .where(eq(leadsTable.id, lead.id));
  await syncLeadStatus(lead.id);
  res.json({ ok: true });
});

router.delete("/leads/:id/phases/:phaseId/skip", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  if (lead.status === "alta" || lead.status === "cerrado") {
    res.status(409).json({ error: "El proceso de este paciente está cerrado." });
    return;
  }
  const current: SkippedPhase[] = Array.isArray(lead.skippedPhases) ? lead.skippedPhases as SkippedPhase[] : [];
  if (!current.some((skip) => skip.phaseId === req.params.phaseId)) {
    res.status(404).json({ error: "Esa etapa no estaba omitida." });
    return;
  }
  await db.update(leadsTable)
    .set({ skippedPhases: current.filter((skip) => skip.phaseId !== req.params.phaseId), updatedAt: new Date() })
    .where(eq(leadsTable.id, lead.id));
  await syncLeadStatus(lead.id);
  res.status(204).end();
});

// Atención de una fase (desde el diagnóstico): el día en que se atendió al
// paciente (obligatorio) y, si la clínica lo usa, el número de esa atención en
// su agenda. Sin la fecha no se cierra el diagnóstico ni se suben fotos de la fase.
const ATTENTION_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AGENDA_ID = 60;
router.put("/leads/:id/phases/:phaseId/attention", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  if (lead.status === "alta" || lead.status === "cerrado") {
    res.status(409).json({ error: "El proceso de este paciente está cerrado." });
    return;
  }
  const body = (req.body ?? {}) as { date?: unknown; agendaId?: unknown };
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const parsed = ATTENTION_DATE.test(date) ? new Date(`${date}T00:00:00.000Z`) : null;
  const tomorrow = Date.now() + 36 * 60 * 60 * 1000;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < "2000-01-01" || parsed.getTime() > tomorrow) {
    res.status(422).json({ error: "Indica una fecha de atención válida (no puede ser futura)." });
    return;
  }
  if (body.agendaId !== undefined && body.agendaId !== null && typeof body.agendaId !== "string") {
    res.status(422).json({ error: "El ID de la atención no es válido." });
    return;
  }
  const agendaId = clean(body.agendaId, MAX_AGENDA_ID + 1);
  if (agendaId.length > MAX_AGENDA_ID) {
    res.status(422).json({ error: `El ID de la atención admite hasta ${MAX_AGENDA_ID} caracteres.` });
    return;
  }
  const phases = await getLeadPhases(lead);
  const phase = phases.find((candidate) => candidate.id === req.params.phaseId);
  if (!phase) {
    res.status(404).json({ error: "Etapa no encontrada." });
    return;
  }
  if (!phase.attentionRequired) {
    res.status(409).json({ error: "Esta etapa no lleva fecha de atención." });
    return;
  }
  if (!phase.enabled) {
    res.status(409).json({ error: "Completa la fase anterior antes de registrar esta." });
    return;
  }
  const current = (lead.phaseAttentions && typeof lead.phaseAttentions === "object" && !Array.isArray(lead.phaseAttentions) ? lead.phaseAttentions : {}) as Record<string, PhaseAttention>;
  const entry: PhaseAttention = {
    date,
    agendaId,
    byUserId: staff.userId,
    byName: (await staffName(staff.userId)) || staff.userId,
    at: new Date().toISOString(),
  };
  await db.update(leadsTable)
    .set({ phaseAttentions: { ...current, [phase.id]: entry }, updatedAt: new Date() })
    .where(eq(leadsTable.id, lead.id));
  res.json({ ok: true, attention: { date: entry.date, agendaId: entry.agendaId, byName: entry.byName, at: entry.at } });
});

// Alta médica: solo un médico, en cualquier etapa posterior al diagnóstico
// (diagnóstico cerrado u omitido). Cierra el proceso con un estado propio.
router.post("/leads/:id/discharge", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!requireDoctor(staff)) {
    res.status(403).json({ error: "Solo un médico puede dar el alta médica." });
    return;
  }
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  if (lead.status === "alta") {
    res.status(409).json({ error: "El paciente ya tiene alta médica." });
    return;
  }
  const phases = await getLeadPhases(lead);
  const diagnosis = phases.find((phase) => phase.kind === "diagnosis");
  if (diagnosis && !diagnosis.complete && !diagnosis.skipped) {
    res.status(409).json({ error: "El alta médica se da después del diagnóstico." });
    return;
  }
  await db.update(leadsTable).set({
    status: "alta",
    dischargedAt: new Date(),
    dischargedByName: (await staffName(staff.userId)) || staff.userId,
    dischargeNote: clean((req.body as { note?: unknown } | undefined)?.note, 500),
    updatedAt: new Date(),
  }).where(eq(leadsTable.id, lead.id));
  res.json({ ok: true, status: "alta" });
});

router.delete("/leads/:id/discharge", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (!requireDoctor(staff)) {
    res.status(403).json({ error: "Solo un médico puede reabrir un alta médica." });
    return;
  }
  const lead = await ownLead(staff.centerId, req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Caso no encontrado." });
    return;
  }
  if (lead.status !== "alta") {
    res.status(409).json({ error: "El paciente no tiene alta médica." });
    return;
  }
  // Vuelve al estado que le corresponde según su proceso.
  await db.update(leadsTable).set({
    status: "listo",
    dischargedAt: null,
    dischargedByName: "",
    dischargeNote: "",
    updatedAt: new Date(),
  }).where(eq(leadsTable.id, lead.id));
  res.json({ ok: true, status: (await syncLeadStatus(lead.id)) ?? "listo" });
});

export default router;

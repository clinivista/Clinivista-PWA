import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const centersTable = pgTable("clinical_centers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  active: boolean("active").notNull().default(true),
  // Fase 6 (facturación, alcance manual): the clinic is considered paid up
  // through this date. A director records it by hand after receiving
  // payment — there is no payment gateway integration yet, and nothing
  // suspends the clinic automatically when it lapses; the director sees it
  // marked "atrasada" and decides.
  paidUntil: timestamp("paid_until", { withTimezone: true }),
  // Identidad visible para los pacientes: su logo, ya normalizado por el
  // servidor (PNG de hasta 256 px) y guardado como data URL. Es chico, no hay
  // que servirlo aparte ni abrir un bucket público.
  logoDataUrl: text("logo_data_url"),
  // La especialidad define el formulario del paciente, el protocolo de fotos y
  // las fases iniciales de la clínica. La fija supra-control al crearla.
  specialty: text("specialty").notNull().default("capilar"),
  // Plan de la clínica (lo fija supra-control). Qué habilita cada uno está en
  // artifacts/api-server/src/lib/plans.ts; hoy solo «titanium» agrega el video.
  // Migración: lib/db/sql/sql0001-plan-de-clinica.sql.
  plan: text("plan").notNull().default("basic"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("clinical_centers_plan_check", sql`${table.plan} in ('basic', 'unlimited', 'titanium')`),
]);

export const protocolsTable = pgTable("clinical_protocols", {
  id: text("id").primaryKey(),
  centerId: text("center_id").notNull().default("default-center"),
  name: text("name").notNull(),
  version: text("version").notNull().default("1"),
  // Fase 5: which specialty module (artifacts/api-server/src/lib/specialties/)
  // governs this protocol's views and clinical intake fields. Every protocol
  // today is "capilar" — the tag is what lets Fase 7 add a second specialty
  // without every protocol query needing to guess.
  specialty: text("specialty").notNull().default("capilar"),
  active: boolean("active").notNull().default(true),
  // Tipo de consulta (dermatología): clave de la plantilla de la que partió,
  // "custom" si lo creó el centro, "" para el proceso base de la clínica.
  templateKey: text("template_key").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("clinical_protocols_center_slug_unique").on(table.centerId, table.id),
]);

// Fases de un protocolo (p. ej. pre-evaluación, diagnóstico, pre-operatorio…).
// Cada clínica define cuántas son, cómo se llaman y qué fotos lleva cada una
// (sus vistas). La primera la hace el paciente desde la URL de la clínica; las
// demás las sube el personal. Una fase con fotos guardadas nunca se borra:
// se desactiva (active = false) y deja de mostrarse.
export const protocolPhasesTable = pgTable("clinical_protocol_phases", {
  id: text("id").primaryKey(),
  protocolId: text("protocol_id").notNull(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  // "capture": se registra con fotografías. "diagnosis": el médico anota las
  // fotos del paciente y escribe la respuesta; no tiene vistas propias.
  kind: text("kind").notNull().default("capture"),
}, (table) => [
  uniqueIndex("clinical_protocol_phases_protocol_key_unique").on(table.protocolId, table.key),
]);

export const protocolViewsTable = pgTable("clinical_protocol_views", {
  id: text("id").primaryKey(),
  protocolId: text("protocol_id").notNull(),
  // null = vista anterior a las fases (se trata como parte de la primera fase).
  phaseId: text("phase_id"),
  key: text("key").notNull(),
  label: text("label").notNull(),
  position: integer("position").notNull().default(0),
  requirements: jsonb("requirements").notNull().default({}),
  active: boolean("active").notNull().default(true),
}, (table) => [
  uniqueIndex("clinical_protocol_views_protocol_key_unique").on(table.protocolId, table.key),
]);

export const evaluationsTable = pgTable("clinical_evaluations", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull().unique(),
  centerId: text("center_id").notNull().default("default-center"),
  protocolId: text("protocol_id").notNull().default("capillary-initial"),
  status: text("status").notNull().default("draft"),
  // Fase 5: a specialty-tagged, structured snapshot of this evaluation's
  // clinical intake data (e.g. for "capilar": norwood, pattern, ...). Mirrors
  // the equivalent `leads` columns for now — see specialties/capilar.ts —
  // so generic tooling can read clinical data the same way regardless of
  // specialty, without every future specialty needing its own `leads`
  // columns.
  clinicalData: jsonb("clinical_data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clinicalPhotosTable = pgTable("clinical_photos", {
  id: text("id").primaryKey(),
  evaluationId: text("evaluation_id").notNull(),
  viewId: text("view_id").notNull(),
  status: text("status").notNull().default("draft"),
  originalObjectPath: text("original_object_path").notNull(),
  derivativeObjectPath: text("derivative_object_path"),
  originalMimeType: text("original_mime_type").notNull(),
  originalBytes: integer("original_bytes").notNull(),
  originalSha256: text("original_sha256").notNull(),
  width: integer("width"),
  height: integer("height"),
  source: text("source").notNull().default("upload"),
  captureMetadata: jsonb("capture_metadata").notNull().default({}),
  editParams: jsonb("edit_params"),
  // Optional free-text description the patient adds to this photo.
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  discardedAt: timestamp("discarded_at", { withTimezone: true }),
});

export const photoAuditEventsTable = pgTable("clinical_photo_audit_events", {
  id: text("id").primaryKey(),
  photoId: text("photo_id").notNull(),
  evaluationId: text("evaluation_id").notNull(),
  action: text("action").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCenterSchema = createInsertSchema(centersTable).omit({ createdAt: true });
export const insertProtocolSchema = createInsertSchema(protocolsTable).omit({ createdAt: true });
export const insertProtocolViewSchema = createInsertSchema(protocolViewsTable);
export const insertEvaluationSchema = createInsertSchema(evaluationsTable).omit({ createdAt: true, updatedAt: true });
export const insertClinicalPhotoSchema = createInsertSchema(clinicalPhotosTable).omit({ createdAt: true });
export const insertPhotoAuditEventSchema = createInsertSchema(photoAuditEventsTable).omit({ createdAt: true });

export type Center = typeof centersTable.$inferSelect;
export type Protocol = typeof protocolsTable.$inferSelect;
export type ProtocolView = typeof protocolViewsTable.$inferSelect;
export type Evaluation = typeof evaluationsTable.$inferSelect;
export type ClinicalPhoto = typeof clinicalPhotosTable.$inferSelect;
export type PhotoAuditEvent = typeof photoAuditEventsTable.$inferSelect;
export type InsertClinicalPhoto = z.infer<typeof insertClinicalPhotoSchema>;
// Diagnóstico de una evaluación: la respuesta del médico (texto libre) y su
// estado. "closed" lo deja en solo lectura; reabrirlo queda en el registro de eventos.
export const diagnosesTable = pgTable("clinical_diagnoses", {
  id: text("id").primaryKey(),
  evaluationId: text("evaluation_id").notNull().unique(),
  responseText: text("response_text").notNull().default(""),
  status: text("status").notNull().default("draft"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedByUserId: text("closed_by_user_id"),
  closedByName: text("closed_by_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const diagnosisEventsTable = pgTable("clinical_diagnosis_events", {
  id: text("id").primaryKey(),
  diagnosisId: text("diagnosis_id").notNull(),
  action: text("action").notNull(),
  actorUserId: text("actor_user_id"),
  actorName: text("actor_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Dibujo del médico sobre la foto de un paciente: los trazos en vectores
// (para poder seguir editando) y la imagen ya compuesta. La foto original
// nunca se modifica.
export const photoAnnotationsTable = pgTable("clinical_photo_annotations", {
  id: text("id").primaryKey(),
  photoId: text("photo_id").notNull().unique(),
  objectPath: text("object_path").notNull(),
  mimeType: text("mime_type").notNull(),
  strokes: jsonb("strokes").notNull().default([]),
  updatedByUserId: text("updated_by_user_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Cada entrega de resultados al paciente: una copia congelada del PDF (para que
// el enlace siempre muestre lo que se envió) y el registro de quién lo envió.
export const resultDeliveriesTable = pgTable("clinical_result_deliveries", {
  id: text("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  // Enlace secreto de alta entropía con el que el paciente descarga el PDF.
  token: text("token").notNull().unique(),
  objectPath: text("object_path").notNull(),
  channel: text("channel").notNull(), // email | whatsapp
  recipient: text("recipient").notNull().default(""),
  status: text("status").notNull(), // sent | link | failed
  error: text("error"),
  createdByUserId: text("created_by_user_id"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// Cuenta del paciente (correo + clave) para ver sus resultados. Una por correo,
// compartida entre clínicas. El enlace para crear o recuperar la clave se guarda
// solo como hash y vence.
export const patientAccountsTable = pgTable("patient_accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  emailNormalized: text("email_normalized").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull().default(""),
  // true once the email was proven (signed in with Google).
  emailVerified: boolean("email_verified").notNull().default(false),
  tokenHash: text("token_hash"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Informe periódico de pacientes pendientes de diagnóstico: a quién se envía y
// cada cuánto (hora de Chile). Una fila por clínica; la configura su
// representante legal. `lastSentAt` evita enviar dos veces el mismo período.
export const reportSettingsTable = pgTable("clinic_report_settings", {
  centerId: text("center_id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  recipients: text("recipients").notNull().default(""),
  // "daily" | "weekly" | "monthly" (el día 1).
  frequency: text("frequency").notNull().default("weekly"),
  // 0 = domingo … 6 = sábado (solo para "weekly").
  weekday: integer("weekday").notNull().default(1),
  hour: integer("hour").notNull().default(8),
  skipWhenEmpty: boolean("skip_when_empty").notNull().default(true),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReportSettings = typeof reportSettingsTable.$inferSelect;

// Transcripción (OCR) de una foto marcada como documento (p. ej. la ficha
// técnica manuscrita). Una por foto; el texto es editable por el personal y
// guarda quién lo generó y quién lo corrigió. Solo la ve el personal.
export const photoTranscriptionsTable = pgTable("clinical_photo_transcriptions", {
  photoId: text("photo_id").primaryKey(),
  text: text("text").notNull().default(""),
  // "basic" (modelo económico) o "advanced" (reintento con un modelo más potente).
  tier: text("tier").notNull().default("basic"),
  model: text("model").notNull().default(""),
  transcribedByUserId: text("transcribed_by_user_id"),
  transcribedByName: text("transcribed_by_name"),
  transcribedAt: timestamp("transcribed_at", { withTimezone: true }).notNull().defaultNow(),
  editedByName: text("edited_by_name"),
  editedAt: timestamp("edited_at", { withTimezone: true }),
});

// Cuota mensual de transcripciones por clínica y si tiene habilitado el
// reintento avanzado. Sin fila = valores por defecto del servidor.
export const transcriptionSettingsTable = pgTable("clinic_transcription_settings", {
  centerId: text("center_id").primaryKey(),
  monthlyQuota: integer("monthly_quota").notNull().default(100),
  advancedEnabled: boolean("advanced_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Cada llamada al modelo: sirve para contar el uso del mes contra la cuota
// (units: básica = 1, avanzada = 2) y para estimar el costo real.
export const transcriptionUsageTable = pgTable("clinic_transcription_usage", {
  id: text("id").primaryKey(),
  centerId: text("center_id").notNull(),
  photoId: text("photo_id").notNull(),
  tier: text("tier").notNull(),
  model: text("model").notNull(),
  units: integer("units").notNull().default(1),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Parámetros de plan propios de cada clínica (los fija supra-control). Sin fila,
// o con un campo en NULL, vale lo que define el plan (PLAN_DEFAULT_LIMITS en
// artifacts/api-server/src/lib/plans.ts). Un 0 significa «sin límite».
// Migración: lib/db/sql/sql0003-limites-horas-y-cobro.sql.
export const clinicPlanSettingsTable = pgTable("clinic_plan_settings", {
  centerId: text("center_id").primaryKey(),
  patientsPerMonth: integer("patients_per_month"),
  storageGb: integer("storage_gb"),
  // Bajada de plan programada: se aplica sola cuando llega la fecha.
  pendingPlan: text("pending_plan"),
  pendingPlanFrom: timestamp("pending_plan_from", { withTimezone: true }),
  // Suspensión automática por falta de pago. Apagada por defecto: ninguna clínica se bloquea sin que supra-control lo active.
  billingAuto: boolean("billing_auto").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Horas de inducción, personalización y atención: cada movimiento es una fila.
// Saldo = incluidas + compradas + ajustes − usadas (en minutos, para no usar decimales).
export const clinicHoursTable = pgTable("clinic_hours_ledger", {
  id: text("id").primaryKey(),
  centerId: text("center_id").notNull(),
  kind: text("kind").notNull(),
  minutes: integer("minutes").notNull(),
  note: text("note").notNull().default(""),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("clinic_hours_kind_check", sql`${table.kind} in ('incluidas', 'compradas', 'usadas', 'ajuste')`),
]);

// «Continuar en el celular»: el personal abre una sesión corta para UNA fase de UN paciente y el
// celular sube las fotos con el token de un solo enlace (solo se guarda el hash del token).
export const captureSessionsTable = pgTable("capture_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  leadId: text("lead_id").notNull(),
  centerId: text("center_id").notNull(),
  phaseId: text("phase_id").notNull(),
  createdByUserId: text("created_by_user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PhotoTranscription = typeof photoTranscriptionsTable.$inferSelect;

// Aceptación en línea del contrato de servicio: una fila por aceptación (nunca se edita ni se borra).
// Guarda quién, cuándo, qué plan, qué versión del contrato y la huella (hash) del texto exacto que vio.
export const clinicContractAcceptancesTable = pgTable("clinic_contract_acceptances", {
  id: text("id").primaryKey(),
  centerId: text("center_id").notNull(),
  plan: text("plan").notNull(),
  contractVersion: text("contract_version").notNull(),
  contractHash: text("contract_hash").notNull(),
  acceptedByUserId: text("accepted_by_user_id").notNull(),
  acceptedByName: text("accepted_by_name").notNull().default(""),
  acceptedByEmail: text("accepted_by_email").notNull().default(""),
  acceptedByRole: text("accepted_by_role").notNull().default(""),
  ip: text("ip"),
  userAgent: text("user_agent"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("clinic_contract_acceptances_center_idx").on(table.centerId, table.acceptedAt),
]);

// Enlaces únicos con que se envía el contrato por correo al representante legal (solo se guarda el hash del token).
export const clinicContractInvitesTable = pgTable("clinic_contract_invites", {
  id: text("id").primaryKey(),
  centerId: text("center_id").notNull(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  plan: text("plan").notNull(),
  contractVersion: text("contract_version").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
}, (table) => [
  index("clinic_contract_invites_center_idx").on(table.centerId, table.sentAt),
]);

// Datos de la clínica para el contrato: RUT, domicilio y teléfono (supra-control los pide al crearla).
// Tabla aparte para no tocar clinical_centers; las filas existentes quedan «sin datos» hasta completarlas.
export const clinicProfilesTable = pgTable("clinic_profiles", {
  centerId: text("center_id").primaryKey(),
  // País de la clínica: define el documento de identidad (RUT en Chile, pasaporte en los demás países).
  country: text("country").notNull().default("CL"),
  // Documento de identidad de la clínica (se llama «rut» por historia, pero en otros países guarda el pasaporte).
  rut: text("rut").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Datos personales del usuario de una clínica: RUT, domicilio, prefijo (Dr, Sra…) y especialidad (médicos).
// El del representante legal rellena el contrato.
export const userProfilesTable = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  rut: text("rut").notNull().default(""),
  address: text("address").notNull().default(""),
  prefix: text("prefix").notNull().default(""),
  specialty: text("specialty").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Integraciones que una clínica pide al ver el catálogo «Integraciones disponibles» (redes, agendas, mensajería).
// Una fila por clínica e integración; supra-control las ve en la ficha de la clínica.
export const integrationRequestsTable = pgTable("integration_requests", {
  id: text("id").primaryKey(),
  centerId: text("center_id").notNull(),
  integration: text("integration").notNull(),
  requestedByUserId: text("requested_by_user_id").notNull(),
  requestedByName: text("requested_by_name").notNull().default(""),
  requestedByEmail: text("requested_by_email").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("integration_requests_center_integration_idx").on(table.centerId, table.integration),
]);

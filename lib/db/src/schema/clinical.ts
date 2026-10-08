import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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

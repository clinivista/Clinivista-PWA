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
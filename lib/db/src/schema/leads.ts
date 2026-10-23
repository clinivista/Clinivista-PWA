import { pgTable, text, boolean, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const photoEntrySchema = z.object({
  key: z.string(),
  label: z.string(),
  dataUrl: z.string(),
  quality: z.string(),
  createdAt: z.string(),
});

export type PhaseAttention = {
  date: string;
  agendaId: string;
  byUserId: string;
  byName: string;
  at: string;
};

export type SkippedPhase = {
  phaseId: string;
  reason: string;
  byUserId: string;
  byName: string;
  at: string;
};

export type PhotoEntry = z.infer<typeof photoEntrySchema>;

export const leadsTable = pgTable("leads", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  documentId: text("document_id").default(""),
  // Normalized RUT (digits + uppercase K, no punctuation), e.g. "12345678K".
  // Unique per clinic (see leads_center_document_unique below), not globally —
  // two different clinics can each have a patient with the same RUT.
  documentNormalized: text("document_normalized").default(""),
  email: text("email").default(""),
  age: text("age").default(""),
  city: text("city").default(""),
  status: text("status").notNull().default("nuevo"),
  consent: boolean("consent").notNull().default(false),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  photoCount: text("photo_count").notNull().default("0"),
  photos: jsonb("photos").notNull().default([]),
  // Fase 5: these six columns are specific to the "capilar" specialty (see
  // artifacts/api-server/src/lib/specialties/capilar.ts) and are kept here,
  // unmigrated, for backward compatibility with existing production data and
  // API consumers. They are mirrored into clinical_evaluations.clinicalData
  // going forward — a future specialty does NOT get its own leads columns,
  // it gets its own specialty module and lives in clinicalData instead.
  hairLossTime: text("hair_loss_time").default(""),
  pattern: text("pattern").default(""),
  previousTreatment: text("previous_treatment").default(""),
  symptoms: text("symptoms").default(""),
  surgeryHistory: text("surgery_history").default(""),
  notes: text("notes").default(""),
  norwood: text("norwood").default(""),
  appointmentAt: text("appointment_at").default(""),
  isDemo: boolean("is_demo").default(false),
  centerId: text("center_id").default("default-center"),
  protocolId: text("protocol_id").default("capillary-initial"),
  // How the patient wants to receive the results: "email", "whatsapp" or "" (not chosen).
  deliveryChannel: text("delivery_channel").default(""),
  // The patient's own portal account (one per email, shared across clinics).
  patientAccountId: text("patient_account_id"),
  // The language the patient used in the form: emails and messages to them go in it.
  language: text("language").default(""),
  // Respuestas a las preguntas propias de la especialidad de la clínica (todas
  // menos capilar, que conserva sus columnas históricas de arriba).
  clinicalData: jsonb("clinical_data").notNull().default({}),
  // Paciente agregado por el personal: quién marcó la constancia del
  // consentimiento (dado en persona o por escrito) y cuándo. Vacío cuando el
  // propio paciente se registró desde su enlace.
  consentRecordedBy: text("consent_recorded_by").default(""),
  consentRecordedAt: timestamp("consent_recorded_at", { withTimezone: true }),
  // Etapas que el personal omitió: [{ phaseId, reason, byUserId, byName, at }].
  skippedPhases: jsonb("skipped_phases").notNull().default([]),
  // Atención de cada fase desde el diagnóstico: { [phaseId]: { date, agendaId, byUserId, byName, at } }.
  // «date» es el día de la atención; «agendaId» es el número de esa atención en la
  // agenda propia de la clínica (opcional).
  phaseAttentions: jsonb("phase_attentions").notNull().default({}),
  // Alta médica: quién la dio, cuándo y la nota. Solo la dan los médicos.
  dischargedAt: timestamp("discharged_at", { withTimezone: true }),
  dischargedByName: text("discharged_by_name").default(""),
  dischargeNote: text("discharge_note").default(""),
  // Consulta adicional de un paciente (dermatología, varios tipos de consulta):
  // apunta a la ficha principal. Las consultas adicionales no llevan RUT
  // normalizado (el RUT es único por clínica) y no cuentan como pacientes.
  parentLeadId: text("parent_lead_id"),
}, (table) => [
  // Per-clinic uniqueness: the same RUT is only a duplicate within one center.
  uniqueIndex("leads_center_document_unique")
    .on(table.centerId, table.documentNormalized)
    .where(sql`${table.documentNormalized} IS NOT NULL AND ${table.documentNormalized} <> ''`),
]);

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;

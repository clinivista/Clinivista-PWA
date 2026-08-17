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
  // Named without a centre prefix so a future composite unique (centreId, documentNormalized) can replace the global one.
  documentNormalized: text("document_normalized").default(""),
  email: text("email").default(""),
  age: text("age").default(""),
  city: text("city").default(""),
  status: text("status").notNull().default("nuevo"),
  consent: boolean("consent").notNull().default(false),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  photoCount: text("photo_count").notNull().default("0"),
  photos: jsonb("photos").notNull().default([]),
  hairLossTime: text("hair_loss_time").default(""),
  pattern: text("pattern").default(""),
  previousTreatment: text("previous_treatment").default(""),
  symptoms: text("symptoms").default(""),
  surgeryHistory: text("surgery_history").default(""),
  notes: text("notes").default(""),
  norwood: text("norwood").default(""),
  appointmentAt: text("appointment_at").default(""),
  isDemo: boolean("is_demo").default(false),
}, (table) => [
  uniqueIndex("leads_document_normalized_unique")
    .on(table.documentNormalized)
    .where(sql`${table.documentNormalized} IS NOT NULL AND ${table.documentNormalized} <> ''`),
]);

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;

import { pgTable, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// "medico" and "administrativo" belong to one clinic (`centerId` set).
// "director" is Jose/Juan Alberto's own supra-control role: it sees across
// every clinic, so it deliberately has no `centerId` (see routes/auth.ts).
// "supra_admin" is a platform-side operator created by a director: it works
// the supra-control panel (clinics, payments, suspensions, exports) but cannot
// manage users — only directors do that. Also no `centerId`.
export const USER_ROLES = ["medico", "administrativo", "director", "supra_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  // Display casing kept as typed; lookups always go through emailNormalized.
  email: text("email").notNull(),
  emailNormalized: text("email_normalized").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  role: text("role", { enum: USER_ROLES }).notNull(),
  // null only for "director" and "supra_admin" — every clinic-scoped role must have one.
  centerId: text("center_id"),
  active: boolean("active").notNull().default(true),
  // "Representante legal" of a clinic: may be a médico, and (like every
  // administrativo) can manage the clinic's users from its own panel.
  legalRepresentative: boolean("legal_representative").notNull().default(false),
  // "Olvidé mi clave": sha256 of the one-time link sent by email (never the token itself) and when it expires.
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("users_email_normalized_unique").on(table.emailNormalized),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

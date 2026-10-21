import { pgTable, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";

// Sección administrativa de supra-control: servicios contratados, su estado
// automático y el control mensual de ingresos y gastos.

/** Registro manual de servicios contratados (hosting, base de datos, dominio…). */
export const adminServicesTable = pgTable("admin_services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default(""),
  plan: text("plan").notNull().default(""),
  // Costo en la unidad menor de la moneda (centavos); 0 = gratis o sin dato.
  costCents: integer("cost_cents").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  billingCycle: text("billing_cycle", { enum: ["monthly", "yearly", "none"] }).notNull().default("monthly"),
  // YYYY-MM-DD; el sistema avisa unos días antes.
  renewalDate: text("renewal_date"),
  // Para no repetir el aviso: fecha de renovación sobre la que ya se avisó.
  renewalAlertedFor: text("renewal_alerted_for"),
  notes: text("notes").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Último resultado de cada revisión automática (una fila por revisión). */
export const adminServiceStatusTable = pgTable("admin_service_status", {
  checkKey: text("check_key").primaryKey(),
  status: text("status", { enum: ["ok", "warn", "fail", "unknown"] }).notNull().default("unknown"),
  detail: text("detail").notNull().default(""),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  failures: integer("failures").notNull().default(0),
  alerted: boolean("alerted").notNull().default(false),
  lastAlertAt: timestamp("last_alert_at", { withTimezone: true }),
});

export const financeEntriesTable = pgTable("finance_entries", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["income", "expense"] }).notNull(),
  // YYYY-MM-DD (día contable en hora de Chile).
  entryDate: text("entry_date").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("CLP"),
  category: text("category").notNull().default(""),
  note: text("note").notNull().default(""),
  serviceId: text("service_id"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("finance_entries_date_idx").on(table.entryDate),
]);

/** Ajustes sueltos (por ahora, los correos que reciben las alertas). */
export const adminSettingsTable = pgTable("admin_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});

export type AdminService = typeof adminServicesTable.$inferSelect;
export type FinanceEntry = typeof financeEntriesTable.$inferSelect;

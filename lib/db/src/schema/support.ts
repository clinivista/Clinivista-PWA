import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

// Chat de soporte: una conversación por usuario de clínica (`threadUserId`)
// con el equipo de supra-control. `sender` dice quién escribió cada mensaje.
export const SUPPORT_SENDERS = ["staff", "support"] as const;
export type SupportSender = (typeof SUPPORT_SENDERS)[number];

export const supportMessagesTable = pgTable("support_messages", {
  id: text("id").primaryKey(),
  threadUserId: text("thread_user_id").notNull(),
  centerId: text("center_id").notNull(),
  sender: text("sender", { enum: SUPPORT_SENDERS }).notNull(),
  // Quién respondió desde supra-control (null cuando escribe el usuario de la clínica).
  senderUserId: text("sender_user_id"),
  body: text("body").notNull(),
  // Mensajes del usuario: ya los vio soporte. Mensajes de soporte: ya los vio el usuario.
  readByOther: boolean("read_by_other").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("support_messages_thread_idx").on(table.threadUserId, table.createdAt),
]);

export type SupportMessage = typeof supportMessagesTable.$inferSelect;

import { pgTable, text, boolean, timestamp, integer, serial, index } from "drizzle-orm/pg-core";

// Chat de soporte: una conversación por usuario de clínica (`threadUserId`)
// con el equipo de supra-control. `sender` dice quién escribió cada mensaje.
// "system" son los mensajes automáticos (recibido, resuelto).
export const SUPPORT_SENDERS = ["staff", "support", "system"] as const;
export type SupportSender = (typeof SUPPORT_SENDERS)[number];

export const supportMessagesTable = pgTable("support_messages", {
  id: text("id").primaryKey(),
  threadUserId: text("thread_user_id").notNull(),
  // Ticket al que pertenece el mensaje (cada conversación es un ticket con inicio, desarrollo y cierre).
  ticketId: text("ticket_id"),
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
  index("support_messages_ticket_idx").on(table.ticketId, table.createdAt),
]);

// Ticket de soporte: waiting (en espera) → attending (en atención, ya respondió alguien de
// supra-control) → resolved (supra-control lo da por resuelto, falta la valoración) →
// closed (el usuario valoró; queda en el historial y el chat se limpia).
export const TICKET_STATUSES = ["waiting", "attending", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const supportTicketsTable = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  // Número legible (#12) para nombrarlo en el panel y en los avisos.
  number: serial("number").notNull(),
  requesterUserId: text("requester_user_id").notNull(),
  centerId: text("center_id").notNull(),
  subject: text("subject").notNull(),
  status: text("status", { enum: TICKET_STATUSES }).notNull().default("waiting"),
  // Idioma del usuario: los mensajes automáticos salen en él.
  language: text("language").notNull().default("es"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedByUserId: text("resolved_by_user_id"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  // Valoración de la atención (1 a 5) que deja el usuario al cerrar.
  rating: integer("rating"),
  ratingComment: text("rating_comment").notNull().default(""),
}, (table) => [
  index("support_tickets_status_idx").on(table.status, table.createdAt),
  index("support_tickets_requester_idx").on(table.requesterUserId, table.createdAt),
]);

export type SupportTicket = typeof supportTicketsTable.$inferSelect;

export type SupportMessage = typeof supportMessagesTable.$inferSelect;

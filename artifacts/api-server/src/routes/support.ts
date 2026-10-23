import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { db, supportMessagesTable, supportTicketsTable, usersTable, centersTable, type SupportTicket } from "@workspace/db";
import { requireStaffAuth, requireSupraAuth } from "./auth";
import { clean } from "../lib/helpers";
import { receivedMessage, resolvedMessage, toSupportLanguage } from "../lib/support-texts";
import { notifyDirectorsNewTicket } from "../lib/support-notify";
import { baseUrl } from "./results";

const router: IRouter = Router();

const MAX_BODY = 2000;
const MAX_SUBJECT = 120;
const MAX_PER_HOUR = 60;
const MAX_TICKETS_PER_DAY = 10;
const ACTIVE = ["waiting", "attending", "resolved"] as const;
const ID = /^[\w.-]{1,100}$/;

type Message = typeof supportMessagesTable.$inferSelect;

function cleanBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const body = value.replace(/\r\n/g, "\n").trim();
  return body && body.length <= MAX_BODY ? body : null;
}

/** Quiénes de supra-control han respondido el ticket (puede atenderlo más de uno). */
async function attendantsOf(ticketIds: string[]): Promise<Map<string, { id: string; name: string }[]>> {
  const result = new Map<string, { id: string; name: string }[]>();
  if (ticketIds.length === 0) return result;
  const rows = await db.select({ ticketId: supportMessagesTable.ticketId, userId: supportMessagesTable.senderUserId })
    .from(supportMessagesTable)
    .where(and(inArray(supportMessagesTable.ticketId, ticketIds), eq(supportMessagesTable.sender, "support")))
    .orderBy(asc(supportMessagesTable.createdAt));
  const ids = [...new Set(rows.map((row) => row.userId).filter((id): id is string => Boolean(id)))];
  const users = ids.length ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, ids)) : [];
  const nameOf = new Map(users.map((user) => [user.id, user.name || user.email]));
  for (const row of rows) {
    if (!row.ticketId || !row.userId) continue;
    const list = result.get(row.ticketId) ?? [];
    if (!list.some((entry) => entry.id === row.userId)) list.push({ id: row.userId, name: nameOf.get(row.userId) ?? "Soporte" });
    result.set(row.ticketId, list);
  }
  return result;
}

const iso = (date: Date | null) => (date ? date.toISOString() : null);

function ticketView(ticket: SupportTicket, attendants: { id: string; name: string }[] = []) {
  return {
    id: ticket.id, number: ticket.number, subject: ticket.subject, status: ticket.status,
    createdAt: ticket.createdAt.toISOString(), lastActivityAt: ticket.lastActivityAt.toISOString(),
    firstResponseAt: iso(ticket.firstResponseAt), resolvedAt: iso(ticket.resolvedAt), closedAt: iso(ticket.closedAt),
    rating: ticket.rating, ratingComment: ticket.ratingComment, attendants,
  };
}

async function messagesView(rows: Message[]) {
  const ids = [...new Set(rows.map((row) => row.senderUserId).filter((id): id is string => Boolean(id)))];
  const users = ids.length ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, ids)) : [];
  const nameOf = new Map(users.map((user) => [user.id, user.name || user.email]));
  return rows.map((m) => ({
    id: m.id, sender: m.sender, body: m.body, createdAt: m.createdAt.toISOString(),
    senderName: m.sender === "support" && m.senderUserId ? nameOf.get(m.senderUserId) ?? "Soporte" : null,
  }));
}

async function ownTicket(userId: string, id: string): Promise<SupportTicket | undefined> {
  if (!ID.test(id)) return undefined;
  const [ticket] = await db.select().from(supportTicketsTable).where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.requesterUserId, userId)));
  return ticket;
}

async function anyTicket(id: string): Promise<SupportTicket | undefined> {
  if (!ID.test(id)) return undefined;
  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  return ticket;
}

async function recentStaffMessages(userId: string): Promise<number> {
  const since = new Date(Date.now() - 3600_000);
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(supportMessagesTable)
    .where(and(eq(supportMessagesTable.threadUserId, userId), eq(supportMessagesTable.sender, "staff"), gt(supportMessagesTable.createdAt, since)));
  return row?.n ?? 0;
}

// ── Usuario de clínica ────────────────────────────────────────────────────

/** Mi ticket activo (si hay), mi historial de tickets cerrados y lo que no he leído. */
router.get("/support/tickets", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const rows = await db.select().from(supportTicketsTable)
    .where(eq(supportTicketsTable.requesterUserId, staff.userId)).orderBy(desc(supportTicketsTable.createdAt)).limit(200);
  const attendants = await attendantsOf(rows.map((ticket) => ticket.id));
  const view = (ticket: SupportTicket) => ticketView(ticket, attendants.get(ticket.id));
  const active = rows.find((ticket) => ticket.status !== "closed");
  res.json({ active: active ? view(active) : null, history: rows.filter((ticket) => ticket.status === "closed").map(view) });
});

/** Abre un ticket nuevo: primer mensaje del usuario + aviso automático de recibido. Solo uno activo a la vez. */
router.post("/support/tickets", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const body = cleanBody(req.body?.body);
  const subject = clean(req.body?.subject, MAX_SUBJECT);
  if (!body || subject.length < 3) {
    res.status(400).json({ error: `Escribe el asunto y tu consulta (hasta ${MAX_BODY} caracteres).` });
    return;
  }
  const [open] = await db.select({ id: supportTicketsTable.id }).from(supportTicketsTable)
    .where(and(eq(supportTicketsTable.requesterUserId, staff.userId), ne(supportTicketsTable.status, "closed"))).limit(1);
  if (open) {
    res.status(409).json({ error: "Ya tienes un ticket abierto. Ciérralo antes de abrir otro.", ticketId: open.id });
    return;
  }
  const since = new Date(Date.now() - 86_400_000);
  const [today] = await db.select({ n: sql<number>`count(*)::int` }).from(supportTicketsTable)
    .where(and(eq(supportTicketsTable.requesterUserId, staff.userId), gt(supportTicketsTable.createdAt, since)));
  if ((today?.n ?? 0) >= MAX_TICKETS_PER_DAY) {
    res.status(429).json({ error: "Abriste demasiados tickets hoy. Intenta de nuevo mañana." });
    return;
  }
  const language = toSupportLanguage(req.body?.language);
  const id = randomUUID();
  const [ticket] = await db.insert(supportTicketsTable).values({
    id, requesterUserId: staff.userId, centerId: staff.centerId, subject, language,
  }).returning();
  const now = Date.now();
  await db.insert(supportMessagesTable).values([
    { id: randomUUID(), threadUserId: staff.userId, ticketId: id, centerId: staff.centerId, sender: "staff", body, readByOther: false, createdAt: new Date(now) },
    // Mensaje automático: el usuario sabe de inmediato que su consulta quedó registrada.
    { id: randomUUID(), threadUserId: staff.userId, ticketId: id, centerId: staff.centerId, sender: "system", body: receivedMessage(language), readByOther: false, createdAt: new Date(now + 1) },
  ]);
  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, staff.userId));
  const [center] = await db.select({ name: centersTable.name }).from(centersTable).where(eq(centersTable.id, staff.centerId));
  void notifyDirectorsNewTicket({
    number: ticket!.number, subject, clinicName: center?.name ?? "Clínica", requesterName: user?.name || user?.email || "Usuario",
    firstMessage: body, panelUrl: baseUrl(req),
  });
  res.status(201).json(ticketView(ticket!));
});

/** Conversación de uno de mis tickets (también los cerrados, en solo lectura). `?markRead=1` marca lo de soporte como leído. */
router.get("/support/tickets/:id/messages", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const ticket = await ownTicket(staff.userId, String(req.params.id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket no encontrado." });
    return;
  }
  if (req.query.markRead === "1") {
    await db.update(supportMessagesTable).set({ readByOther: true })
      .where(and(eq(supportMessagesTable.ticketId, ticket.id), ne(supportMessagesTable.sender, "staff"), eq(supportMessagesTable.readByOther, false)));
  }
  const rows = await db.select().from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, ticket.id)).orderBy(asc(supportMessagesTable.createdAt)).limit(500);
  const attendants = (await attendantsOf([ticket.id])).get(ticket.id);
  res.json({ ticket: ticketView(ticket, attendants), messages: await messagesView(rows) });
});

router.post("/support/tickets/:id/messages", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const ticket = await ownTicket(staff.userId, String(req.params.id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket no encontrado." });
    return;
  }
  if (ticket.status === "resolved" || ticket.status === "closed") {
    res.status(409).json({ error: "Este ticket ya está resuelto. Valora la atención o abre uno nuevo." });
    return;
  }
  const body = cleanBody(req.body?.body);
  if (!body) {
    res.status(400).json({ error: `Escribe un mensaje de hasta ${MAX_BODY} caracteres.` });
    return;
  }
  if ((await recentStaffMessages(staff.userId)) >= MAX_PER_HOUR) {
    res.status(429).json({ error: "Demasiados mensajes seguidos. Intenta de nuevo en un rato." });
    return;
  }
  const [row] = await db.insert(supportMessagesTable).values({
    id: randomUUID(), threadUserId: staff.userId, ticketId: ticket.id, centerId: ticket.centerId, sender: "staff", body,
  }).returning();
  await db.update(supportTicketsTable).set({ lastActivityAt: new Date() }).where(eq(supportTicketsTable.id, ticket.id));
  res.status(201).json((await messagesView([row!]))[0]);
});

/** Valoración de la atención (1 a 5, comentario opcional): cierra el ticket y lo pasa al historial. */
router.post("/support/tickets/:id/rating", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const ticket = await ownTicket(staff.userId, String(req.params.id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket no encontrado." });
    return;
  }
  if (ticket.status !== "resolved") {
    res.status(409).json({ error: ticket.status === "closed" ? "Este ticket ya fue valorado." : "El ticket aún no está resuelto." });
    return;
  }
  const rating = Number(req.body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Elige una valoración de 1 a 5." });
    return;
  }
  const [updated] = await db.update(supportTicketsTable).set({
    status: "closed", rating, ratingComment: clean(req.body?.comment, 500), closedAt: new Date(), lastActivityAt: new Date(),
  }).where(and(eq(supportTicketsTable.id, ticket.id), eq(supportTicketsTable.status, "resolved"))).returning();
  if (!updated) {
    res.status(409).json({ error: "Este ticket ya fue valorado." });
    return;
  }
  res.json(ticketView(updated, (await attendantsOf([ticket.id])).get(ticket.id)));
});

/** Para el aviso del menú: mensajes sin leer del ticket activo, y un ticket resuelto esperando valoración cuenta como pendiente. */
router.get("/support/unread", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(supportMessagesTable)
    .where(and(eq(supportMessagesTable.threadUserId, staff.userId), ne(supportMessagesTable.sender, "staff"), eq(supportMessagesTable.readByOther, false)));
  const [pending] = await db.select({ n: sql<number>`count(*)::int` }).from(supportTicketsTable)
    .where(and(eq(supportTicketsTable.requesterUserId, staff.userId), eq(supportTicketsTable.status, "resolved")));
  res.json({ unread: (row?.n ?? 0) + (pending?.n ?? 0) });
});

// ── Supra-control (director y administrativo de supra-control) ────────────

/** Cola de tickets. `?view=history` trae los cerrados (con valoración); por defecto los abiertos, los más antiguos en espera primero. */
router.get("/support/queue", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const history = req.query.view === "history";
  const rows = await db.select().from(supportTicketsTable)
    .where(history ? eq(supportTicketsTable.status, "closed") : inArray(supportTicketsTable.status, [...ACTIVE]))
    .orderBy(history ? desc(supportTicketsTable.closedAt) : asc(supportTicketsTable.createdAt)).limit(history ? 300 : 500);
  const ids = rows.map((ticket) => ticket.id);
  const attendants = await attendantsOf(ids);
  const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone }).from(usersTable)
    .where(inArray(usersTable.id, [...new Set(rows.map((ticket) => ticket.requesterUserId))].concat("__none__")));
  const centers = await db.select({ id: centersTable.id, name: centersTable.name }).from(centersTable);
  const userBy = new Map(users.map((user) => [user.id, user]));
  const centerBy = new Map(centers.map((center) => [center.id, center.name]));
  const unreadRows = ids.length
    ? await db.select({ ticketId: supportMessagesTable.ticketId, n: sql<number>`count(*)::int` }).from(supportMessagesTable)
      .where(and(inArray(supportMessagesTable.ticketId, ids), eq(supportMessagesTable.sender, "staff"), eq(supportMessagesTable.readByOther, false)))
      .groupBy(supportMessagesTable.ticketId)
    : [];
  const unreadBy = new Map(unreadRows.map((row) => [row.ticketId, row.n]));
  const lastRows = ids.length
    ? await db.select().from(supportMessagesTable).where(inArray(supportMessagesTable.ticketId, ids)).orderBy(desc(supportMessagesTable.createdAt))
    : [];
  const lastBy = new Map<string, Message>();
  for (const message of lastRows) if (message.ticketId && message.sender !== "system" && !lastBy.has(message.ticketId)) lastBy.set(message.ticketId, message);
  const [counts] = await db.select({
    waiting: sql<number>`count(*) filter (where status = 'waiting')::int`,
    attending: sql<number>`count(*) filter (where status = 'attending')::int`,
    resolved: sql<number>`count(*) filter (where status = 'resolved')::int`,
  }).from(supportTicketsTable);
  res.json({
    counts: { waiting: counts?.waiting ?? 0, attending: counts?.attending ?? 0, resolved: counts?.resolved ?? 0 },
    tickets: rows.map((ticket) => {
      const user = userBy.get(ticket.requesterUserId);
      const last = lastBy.get(ticket.id);
      return {
        ...ticketView(ticket, attendants.get(ticket.id)),
        requesterId: ticket.requesterUserId,
        requesterName: user?.name || user?.email || "Usuario",
        requesterEmail: user?.email ?? "",
        requesterPhone: user?.phone ?? "",
        centerName: centerBy.get(ticket.centerId) ?? "Clínica",
        lastMessage: last ? last.body.slice(0, 140) : "",
        lastSender: last?.sender ?? "staff",
        unread: unreadBy.get(ticket.id) ?? 0,
      };
    }),
  });
});

/** Alerta para los directores: tickets en espera de atención (el más antiguo primero). */
router.get("/support/alerts", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const waiting = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.status, "waiting")).orderBy(asc(supportTicketsTable.createdAt)).limit(50);
  const users = waiting.length ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, waiting.map((ticket) => ticket.requesterUserId))) : [];
  const centers = await db.select({ id: centersTable.id, name: centersTable.name }).from(centersTable);
  const userBy = new Map(users.map((user) => [user.id, user.name || user.email]));
  const centerBy = new Map(centers.map((center) => [center.id, center.name]));
  const [total] = await db.select({ n: sql<number>`count(*)::int` }).from(supportTicketsTable).where(eq(supportTicketsTable.status, "waiting"));
  res.json({
    waiting: total?.n ?? 0,
    items: waiting.slice(0, 10).map((ticket) => ({
      id: ticket.id, number: ticket.number, subject: ticket.subject, createdAt: ticket.createdAt.toISOString(),
      requesterName: userBy.get(ticket.requesterUserId) ?? "Usuario", centerName: centerBy.get(ticket.centerId) ?? "Clínica",
    })),
  });
});

router.get("/support/queue/:id/messages", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const ticket = await anyTicket(String(req.params.id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket no encontrado." });
    return;
  }
  if (req.query.markRead === "1") {
    await db.update(supportMessagesTable).set({ readByOther: true })
      .where(and(eq(supportMessagesTable.ticketId, ticket.id), eq(supportMessagesTable.sender, "staff"), eq(supportMessagesTable.readByOther, false)));
  }
  const rows = await db.select().from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, ticket.id)).orderBy(asc(supportMessagesTable.createdAt)).limit(500);
  res.json({ ticket: ticketView(ticket, (await attendantsOf([ticket.id])).get(ticket.id)), messages: await messagesView(rows) });
});

/** Responder: cualquiera de supra-control puede hacerlo; el ticket pasa a "en atención" y queda anotado quién respondió. */
router.post("/support/queue/:id/messages", async (req, res): Promise<void> => {
  const supra = requireSupraAuth(req, res);
  if (!supra) return;
  const ticket = await anyTicket(String(req.params.id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket no encontrado." });
    return;
  }
  if (ticket.status === "resolved" || ticket.status === "closed") {
    res.status(409).json({ error: "Este ticket ya está resuelto." });
    return;
  }
  const body = cleanBody(req.body?.body);
  if (!body) {
    res.status(400).json({ error: `Escribe un mensaje de hasta ${MAX_BODY} caracteres.` });
    return;
  }
  const [row] = await db.insert(supportMessagesTable).values({
    id: randomUUID(), threadUserId: ticket.requesterUserId, ticketId: ticket.id, centerId: ticket.centerId, sender: "support", senderUserId: supra.userId, body,
  }).returning();
  const now = new Date();
  await db.update(supportTicketsTable).set({
    status: "attending", lastActivityAt: now, firstResponseAt: ticket.firstResponseAt ?? now,
  }).where(eq(supportTicketsTable.id, ticket.id));
  res.status(201).json((await messagesView([row!]))[0]);
});

/** Dar el ticket por resuelto: el usuario recibe el aviso y debe valorar la atención para cerrarlo. */
router.post("/support/queue/:id/resolve", async (req, res): Promise<void> => {
  const supra = requireSupraAuth(req, res);
  if (!supra) return;
  const ticket = await anyTicket(String(req.params.id));
  if (!ticket) {
    res.status(404).json({ error: "Ticket no encontrado." });
    return;
  }
  if (ticket.status === "resolved" || ticket.status === "closed") {
    res.status(409).json({ error: "Este ticket ya estaba resuelto." });
    return;
  }
  const [user] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, supra.userId));
  const now = new Date();
  const [updated] = await db.update(supportTicketsTable).set({
    status: "resolved", resolvedAt: now, resolvedByUserId: supra.userId, lastActivityAt: now, firstResponseAt: ticket.firstResponseAt ?? now,
  }).where(and(eq(supportTicketsTable.id, ticket.id), inArray(supportTicketsTable.status, ["waiting", "attending"]))).returning();
  if (!updated) {
    res.status(409).json({ error: "Este ticket ya estaba resuelto." });
    return;
  }
  await db.insert(supportMessagesTable).values({
    id: randomUUID(), threadUserId: ticket.requesterUserId, ticketId: ticket.id, centerId: ticket.centerId, sender: "system",
    body: resolvedMessage(ticket.language, user?.name || user?.email || "Soporte"),
  });
  res.json(ticketView(updated, (await attendantsOf([ticket.id])).get(ticket.id)));
});

export default router;

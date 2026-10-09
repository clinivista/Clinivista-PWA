import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db, supportMessagesTable, usersTable, centersTable } from "@workspace/db";
import { requireStaffAuth, requireSupraAuth } from "./auth";

const router: IRouter = Router();

const MAX_BODY = 2000;
const MAX_PER_HOUR = 60;

const view = (m: typeof supportMessagesTable.$inferSelect) => ({
  id: m.id, sender: m.sender, body: m.body, createdAt: m.createdAt.toISOString(),
});

function cleanBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const body = value.replace(/\r\n/g, "\n").trim();
  return body && body.length <= MAX_BODY ? body : null;
}

async function recentCount(threadUserId: string, sender: "staff" | "support"): Promise<number> {
  const since = new Date(Date.now() - 3600_000);
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(supportMessagesTable)
    .where(and(eq(supportMessagesTable.threadUserId, threadUserId), eq(supportMessagesTable.sender, sender), gt(supportMessagesTable.createdAt, since)));
  return row?.n ?? 0;
}

// ── Usuario de clínica ────────────────────────────────────────────────────

/** Mensajes de mi conversación. `?markRead=1` marca como leídos los de soporte (al abrir el chat). */
router.get("/support/messages", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  if (req.query.markRead === "1") {
    await db.update(supportMessagesTable).set({ readByOther: true })
      .where(and(eq(supportMessagesTable.threadUserId, staff.userId), eq(supportMessagesTable.sender, "support"), eq(supportMessagesTable.readByOther, false)));
  }
  const rows = await db.select().from(supportMessagesTable)
    .where(eq(supportMessagesTable.threadUserId, staff.userId)).orderBy(asc(supportMessagesTable.createdAt)).limit(500);
  const unread = rows.filter((m) => m.sender === "support" && !m.readByOther).length;
  res.json({ messages: rows.map(view), unread });
});

router.get("/support/unread", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(supportMessagesTable)
    .where(and(eq(supportMessagesTable.threadUserId, staff.userId), eq(supportMessagesTable.sender, "support"), eq(supportMessagesTable.readByOther, false)));
  res.json({ unread: row?.n ?? 0 });
});

router.post("/support/messages", async (req, res): Promise<void> => {
  const staff = requireStaffAuth(req, res);
  if (!staff) return;
  const body = cleanBody(req.body?.body);
  if (!body) {
    res.status(400).json({ error: `Escribe un mensaje de hasta ${MAX_BODY} caracteres.` });
    return;
  }
  if ((await recentCount(staff.userId, "staff")) >= MAX_PER_HOUR) {
    res.status(429).json({ error: "Demasiados mensajes seguidos. Intenta de nuevo en un rato." });
    return;
  }
  const [row] = await db.insert(supportMessagesTable).values({
    id: randomUUID(), threadUserId: staff.userId, centerId: staff.centerId, sender: "staff", body,
  }).returning();
  res.status(201).json(view(row!));
});

// ── Supra-control (director y administrativo de supra-control) ────────────

router.get("/support/threads", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const rows = await db.select().from(supportMessagesTable).orderBy(desc(supportMessagesTable.createdAt)).limit(5000);
  const threads = new Map<string, { userId: string; centerId: string; last: typeof rows[number]; unread: number }>();
  for (const m of rows) {
    const t = threads.get(m.threadUserId) ?? { userId: m.threadUserId, centerId: m.centerId, last: m, unread: 0 };
    if (m.sender === "staff" && !m.readByOther) t.unread += 1;
    threads.set(m.threadUserId, t);
  }
  const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable);
  const centers = await db.select({ id: centersTable.id, name: centersTable.name }).from(centersTable);
  const userBy = new Map(users.map((u) => [u.id, u]));
  const centerBy = new Map(centers.map((c) => [c.id, c.name]));
  res.json({
    threads: [...threads.values()].map((t) => ({
      userId: t.userId,
      userName: userBy.get(t.userId)?.name || userBy.get(t.userId)?.email || "Usuario",
      userEmail: userBy.get(t.userId)?.email ?? "",
      centerName: centerBy.get(t.centerId) ?? "Clínica",
      lastMessage: t.last.body.slice(0, 140),
      lastSender: t.last.sender,
      lastAt: t.last.createdAt.toISOString(),
      unread: t.unread,
    })),
    unread: [...threads.values()].reduce((n, t) => n + t.unread, 0),
  });
});

router.get("/support/threads/:userId/messages", async (req, res): Promise<void> => {
  if (!requireSupraAuth(req, res)) return;
  const userId = String(req.params.userId);
  if (req.query.markRead === "1") {
    await db.update(supportMessagesTable).set({ readByOther: true })
      .where(and(eq(supportMessagesTable.threadUserId, userId), eq(supportMessagesTable.sender, "staff"), eq(supportMessagesTable.readByOther, false)));
  }
  const rows = await db.select().from(supportMessagesTable)
    .where(eq(supportMessagesTable.threadUserId, userId)).orderBy(asc(supportMessagesTable.createdAt)).limit(500);
  res.json({ messages: rows.map(view) });
});

router.post("/support/threads/:userId/messages", async (req, res): Promise<void> => {
  const supra = requireSupraAuth(req, res);
  if (!supra) return;
  const userId = String(req.params.userId);
  const body = cleanBody(req.body?.body);
  if (!body) {
    res.status(400).json({ error: `Escribe un mensaje de hasta ${MAX_BODY} caracteres.` });
    return;
  }
  const [first] = await db.select().from(supportMessagesTable).where(eq(supportMessagesTable.threadUserId, userId)).limit(1);
  if (!first) {
    res.status(404).json({ error: "Esa conversación no existe." });
    return;
  }
  const [row] = await db.insert(supportMessagesTable).values({
    id: randomUUID(), threadUserId: userId, centerId: first.centerId, sender: "support", senderUserId: supra.userId, body,
  }).returning();
  res.status(201).json(view(row!));
});

export default router;

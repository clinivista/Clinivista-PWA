import { Router, type IRouter } from "express";
import { and, gte, lt, sql } from "drizzle-orm";
import { db, centersTable, usersTable, leadsTable, supportTicketsTable, financeEntriesTable } from "@workspace/db";
import { requireSupraAuth } from "./auth";
import { currentStatuses } from "../lib/service-monitor";

// Dashboard del panel de supra-control: estadísticas de la plataforma. Las finanzas solo las ven los directores.
const router: IRouter = Router();

const EXPIRING_DAYS = 7;
const chileMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
const nextMonth = (m: string) => { const [y, mo] = m.split("-").map(Number) as [number, number]; return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`; };

/** Semáforo general: rojo si algún servicio no funciona, amarillo si hay alguna alerta, verde si todo funciona. */
export function trafficLight(statuses: string[]): "green" | "yellow" | "red" | "unknown" {
  if (statuses.some((status) => status === "fail")) return "red";
  if (statuses.some((status) => status === "warn")) return "yellow";
  if (statuses.some((status) => status === "ok")) return "green";
  return "unknown";
}

router.get("/supra/dashboard", async (req, res): Promise<void> => {
  const supra = requireSupraAuth(req, res);
  if (!supra) return;
  const month = chileMonth();
  // Inicio del mes en hora de Chile (aprox. UTC-4/-3): suficiente para "nuevos del mes".
  const monthStart = new Date(`${month}-01T04:00:00.000Z`);
  const now = Date.now();
  const soon = new Date(now + EXPIRING_DAYS * 86_400_000);

  const [clinics] = await db.select({
    total: sql<number>`count(*)::int`,
    active: sql<number>`count(*) filter (where ${centersTable.active})::int`,
    suspended: sql<number>`count(*) filter (where not ${centersTable.active})::int`,
    upToDate: sql<number>`count(*) filter (where ${centersTable.paidUntil} >= ${soon})::int`,
    expiring: sql<number>`count(*) filter (where ${centersTable.paidUntil} >= ${new Date(now)} and ${centersTable.paidUntil} < ${soon})::int`,
    overdue: sql<number>`count(*) filter (where ${centersTable.paidUntil} < ${new Date(now)})::int`,
    noRecord: sql<number>`count(*) filter (where ${centersTable.paidUntil} is null)::int`,
  }).from(centersTable);

  const [users] = await db.select({
    total: sql<number>`count(*)::int`,
    active: sql<number>`count(*) filter (where ${usersTable.active})::int`,
    blocked: sql<number>`count(*) filter (where not ${usersTable.active})::int`,
    medicos: sql<number>`count(*) filter (where ${usersTable.role} = 'medico')::int`,
    administrativos: sql<number>`count(*) filter (where ${usersTable.role} = 'administrativo')::int`,
    supra: sql<number>`count(*) filter (where ${usersTable.role} in ('director', 'supra_admin'))::int`,
  }).from(usersTable);

  const notDemo = sql`coalesce(${leadsTable.isDemo}, false) = false`;
  const [patients] = await db.select({
    total: sql<number>`count(*)::int`,
    newThisMonth: sql<number>`count(*) filter (where ${leadsTable.createdAt} >= ${monthStart})::int`,
  }).from(leadsTable).where(notDemo);

  const t = supportTicketsTable;
  const [tickets] = await db.select({
    waiting: sql<number>`count(*) filter (where ${t.status} = 'waiting')::int`,
    attending: sql<number>`count(*) filter (where ${t.status} = 'attending')::int`,
    resolved: sql<number>`count(*) filter (where ${t.status} = 'resolved')::int`,
    closed: sql<number>`count(*) filter (where ${t.status} = 'closed')::int`,
    attendedTotal: sql<number>`count(*) filter (where ${t.firstResponseAt} is not null)::int`,
    openedThisMonth: sql<number>`count(*) filter (where ${t.createdAt} >= ${monthStart})::int`,
    resolvedThisMonth: sql<number>`count(*) filter (where ${t.resolvedAt} >= ${monthStart})::int`,
    ratingAvg: sql<number | null>`avg(${t.rating})::float`,
    ratingCount: sql<number>`count(${t.rating})::int`,
    firstResponseMinutes: sql<number | null>`(avg(extract(epoch from (${t.firstResponseAt} - ${t.createdAt})) / 60) filter (where ${t.firstResponseAt} is not null and ${t.createdAt} >= ${new Date(now - 30 * 86_400_000)}))::float`,
  }).from(t);

  const checks = await currentStatuses();
  const round = (value: number | null, digits: number) => (value === null || value === undefined ? null : Math.round(value * 10 ** digits) / 10 ** digits);

  let finance: { month: string; totals: Record<string, { income: number; expense: number; balance: number }> } | null = null;
  if (supra.role === "director") {
    const rows = await db.select().from(financeEntriesTable)
      .where(and(gte(financeEntriesTable.entryDate, `${month}-01`), lt(financeEntriesTable.entryDate, `${nextMonth(month)}-01`)));
    const totals: Record<string, { income: number; expense: number; balance: number }> = {};
    for (const row of rows) {
      const entry = (totals[row.currency] ??= { income: 0, expense: 0, balance: 0 });
      if (row.kind === "income") entry.income += row.amountCents / 100; else entry.expense += row.amountCents / 100;
      entry.balance = entry.income - entry.expense;
    }
    finance = { month, totals };
  }

  res.json({
    generatedAt: new Date().toISOString(),
    clinics: { total: clinics?.total ?? 0, active: clinics?.active ?? 0, suspended: clinics?.suspended ?? 0, payments: { upToDate: clinics?.upToDate ?? 0, expiring: clinics?.expiring ?? 0, overdue: clinics?.overdue ?? 0, noRecord: clinics?.noRecord ?? 0 }, expiringDays: EXPIRING_DAYS },
    users: { total: users?.total ?? 0, active: users?.active ?? 0, blocked: users?.blocked ?? 0, medicos: users?.medicos ?? 0, administrativos: users?.administrativos ?? 0, supra: users?.supra ?? 0 },
    patients: { total: patients?.total ?? 0, newThisMonth: patients?.newThisMonth ?? 0 },
    tickets: {
      waiting: tickets?.waiting ?? 0, attending: tickets?.attending ?? 0, resolved: tickets?.resolved ?? 0, closed: tickets?.closed ?? 0,
      pending: (tickets?.waiting ?? 0) + (tickets?.attending ?? 0),
      attendedTotal: tickets?.attendedTotal ?? 0, openedThisMonth: tickets?.openedThisMonth ?? 0, resolvedThisMonth: tickets?.resolvedThisMonth ?? 0,
      ratingAverage: round(tickets?.ratingAvg ?? null, 1), ratingCount: tickets?.ratingCount ?? 0,
      firstResponseMinutes: round(tickets?.firstResponseMinutes ?? null, 0),
    },
    services: {
      light: trafficLight(checks.map((check) => check.status)),
      checks: checks.map((check) => ({ key: check.key, label: check.label, status: check.status, detail: check.detail, checkedAt: check.checkedAt })),
    },
    finance,
  });
});

export default router;

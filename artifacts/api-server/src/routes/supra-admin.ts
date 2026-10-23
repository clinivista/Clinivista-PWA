import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db, adminServicesTable, financeEntriesTable } from "@workspace/db";
import { requireDirectorAuth } from "./auth";
import { clean, uid } from "../lib/helpers";
import { alertRenewals, applyResults, currentStatuses, getAlertEmails, runAllChecks, setAlertEmails, upcomingRenewals } from "../lib/service-monitor";

// Sección administrativa (servicios y finanzas): solo directores.
const router: IRouter = Router();

const CURRENCIES = ["CLP", "USD", "EUR"] as const;
const CYCLES = ["monthly", "yearly", "none"] as const;
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
const isMonth = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const toCents = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 1e9 ? Math.round(n * 100) : null;
};
const chileMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
const nextMonth = (m: string) => { const [y, mo] = m.split("-").map(Number) as [number, number]; return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`; };
const addMonths = (m: string, delta: number) => { let [y, mo] = m.split("-").map(Number) as [number, number]; mo += delta; while (mo < 1) { mo += 12; y -= 1; } while (mo > 12) { mo -= 12; y += 1; } return `${y}-${String(mo).padStart(2, "0")}`; };

const serviceView = (s: typeof adminServicesTable.$inferSelect) => ({
  id: s.id, name: s.name, provider: s.provider, plan: s.plan, cost: s.costCents / 100, currency: s.currency,
  billingCycle: s.billingCycle, renewalDate: s.renewalDate, notes: s.notes, active: s.active,
});
const entryView = (e: typeof financeEntriesTable.$inferSelect) => ({
  id: e.id, kind: e.kind, date: e.entryDate, amount: e.amountCents / 100, currency: e.currency, category: e.category, note: e.note, serviceId: e.serviceId,
});

function parseService(body: Record<string, unknown>, partial = false) {
  const out: Partial<typeof adminServicesTable.$inferInsert> = {};
  if (!partial || body.name !== undefined) { const name = clean(body.name, 80); if (!name) return { error: "Escribe el nombre del servicio." }; out.name = name; }
  if (body.provider !== undefined) out.provider = clean(body.provider, 80);
  if (body.plan !== undefined) out.plan = clean(body.plan, 80);
  if (body.notes !== undefined) out.notes = clean(body.notes, 500);
  if (body.cost !== undefined) { const c = toCents(body.cost); if (c === null) return { error: "El costo no es válido." }; out.costCents = c; }
  if (body.currency !== undefined) { if (!CURRENCIES.includes(body.currency as never)) return { error: "Moneda no válida." }; out.currency = body.currency as string; }
  if (body.billingCycle !== undefined) { if (!CYCLES.includes(body.billingCycle as never)) return { error: "Periodicidad no válida." }; out.billingCycle = body.billingCycle as (typeof CYCLES)[number]; }
  if (body.renewalDate !== undefined) { if (body.renewalDate === "" || body.renewalDate === null) out.renewalDate = null; else if (isDate(body.renewalDate)) out.renewalDate = body.renewalDate; else return { error: "La fecha de renovación no es válida." }; out.renewalAlertedFor = null; }
  if (body.active !== undefined) out.active = Boolean(body.active);
  return { value: out };
}

// ── Servicios ─────────────────────────────────────────────────────────────

router.get("/supra/admin/services", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const services = await db.select().from(adminServicesTable).orderBy(adminServicesTable.name);
  res.json({
    checks: await currentStatuses(),
    services: services.map(serviceView),
    alertEmails: await getAlertEmails(),
    mailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM),
  });
});

router.get("/supra/admin/banner", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const checks = await currentStatuses();
  res.json({
    problems: checks.filter((c) => c.status === "fail" || c.status === "warn").map((c) => ({ key: c.key, label: c.label, status: c.status, detail: c.detail })),
    renewals: (await upcomingRenewals()).map((r) => ({ name: r.name, renewalDate: r.renewalDate, days: r.days })),
  });
});

router.post("/supra/admin/checks/run", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  await applyResults(await runAllChecks());
  await alertRenewals();
  res.json({ checks: await currentStatuses() });
});

router.put("/supra/admin/alert-emails", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const raw = Array.isArray(req.body?.emails) ? req.body.emails : String(req.body?.emails ?? "").split(/[\s,;]+/);
  const emails = [...new Set(raw.map((e: unknown) => String(e).trim().toLowerCase()).filter(Boolean))] as string[];
  if (emails.length > 10 || emails.some((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || e.length > 120)) {
    res.status(400).json({ error: "Revisa los correos (máximo 10, uno válido por línea)." });
    return;
  }
  await setAlertEmails(emails);
  res.json({ alertEmails: emails });
});

router.post("/supra/admin/services", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const parsed = parseService(req.body ?? {});
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const [row] = await db.insert(adminServicesTable).values({ id: uid(), name: parsed.value.name!, ...parsed.value }).returning();
  res.status(201).json(serviceView(row!));
});

router.patch("/supra/admin/services/:id", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const parsed = parseService(req.body ?? {}, true);
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  if (!Object.keys(parsed.value).length) { res.status(400).json({ error: "No hay cambios." }); return; }
  const [row] = await db.update(adminServicesTable).set(parsed.value).where(eq(adminServicesTable.id, String(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "El servicio no existe." }); return; }
  res.json(serviceView(row));
});

router.delete("/supra/admin/services/:id", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const removed = await db.delete(adminServicesTable).where(eq(adminServicesTable.id, String(req.params.id))).returning({ id: adminServicesTable.id });
  if (!removed.length) { res.status(404).json({ error: "El servicio no existe." }); return; }
  res.json({ ok: true });
});

const DEFAULT_SERVICES = [
  { name: "Render", provider: "Render", plan: "", notes: "Servidor de la aplicación (despliegue automático desde main).", currency: "USD" },
  { name: "Neon", provider: "Neon", plan: "", notes: "Base de datos PostgreSQL.", currency: "USD" },
  { name: "Cloudflare (R2 y DNS)", provider: "Cloudflare", plan: "", notes: "Fotos clínicas (R2) y DNS de clinivista.cl.", currency: "USD" },
  { name: "GitHub", provider: "GitHub", plan: "", notes: "Código fuente y despliegues automáticos.", currency: "USD" },
  { name: "Claude", provider: "Anthropic", plan: "", notes: "Cuenta de Claude (asistente y API).", currency: "USD" },
  { name: "Resend", provider: "Resend", plan: "", notes: "Correos transaccionales de la app.", currency: "USD" },
  { name: "Google (ingreso con Google)", provider: "Google Cloud", plan: "Gratis", notes: "OAuth de pacientes.", currency: "USD", billingCycle: "none" as const },
  { name: "Dominio clinivista.cl", provider: "NIC Chile", plan: "", notes: "Registro del dominio.", currency: "CLP", billingCycle: "yearly" as const, renewalDate: "2028-09-15" },
];

router.post("/supra/admin/services/seed", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const existing = new Set((await db.select({ name: adminServicesTable.name }).from(adminServicesTable)).map((s) => s.name));
  const toAdd = DEFAULT_SERVICES.filter((s) => !existing.has(s.name));
  if (toAdd.length) await db.insert(adminServicesTable).values(toAdd.map((s) => ({ id: uid(), ...s })));
  res.json({ added: toAdd.length });
});

// ── Ingresos y gastos ────────────────────────────────────────────────────

function parseEntry(body: Record<string, unknown>) {
  if (body.kind !== "income" && body.kind !== "expense") return { error: "Indica si es ingreso o gasto." };
  if (!isDate(body.date)) return { error: "La fecha no es válida." };
  const cents = toCents(body.amount);
  if (cents === null || cents <= 0) return { error: "El monto debe ser mayor que cero." };
  const currency = body.currency === undefined ? "CLP" : String(body.currency);
  if (!CURRENCIES.includes(currency as never)) return { error: "Moneda no válida." };
  return { value: { kind: body.kind as "income" | "expense", entryDate: body.date, amountCents: cents, currency, category: clean(body.category, 60), note: clean(body.note, 300), serviceId: body.serviceId ? clean(body.serviceId, 40) : null } };
}

type Totals = Record<string, { income: number; expense: number; balance: number }>;
function totalsOf(rows: Array<typeof financeEntriesTable.$inferSelect>): Totals {
  const out: Totals = {};
  for (const r of rows) {
    const t = (out[r.currency] ??= { income: 0, expense: 0, balance: 0 });
    if (r.kind === "income") t.income += r.amountCents / 100; else t.expense += r.amountCents / 100;
    t.balance = Math.round((t.income - t.expense) * 100) / 100;
  }
  return out;
}

router.get("/supra/admin/finance", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const month = isMonth(req.query.month) ? req.query.month : chileMonth();
  const first = addMonths(month, -11);
  const rows = await db.select().from(financeEntriesTable)
    .where(and(gte(financeEntriesTable.entryDate, `${first}-01`), lt(financeEntriesTable.entryDate, `${nextMonth(month)}-01`)))
    .orderBy(desc(financeEntriesTable.entryDate), desc(financeEntriesTable.createdAt));
  const inMonth = rows.filter((r) => r.entryDate.startsWith(month));
  const months = Array.from({ length: 12 }, (_, i) => addMonths(first, i));
  res.json({
    month,
    entries: inMonth.map(entryView),
    totals: totalsOf(inMonth),
    history: months.map((m) => ({ month: m, totals: totalsOf(rows.filter((r) => r.entryDate.startsWith(m))) })),
  });
});

router.post("/supra/admin/finance", async (req, res): Promise<void> => {
  const supra = requireDirectorAuth(req, res);
  if (!supra) return;
  const parsed = parseEntry(req.body ?? {});
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const [row] = await db.insert(financeEntriesTable).values({ id: uid(), createdBy: supra.userId, ...parsed.value }).returning();
  res.status(201).json(entryView(row!));
});

router.patch("/supra/admin/finance/:id", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const parsed = parseEntry(req.body ?? {});
  if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return; }
  const [row] = await db.update(financeEntriesTable).set(parsed.value).where(eq(financeEntriesTable.id, String(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "El movimiento no existe." }); return; }
  res.json(entryView(row));
});

router.delete("/supra/admin/finance/:id", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const removed = await db.delete(financeEntriesTable).where(eq(financeEntriesTable.id, String(req.params.id))).returning({ id: financeEntriesTable.id });
  if (!removed.length) { res.status(404).json({ error: "El movimiento no existe." }); return; }
  res.json({ ok: true });
});

// CSV compatible con Excel (BOM + punto y coma); evita que una celda se interprete como fórmula.
const csvCell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get("/supra/admin/finance/export", async (req, res): Promise<void> => {
  if (!requireDirectorAuth(req, res)) return;
  const month = isMonth(req.query.month) ? req.query.month : null;
  const rows = await db.select().from(financeEntriesTable)
    .where(month ? and(gte(financeEntriesTable.entryDate, `${month}-01`), lt(financeEntriesTable.entryDate, `${nextMonth(month)}-01`)) : undefined)
    .orderBy(financeEntriesTable.entryDate);
  const lines = [["Fecha", "Tipo", "Monto", "Moneda", "Categoría", "Nota"].join(";")];
  for (const r of rows) lines.push([r.entryDate, r.kind === "income" ? "Ingreso" : "Gasto", (r.amountCents / 100).toFixed(2).replace(".", ","), r.currency, r.category, r.note].map(csvCell).join(";"));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="finanzas-${month ?? "todo"}.csv"`);
  res.send(`﻿${lines.join("\r\n")}\r\n`);
});

export default router;

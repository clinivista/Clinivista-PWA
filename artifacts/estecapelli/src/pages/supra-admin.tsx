import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Download, Loader2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "ok" | "warn" | "fail" | "unknown";
type Check = { key: string; label: string; status: Status; detail: string; checkedAt: string | null; since: string | null };
type Service = { id: string; name: string; provider: string; plan: string; cost: number; currency: string; billingCycle: "monthly" | "yearly" | "none"; renewalDate: string | null; notes: string; active: boolean };
type Entry = { id: string; kind: "income" | "expense"; date: string; amount: number; currency: string; category: string; note: string; serviceId: string | null };
type Totals = Record<string, { income: number; expense: number; balance: number }>;
type Banner = { problems: Array<{ key: string; label: string; status: Status; detail: string }>; renewals: Array<{ name: string; renewalDate: string; days: number }> };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? "No se pudo completar la acción.");
  return data as T;
}
const money = (n: number, currency: string) => new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(n);
const monthLabel = (m: string) => { const [y, mo] = m.split("-").map(Number) as [number, number]; const text = new Date(y, mo - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" }).replace(" de ", " "); return text.charAt(0).toUpperCase() + text.slice(1); };
const shiftMonth = (m: string, d: number) => { const [y, mo] = m.split("-").map(Number) as [number, number]; const dt = new Date(y, mo - 1 + d, 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`; };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
const CYCLE: Record<Service["billingCycle"], string> = { monthly: "Mensual", yearly: "Anual", none: "Sin cobro" };
const FIELD = "h-10 rounded-full bg-[#F5F2EE] px-4 text-sm";

const STATUS_UI: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: "Funcionando", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  warn: { label: "Atención", cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: AlertTriangle },
  fail: { label: "Con falla", cls: "bg-red-50 text-red-700 border-red-200", Icon: XCircle },
  unknown: { label: "Sin datos", cls: "bg-slate-50 text-slate-600 border-slate-200", Icon: CircleHelp },
};

/** Franja visible en todo el panel de supra-control cuando un servicio falla o una renovación está cerca. */
export function AdminBanner() {
  const { data } = useQuery({ queryKey: ["admin-banner"], queryFn: () => api<Banner>("/api/supra/admin/banner"), refetchInterval: 60_000, retry: false });
  if (!data || (!data.problems.length && !data.renewals.length)) return null;
  const failing = data.problems.some((p) => p.status === "fail");
  return (
    <div role="alert" data-testid="admin-banner" className={`px-6 py-3 text-sm font-semibold ${failing ? "bg-red-600 text-white" : "bg-amber-400 text-amber-950"}`}>
      <div className="mx-auto flex max-w-5xl flex-col gap-1">
        {data.problems.map((p) => <p key={p.key}><AlertTriangle className="mr-2 inline h-4 w-4" />{p.label}: {p.detail}</p>)}
        {data.renewals.map((r) => <p key={r.name}><AlertTriangle className="mr-2 inline h-4 w-4" />Renovación de {r.name}: {r.days < 0 ? `venció hace ${-r.days} día(s)` : r.days === 0 ? "vence hoy" : `vence en ${r.days} día(s)`} ({r.renewalDate}).</p>)}
      </div>
    </div>
  );
}

function ServicesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-services"], queryFn: () => api<{ checks: Check[]; services: Service[]; alertEmails: string[]; mailConfigured: boolean }>("/api/supra/admin/services"), refetchInterval: 60_000 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [emails, setEmails] = useState<string | null>(null);
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ["admin-services"] }); void queryClient.invalidateQueries({ queryKey: ["admin-banner"] }); };
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setError(null); try { await fn(); refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };

  if (isLoading || !data) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const emailText = emails ?? data.alertEmails.join("\n");
  const monthly = data.services.filter((s) => s.active && s.billingCycle !== "none").reduce<Record<string, number>>((acc, s) => { acc[s.currency] = (acc[s.currency] ?? 0) + (s.billingCycle === "yearly" ? s.cost / 12 : s.cost); return acc; }, {});

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold">Estado automático</h3>
          <Button variant="outline" className="h-9 rounded-full" disabled={busy} onClick={() => void run(() => api("/api/supra/admin/checks/run", { method: "POST" }))} data-testid="run-checks"><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Revisar ahora</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {data.checks.map((c) => { const ui = STATUS_UI[c.status]; return (
            <div key={c.key} className={`rounded-2xl border p-4 ${ui.cls}`} data-testid={`check-${c.key}`}>
              <p className="flex items-center gap-2 text-sm font-bold"><ui.Icon className="h-4 w-4" />{c.label}<span className="ml-auto text-xs font-semibold">{ui.label}</span></p>
              <p className="mt-1 text-sm">{c.detail}</p>
              <p className="mt-1 text-[11px] opacity-70">{c.checkedAt ? `Revisado ${new Date(c.checkedAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}` : "Aún sin revisar"}</p>
            </div>); })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Se revisa solo cada 5 minutos. Si una revisión falla dos veces seguidas, se avisa por correo. Si toda la aplicación se cae no puede avisar: usa también un monitor externo.</p>
      </div>

      <div>
        <h3 className="mb-2 font-bold">Correos que reciben las alertas</h3>
        {!data.mailConfigured && <p className="mb-2 text-sm text-amber-700">El correo del servidor no está configurado: las alertas solo se verán aquí.</p>}
        <textarea value={emailText} onChange={(e) => setEmails(e.target.value)} rows={2} placeholder="uno@correo.cl (uno por línea)" aria-label="Correos de alerta" className="w-full rounded-2xl border border-[#E8E4DE] bg-[#F5F2EE] px-4 py-3 text-sm" />
        <Button className="mt-2 h-9 rounded-full" disabled={busy || emails === null} onClick={() => void run(async () => { await api("/api/supra/admin/alert-emails", { method: "PUT", body: JSON.stringify({ emails: emailText.split(/[\s,;]+/).filter(Boolean) }) }); setEmails(null); })}>Guardar correos</Button>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">Servicios contratados</h3>
          <div className="flex gap-2">
            <Button variant="outline" className="h-9 rounded-full" disabled={busy} onClick={() => void run(() => api("/api/supra/admin/services/seed", { method: "POST" }))}>Cargar servicios habituales</Button>
            <Button className="h-9 rounded-full" onClick={() => setEditing({ currency: "USD", billingCycle: "monthly" })} data-testid="add-service"><Plus className="mr-1 h-4 w-4" />Agregar</Button>
          </div>
        </div>
        {Object.keys(monthly).length > 0 && <p className="mb-2 text-sm text-muted-foreground">Costo mensual estimado: {Object.entries(monthly).map(([cur, n]) => money(n, cur)).join(" + ")}</p>}
        {data.services.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Aún no hay servicios. Pulsa «Cargar servicios habituales» para empezar.</p> : (
          <ul className="divide-y divide-[#E8E4DE] rounded-2xl border border-[#E8E4DE]">
            {data.services.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{s.name} <span className="font-normal text-muted-foreground">· {s.provider}{s.plan ? ` · ${s.plan}` : ""}</span></p>
                  <p className="text-xs text-muted-foreground">{s.billingCycle === "none" ? "Sin cobro" : `${money(s.cost, s.currency)} ${CYCLE[s.billingCycle].toLowerCase()}`}{s.renewalDate ? ` · renueva ${s.renewalDate}` : ""}{s.notes ? ` · ${s.notes}` : ""}</p>
                </div>
                <Button variant="outline" className="h-8 rounded-full text-xs" onClick={() => setEditing(s)}>Editar</Button>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0 text-red-600" aria-label={`Eliminar ${s.name}`} onClick={() => { if (window.confirm(`¿Eliminar ${s.name}?`)) void run(() => api(`/api/supra/admin/services/${s.id}`, { method: "DELETE" })); }}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
        {editing && (
          <form className="mt-3 grid gap-3 rounded-2xl bg-[#F5F2EE] p-4 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { const body = JSON.stringify({ name: editing.name, provider: editing.provider, plan: editing.plan, cost: editing.cost ?? 0, currency: editing.currency, billingCycle: editing.billingCycle, renewalDate: editing.renewalDate ?? "", notes: editing.notes }); await api(editing.id ? `/api/supra/admin/services/${editing.id}` : "/api/supra/admin/services", { method: editing.id ? "PATCH" : "POST", body }); setEditing(null); }); }}>
            <Input className={FIELD} placeholder="Nombre *" aria-label="Nombre del servicio" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            <Input className={FIELD} placeholder="Proveedor" aria-label="Proveedor" value={editing.provider ?? ""} onChange={(e) => setEditing({ ...editing, provider: e.target.value })} />
            <Input className={FIELD} placeholder="Plan" aria-label="Plan" value={editing.plan ?? ""} onChange={(e) => setEditing({ ...editing, plan: e.target.value })} />
            <Input className={FIELD} type="number" step="0.01" min="0" placeholder="Costo" aria-label="Costo" value={editing.cost ?? ""} onChange={(e) => setEditing({ ...editing, cost: e.target.value === "" ? undefined : Number(e.target.value) })} />
            <select className={FIELD} aria-label="Moneda" value={editing.currency ?? "USD"} onChange={(e) => setEditing({ ...editing, currency: e.target.value })}><option>USD</option><option>CLP</option><option>EUR</option></select>
            <select className={FIELD} aria-label="Periodicidad" value={editing.billingCycle ?? "monthly"} onChange={(e) => setEditing({ ...editing, billingCycle: e.target.value as Service["billingCycle"] })}><option value="monthly">Mensual</option><option value="yearly">Anual</option><option value="none">Sin cobro</option></select>
            <label className="text-xs font-semibold md:col-span-1">Próxima renovación<Input className={`${FIELD} mt-1`} type="date" value={editing.renewalDate ?? ""} onChange={(e) => setEditing({ ...editing, renewalDate: e.target.value })} /></label>
            <Input className={`${FIELD} md:col-span-2 self-end`} placeholder="Notas" aria-label="Notas" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            <div className="flex gap-2 md:col-span-3"><Button type="submit" className="h-9 rounded-full" disabled={busy}>Guardar</Button><Button type="button" variant="ghost" className="h-9 rounded-full" onClick={() => setEditing(null)}>Cancelar</Button></div>
          </form>
        )}
      </div>
    </div>
  );
}

function FinanceTab() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const { data, isLoading } = useQuery({ queryKey: ["admin-finance", month], queryFn: () => api<{ month: string; entries: Entry[]; totals: Totals; history: Array<{ month: string; totals: Totals }> }>(`/api/supra/admin/finance?month=${month}`) });
  const [form, setForm] = useState({ kind: "expense", date: today(), amount: "", currency: "CLP", category: "", note: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await api("/api/supra/admin/finance", { method: "POST", body: JSON.stringify(form) }); setForm({ ...form, amount: "", note: "" }); if (form.date.slice(0, 7) !== month) setMonth(form.date.slice(0, 7)); refresh(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const currencies = data ? Object.keys(data.totals) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" className="h-9 w-9 rounded-full p-0" aria-label="Mes anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <p className="min-w-[10rem] text-center font-bold" data-testid="finance-month">{monthLabel(month)}</p>
          <Button variant="ghost" className="h-9 w-9 rounded-full p-0" aria-label="Mes siguiente" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2">
          <a href={`/api/supra/admin/finance/export?month=${month}`} className="inline-flex h-9 items-center rounded-full border border-[#E8E4DE] px-4 text-sm font-semibold hover:bg-[#F5F2EE]"><Download className="mr-2 h-4 w-4" />Este mes (CSV)</a>
          <a href="/api/supra/admin/finance/export" className="inline-flex h-9 items-center rounded-full border border-[#E8E4DE] px-4 text-sm font-semibold hover:bg-[#F5F2EE]"><Download className="mr-2 h-4 w-4" />Todo (CSV)</a>
        </div>
      </div>

      {isLoading || !data ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
        <>
          {currencies.length === 0 ? <p className="rounded-2xl bg-[#F5F2EE] px-4 py-3 text-sm text-muted-foreground">Sin movimientos este mes.</p> : currencies.map((cur) => { const t = data.totals[cur]!; return (
            <div key={cur} className="grid grid-cols-3 gap-3" data-testid={`totals-${cur}`}>
              <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">Ingresos ({cur})</p><p className="text-lg font-bold text-emerald-800">{money(t.income, cur)}</p></div>
              <div className="rounded-2xl bg-red-50 p-4"><p className="text-xs font-semibold text-red-700">Gastos ({cur})</p><p className="text-lg font-bold text-red-800">{money(t.expense, cur)}</p></div>
              <div className="rounded-2xl bg-[#F5F2EE] p-4"><p className="text-xs font-semibold text-muted-foreground">Balance ({cur})</p><p className={`text-lg font-bold ${t.balance < 0 ? "text-red-700" : ""}`}>{money(t.balance, cur)}</p></div>
            </div>); })}

          <form onSubmit={add} className="grid gap-3 rounded-2xl bg-[#F5F2EE] p-4 md:grid-cols-6" aria-label="Nuevo movimiento">
            <select className={FIELD} aria-label="Tipo" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="expense">Gasto</option><option value="income">Ingreso</option></select>
            <Input className={FIELD} type="date" aria-label="Fecha" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <Input className={FIELD} type="number" step="0.01" min="0" placeholder="Monto" aria-label="Monto" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <select className={FIELD} aria-label="Moneda" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option>CLP</option><option>USD</option><option>EUR</option></select>
            <Input className={FIELD} placeholder="Categoría" aria-label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input className={FIELD} placeholder="Nota" aria-label="Nota" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <div className="md:col-span-6"><Button type="submit" className="h-9 rounded-full" disabled={busy} data-testid="add-entry"><Plus className="mr-1 h-4 w-4" />Registrar movimiento</Button>{error && <span role="alert" className="ml-3 text-sm font-semibold text-red-700">{error}</span>}</div>
          </form>

          {data.entries.length > 0 && (
            <ul className="divide-y divide-[#E8E4DE] rounded-2xl border border-[#E8E4DE]" data-testid="entries">
              {data.entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">{e.date}</span>
                  <span className="min-w-0 flex-1 truncate">{e.category || (e.kind === "income" ? "Ingreso" : "Gasto")}{e.note ? <span className="text-muted-foreground"> · {e.note}</span> : null}</span>
                  <span className={`font-bold ${e.kind === "income" ? "text-emerald-700" : "text-red-700"}`}>{e.kind === "income" ? "+" : "−"}{money(e.amount, e.currency)}</span>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0 text-red-600" aria-label="Eliminar movimiento" onClick={() => { if (window.confirm("¿Eliminar este movimiento?")) void api(`/api/supra/admin/finance/${e.id}`, { method: "DELETE" }).then(refresh); }}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}

          <div className="overflow-x-auto rounded-2xl border border-[#E8E4DE]">
            <table className="w-full text-sm"><caption className="px-4 py-2 text-start text-xs font-bold text-muted-foreground">Últimos 12 meses</caption>
              <thead className="bg-[#F5F2EE]"><tr><th className="px-3 py-2 text-start">Mes</th><th className="px-3 py-2 text-end">Ingresos</th><th className="px-3 py-2 text-end">Gastos</th><th className="px-3 py-2 text-end">Balance</th></tr></thead>
              <tbody>{data.history.slice().reverse().map((h) => { const cur = Object.keys(h.totals); return (
                <tr key={h.month} className="border-t border-[#E8E4DE] align-top">
                  <td className="px-3 py-2">{monthLabel(h.month)}</td>
                  {(["income", "expense", "balance"] as const).map((k) => <td key={k} className="px-3 py-2 text-end">{cur.length ? cur.map((c) => <div key={c}>{money(h.totals[c]![k], c)}</div>) : "—"}</td>)}
                </tr>); })}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function SupraAdmin({ embedded = false }: { embedded?: boolean }) {
  const [openState, setOpen] = useState(false);
  const open = embedded || openState;
  const [tab, setTab] = useState<"services" | "finance">("services");
  return (
    <section className={`${embedded ? "" : "mb-6 "}rounded-3xl bg-white shadow-sm`} data-testid="supra-admin">
      {!embedded && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left">
          <span className="flex items-center gap-3 font-bold"><BriefcaseBusiness className="h-5 w-5 text-[#00A9A5]" />Administración: servicios y finanzas</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
      {open && (
        <div className={`space-y-4 p-4 md:p-6 ${embedded ? "" : "border-t border-[#E8E4DE]"}`}>
          <div className="flex gap-1 rounded-full bg-[#F5F2EE] p-1 md:w-fit">
            {([["services", "Servicios"], ["finance", "Ingresos y gastos"]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)} data-testid={`admin-tab-${k}`} className={`rounded-full px-5 py-2 text-sm font-bold ${tab === k ? "bg-white text-[#007f7c] shadow-sm" : "text-muted-foreground"}`}>{label}</button>
            ))}
          </div>
          {tab === "services" ? <ServicesTab /> : <FinanceTab />}
        </div>
      )}
    </section>
  );
}

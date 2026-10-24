import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CircleHelp, Headphones, Loader2, XCircle } from "lucide-react";
import { Stars } from "@/components/support-tickets";

type Status = "ok" | "warn" | "fail" | "unknown";
export type Light = "green" | "yellow" | "red" | "unknown";
export type Dashboard = {
  generatedAt: string;
  clinics: { total: number; active: number; suspended: number; payments: { upToDate: number; expiring: number; overdue: number; noRecord: number }; expiringDays: number };
  users: { total: number; active: number; blocked: number; medicos: number; administrativos: number; supra: number };
  patients: { total: number; newThisMonth: number };
  documents?: { transcribed: number; transcribedThisMonth: number };
  tickets: {
    waiting: number; attending: number; resolved: number; closed: number; pending: number; attendedTotal: number;
    openedThisMonth: number; resolvedThisMonth: number; ratingAverage: number | null; ratingCount: number; firstResponseMinutes: number | null;
  };
  services: { light: Light; checks: { key: string; label: string; status: Status; detail: string; checkedAt: string | null }[] };
  finance: { month: string; totals: Record<string, { income: number; expense: number; balance: number }> } | null;
};

const LIGHT_UI: Record<Light, { title: string; hint: string; cls: string; dot: string; Icon: typeof CheckCircle2 }> = {
  green: { title: "Todos los servicios funcionan", hint: "Sin alertas en la última revisión.", cls: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500", Icon: CheckCircle2 },
  yellow: { title: "Hay alguna alerta", hint: "Revisa el detalle: algo requiere atención.", cls: "border-amber-200 bg-amber-50 text-amber-900", dot: "bg-amber-400", Icon: AlertTriangle },
  red: { title: "Algún servicio no funciona", hint: "Al menos un servicio clave está con falla.", cls: "border-red-200 bg-red-50 text-red-800", dot: "bg-red-500", Icon: XCircle },
  unknown: { title: "Sin datos de servicios", hint: "Aún no hay una revisión automática.", cls: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400", Icon: CircleHelp },
};
const CHECK_UI: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: "Funcionando", cls: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CheckCircle2 },
  warn: { label: "Atención", cls: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  fail: { label: "Con falla", cls: "border-red-200 bg-red-50 text-red-800", Icon: XCircle },
  unknown: { label: "Sin datos", cls: "border-slate-200 bg-slate-50 text-slate-700", Icon: CircleHelp },
};

const num = (n: number) => new Intl.NumberFormat("es-CL").format(n);
const money = (n: number, currency: string) => new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(n);
function minutesText(m: number | null): string {
  if (m === null) return "—";
  if (m < 1) return "menos de 1 min";
  if (m < 60) return `${Math.round(m)} min`;
  const h = m / 60;
  return h < 24 ? `${h.toFixed(1).replace(".", ",")} h` : `${(h / 24).toFixed(1).replace(".", ",")} d`;
}
const monthName = (m: string) => { const [y, mo] = m.split("-").map(Number) as [number, number]; return new Date(y, mo - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" }); };

function Tile({ label, value, sub, testId }: { label: string; value: string; sub?: string; testId?: string }) {
  return (
    <div className="rounded-3xl border border-[#E8E4DE] bg-white p-5 shadow-sm" data-testid={testId}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Card({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="rounded-3xl border border-[#E8E4DE] bg-white p-5 shadow-sm" data-testid={testId}>
      <h3 className="mb-3 text-sm font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

// Barras finas de una sola tonalidad: el largo es la magnitud, el número va al lado en tinta normal.
function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="h-2 rounded-full bg-[#F5F2EE]"><span className="block h-2 rounded-full bg-[#00A9A5]" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="text-right font-bold tabular-nums">{num(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function SupraDashboard({ onNavigate }: { onNavigate?: (view: "support" | "admin" | "clinics") => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["supra-dashboard"], refetchInterval: 45_000, retry: false,
    queryFn: async () => {
      const response = await fetch("/api/supra/dashboard", { credentials: "same-origin" });
      if (!response.ok) throw new Error("dashboard");
      return (await response.json()) as Dashboard;
    },
  });

  if (isLoading) return <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Cargando estadísticas…</div>;
  if (isError || !data) return <p className="py-16 text-center font-medium text-red-600" role="alert">No pudimos cargar el resumen de la plataforma.</p>;

  const light = LIGHT_UI[data.services.light];
  const t = data.tickets;
  const p = data.clinics.payments;
  const currencies = data.finance ? Object.keys(data.finance.totals) : [];

  return (
    <div className="space-y-6" data-testid="supra-dashboard">
      <section className={`flex flex-col gap-4 rounded-3xl border p-5 ${light.cls}`} data-testid="traffic-light" data-light={data.services.light}>
        <div className="flex items-center gap-4">
          <span className={`h-5 w-5 shrink-0 rounded-full ${light.dot}`} aria-hidden />
          <light.Icon className="h-7 w-7 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold" data-testid="traffic-light-title">{light.title}</p>
            <p className="text-sm opacity-80">{light.hint}</p>
          </div>
          {onNavigate && <button type="button" onClick={() => onNavigate("admin")} className="shrink-0 text-sm font-bold underline">Ver detalle</button>}
        </div>
        <ul className="flex flex-wrap gap-2">
          {data.services.checks.map((c) => {
            const ui = CHECK_UI[c.status];
            return (
              <li key={c.key} title={c.detail} data-testid={`light-${c.key}`} data-status={c.status} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${ui.cls}`}>
                <ui.Icon className="h-3.5 w-3.5" aria-hidden />{c.label}: {ui.label}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Tile testId="tile-clinics" label="Clínicas" value={num(data.clinics.total)} sub={`${num(data.clinics.active)} activas · ${num(data.clinics.suspended)} suspendidas`} />
        <Tile testId="tile-users" label="Usuarios" value={num(data.users.total)} sub={`${num(data.users.medicos)} médicos · ${num(data.users.administrativos)} administrativos`} />
        <Tile testId="tile-patients" label="Pacientes" value={num(data.patients.total)} sub={`${num(data.patients.newThisMonth)} nuevos este mes`} />
        <Tile testId="tile-documents" label="Documentos transcritos" value={num(data.documents?.transcribed ?? 0)} sub={`${num(data.documents?.transcribedThisMonth ?? 0)} este mes`} />
        <Tile testId="tile-pending" label="Tickets por resolver" value={num(t.pending)} sub={`${num(t.waiting)} en espera · ${num(t.attending)} en atención`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Soporte" testId="card-support">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Atendidos (con respuesta)</dt><dd className="text-xl font-bold tabular-nums" data-testid="support-attended">{num(t.attendedTotal)}</dd></div>
            <div><dt className="text-muted-foreground">Resueltos este mes</dt><dd className="text-xl font-bold tabular-nums">{num(t.resolvedThisMonth)}</dd></div>
            <div><dt className="text-muted-foreground">Abiertos este mes</dt><dd className="text-xl font-bold tabular-nums">{num(t.openedThisMonth)}</dd></div>
            <div><dt className="text-muted-foreground">Primera respuesta (30 días)</dt><dd className="text-xl font-bold tabular-nums" data-testid="support-first-response">{minutesText(t.firstResponseMinutes)}</dd></div>
            <div className="col-span-2 flex flex-wrap items-center gap-2">
              <dt className="text-muted-foreground">Valoración promedio</dt>
              <dd className="flex items-center gap-2 font-bold" data-testid="support-rating">
                {t.ratingAverage === null ? <span className="text-muted-foreground">sin valoraciones</span> : (<><Stars value={Math.round(t.ratingAverage)} label={(n) => `${n} de 5`} size="h-4 w-4" />{t.ratingAverage.toFixed(1).replace(".", ",")} <span className="font-normal text-muted-foreground">({num(t.ratingCount)})</span></>)}
              </dd>
            </div>
          </dl>
          {onNavigate && <button type="button" onClick={() => onNavigate("support")} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#007f7c]"><Headphones className="h-4 w-4" />Ir a soporte</button>}
        </Card>

        <Card title="Clínicas por estado de pago" testId="card-payments">
          <Bars rows={[
            { label: "Al día", value: p.upToDate },
            { label: `Vencen en ${data.clinics.expiringDays} días`, value: p.expiring },
            { label: "Vencidas", value: p.overdue },
            { label: "Sin registro", value: p.noRecord },
          ]} />
          {onNavigate && <button type="button" onClick={() => onNavigate("clinics")} className="mt-4 text-sm font-bold text-[#007f7c]">Ir a clínicas</button>}
        </Card>
      </div>

      {data.finance && (
        <Card title={`Finanzas de ${monthName(data.finance.month)}`} testId="card-finance">
          {currencies.length === 0 ? <p className="text-sm text-muted-foreground">Sin movimientos este mes.</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currencies.map((cur) => { const f = data.finance!.totals[cur]!; return (
                <div key={cur} className="rounded-2xl bg-[#F5F2EE] p-4 text-sm" data-testid={`finance-${cur}`}>
                  <p className="font-bold">{cur}</p>
                  <p className="mt-1 flex justify-between"><span className="text-muted-foreground">Ingresos</span><span className="tabular-nums">{money(f.income, cur)}</span></p>
                  <p className="flex justify-between"><span className="text-muted-foreground">Gastos</span><span className="tabular-nums">{money(f.expense, cur)}</span></p>
                  <p className="flex justify-between font-bold"><span>Balance</span><span className="tabular-nums">{money(f.balance, cur)}</span></p>
                </div>); })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, CheckCircle2, CircleHelp, Headphones, XCircle, Building2, Users, UserRound, Files, Inbox,
  UserCog, BriefcaseBusiness, MessageSquarePlus, Star, Timer, MessagesSquare, AlertCircle, RotateCw, ChevronRight,
} from "lucide-react";
import {
  useGetSupraOverviewMonthly, getGetSupraOverviewMonthlyQueryKey,
  useGetSupraActivity, getGetSupraActivityQueryKey,
  useGetSupraRecentClinics, getGetSupraRecentClinicsQueryKey,
  type SupraActivityEvent, type SupraRecentClinic,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ActivityChart, type MonthPoint } from "@/components/dashboard/charts";
import {
  cardClass, Skeleton, StatCard, QuickCard, Welcome, RangeSelect, ChartLegend, quickGridClass, statGridClass,
  type QuickItem, type StatItem,
} from "@/components/dashboard/cards";
import { HOME_TEXT, timeAgo, percentChange, cumulative } from "@/lib/home-i18n";
import { VIDEO_TEXT } from "@/lib/video-i18n";

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

// Supra-control está en español.
const LANG = "es";
const HOME = HOME_TEXT.es;
const RANGES = [3, 6, 12] as const;
const SPARK_MONTHS = 6;
const monthlyParams = { months: 12 as const };
const activityParams = { limit: 8 };
const recentParams = { limit: 6 };

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
const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;

const CHART_TEXT = { chartTitle: "Actividad de la plataforma", chartPatients: "Pacientes nuevos", chartPhotos: "Fotografías", chartEmpty: "Aún sin datos en este período", chartMonth: "Mes" };

const EVENT_UI: Record<SupraActivityEvent["type"], { text: string; icon: ReactNode; tone: string }> = {
  clinic_created: { text: "Clínica creada", icon: <Building2 />, tone: "bg-blue-50 text-blue-700" },
  ticket_opened: { text: "Ticket abierto", icon: <MessageSquarePlus />, tone: "bg-violet-50 text-violet-700" },
  ticket_resolved: { text: "Ticket resuelto", icon: <CheckCircle2 />, tone: "bg-emerald-50 text-emerald-700" },
  service_alert: { text: "Alerta de servicio", icon: <AlertTriangle />, tone: "bg-amber-50 text-amber-800" },
};

function Section({ title, testId, action, children, className = "" }: { title: string; testId?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${cardClass} p-4 md:p-5 min-w-0 ${className}`} data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-bold text-foreground">{title}</h2>
        {action}
      </div>
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
        <li key={r.label} className="sd-bar-row grid items-center gap-3 text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="h-2 rounded-full bg-muted"><span className="block h-2 rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="text-right font-bold tabular-nums">{num(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

const linkButton = "h-11 gap-1 rounded-xl px-3 text-primary hover:bg-accent hover:text-primary font-semibold text-sm";

export type SupraTarget = "support" | "admin" | "clinics" | "team";

export function SupraDashboard({ userName = "", canManageUsers = false, onNavigate, onOpenClinic }: {
  userName?: string;
  /** Director: ve Equipo, Servicios y finanzas. */
  canManageUsers?: boolean;
  onNavigate?: (view: SupraTarget) => void;
  onOpenClinic?: (id: string) => void;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(6);
  const dashboard = useQuery({
    queryKey: ["supra-dashboard"], refetchInterval: 45_000, retry: false,
    queryFn: async () => {
      const response = await fetch("/api/supra/dashboard", { credentials: "same-origin" });
      if (!response.ok) throw new Error("dashboard");
      return (await response.json()) as Dashboard;
    },
  });
  const monthlyQuery = useGetSupraOverviewMonthly(monthlyParams, { query: { queryKey: getGetSupraOverviewMonthlyQueryKey(monthlyParams), retry: false } });
  const activityQuery = useGetSupraActivity(activityParams, { query: { queryKey: getGetSupraActivityQueryKey(activityParams), retry: false } });
  const recentQuery = useGetSupraRecentClinics(recentParams, { query: { queryKey: getGetSupraRecentClinicsQueryKey(recentParams), retry: false } });

  // Solo listas reales: si una respuesta no trae la lista, se trata como vacía.
  const monthly: Array<MonthPoint & { clinics: number }> = Array.isArray(monthlyQuery.data?.monthly) ? monthlyQuery.data.monthly : [];
  const events: SupraActivityEvent[] = Array.isArray(activityQuery.data?.events) ? activityQuery.data.events : [];
  const recent: SupraRecentClinic[] = Array.isArray(recentQuery.data?.clinics) ? recentQuery.data.clinics : [];
  const data = dashboard.data;
  const failed = dashboard.isError || monthlyQuery.isError || activityQuery.isError || recentQuery.isError;
  const retry = () => { void dashboard.refetch(); void monthlyQuery.refetch(); void activityQuery.refetch(); void recentQuery.refetch(); };
  const go = (view: SupraTarget) => onNavigate?.(view);

  const last = <T,>(values: T[], n: number) => values.slice(Math.max(0, values.length - n));
  const patientsCum = data && monthly.length ? cumulative(data.patients.total, monthly.map((m) => m.patients)) : [];

  const quick: QuickItem[] = [
    { key: "clinics", title: "Clínicas", desc: "Acceso, identidad y vigencia", icon: <Building2 />, tone: "bg-[#2563EB]", onClick: () => go("clinics"), testId: "supra-quick-clinics" },
    { key: "support", title: "Soporte", desc: "Tickets de las clínicas", icon: <Headphones />, tone: "bg-[#7C3AED]", onClick: () => go("support"), testId: "supra-quick-support" },
    ...(canManageUsers ? [
      { key: "team", title: "Equipo", desc: "Personas de supra-control", icon: <UserCog />, tone: "bg-[#0D9488]", onClick: () => go("team"), testId: "supra-quick-team" },
      { key: "admin", title: "Servicios y finanzas", desc: "Estado y movimientos", icon: <BriefcaseBusiness />, tone: "bg-[#64748B]", onClick: () => go("admin"), testId: "supra-quick-admin" },
    ] : []),
  ];

  const indicators: Array<StatItem & { testId: string }> = data ? [
    // Sin historial de activaciones ni de altas de usuarios o tickets: solo Pacientes lleva tendencia.
    { key: "clinics", testId: "tile-clinics", label: "Clínicas activas", sub: `${plural(data.clinics.suspended, "suspendida", "suspendidas")} · ${num(data.clinics.total)} en total`, value: data.clinics.active, change: null, spark: null, sparkColor: "", icon: <Building2 />, tone: "bg-blue-50 text-blue-600" },
    { key: "patients", testId: "tile-patients", label: "Pacientes totales", sub: `${num(data.patients.newThisMonth)} nuevos este mes`, value: data.patients.total, change: patientsCum.length > 1 ? percentChange(patientsCum.at(-1)!, patientsCum.at(-2)) : null, spark: patientsCum.length ? last(patientsCum, SPARK_MONTHS) : null, sparkColor: "#8B5CF6", icon: <UserRound />, tone: "bg-violet-50 text-violet-600" },
    { key: "users", testId: "tile-users", label: "Usuarios activos", sub: `${num(data.users.medicos)} médicos · ${num(data.users.administrativos)} administrativos`, value: data.users.active, change: null, spark: null, sparkColor: "", icon: <Users />, tone: "bg-teal-50 text-teal-700" },
    { key: "pending", testId: "tile-pending", label: "Tickets pendientes", sub: `${num(data.tickets.waiting)} en espera · ${num(data.tickets.attending)} en atención`, value: data.tickets.pending, change: null, spark: null, sparkColor: "", icon: <Inbox />, tone: "bg-orange-50 text-orange-600" },
  ] : [];

  const t = data?.tickets;
  const more: Array<StatItem & { testId: string; text?: string }> = data && t ? [
    { key: "documents", testId: "tile-documents", label: "Documentos transcritos", sub: `${num(data.documents?.transcribedThisMonth ?? 0)} este mes`, value: data.documents?.transcribed ?? 0, change: null, spark: null, sparkColor: "", icon: <Files />, tone: "bg-sky-50 text-sky-700" },
    { key: "rating", testId: "support-rating", label: "Valoración promedio", sub: t.ratingAverage === null ? "sin valoraciones" : `de 5 · ${plural(t.ratingCount, "valoración", "valoraciones")}`, value: t.ratingAverage === null ? null : Math.round(t.ratingAverage * 10) / 10, change: null, spark: null, sparkColor: "", icon: <Star />, tone: "bg-amber-50 text-amber-700" },
    { key: "first", testId: "support-first-response", label: "Primera respuesta", sub: "promedio de los últimos 30 días", value: null, text: minutesText(t.firstResponseMinutes), change: null, spark: null, sparkColor: "", icon: <Timer />, tone: "bg-indigo-50 text-indigo-600" },
    { key: "attended", testId: "support-attended", label: "Tickets atendidos", sub: `${num(t.resolvedThisMonth)} resueltos y ${num(t.openedThisMonth)} abiertos este mes`, value: t.attendedTotal, change: null, spark: null, sparkColor: "", icon: <MessagesSquare />, tone: "bg-emerald-50 text-emerald-700" },
  ] : [];

  const light = data ? LIGHT_UI[data.services.light] : null;
  const p = data?.clinics.payments;
  const currencies = data?.finance ? Object.keys(data.finance.totals) : [];

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 md:py-7 space-y-5 md:space-y-6 pb-12" data-testid="supra-dashboard">
      <Welcome title={userName ? HOME.welcome(userName) : HOME.welcomeNoName} subtitle="Resumen de la plataforma: actividad, soporte y estado de las clínicas." lang={LANG} titleTestId="supra-title" />

      {failed && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="flex-1 min-w-48 text-sm font-medium">No pudimos cargar el resumen de la plataforma.</p>
          <Button type="button" variant="outline" onClick={retry} className="h-11 gap-2 rounded-xl bg-card border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900">
            <RotateCw className="h-4 w-4" />Reintentar
          </Button>
        </div>
      )}

      {/* Accesos rápidos */}
      <section aria-labelledby="supra-quick">
        <h2 id="supra-quick" className="sr-only">Accesos rápidos</h2>
        <div className={quickGridClass(quick.length)}>
          {quick.map((item) => <QuickCard key={item.key} item={item} five={false} />)}
        </div>
      </section>

      {/* Indicadores principales */}
      <section aria-labelledby="supra-stats">
        <h2 id="supra-stats" className="sr-only">Indicadores</h2>
        {dashboard.isLoading ? (
          <div className={statGridClass(4)} aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className={`${cardClass} p-5 space-y-3`}><Skeleton className="h-12 w-12 rounded-xl" /><Skeleton className="h-7 w-20" /><Skeleton className="h-3 w-32" /></div>)}
          </div>
        ) : data && (
          <dl className={statGridClass(4)}>
            {indicators.map((item) => (
              <StatCard key={item.key} item={item} loading={false} lang={LANG} changeLabel={HOME.change} testId={item.testId} sparkTestId={`supra-spark-${item.key}`} chipTestId="supra-change" />
            ))}
          </dl>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 md:gap-5">
        {/* Actividad de la plataforma */}
        <section aria-labelledby="supra-chart" className={`${cardClass} p-4 md:p-5 min-w-0 flex flex-col`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <h2 id="supra-chart" className="font-bold text-foreground">{CHART_TEXT.chartTitle}</h2>
            <RangeSelect<(typeof RANGES)[number]> value={range} options={RANGES} onChange={setRange} label="Período del gráfico" optionLabel={HOME.lastMonths} testId="supra-range" />
          </div>
          <ChartLegend patients={CHART_TEXT.chartPatients} photos={CHART_TEXT.chartPhotos} />
          {monthlyQuery.isLoading ? <Skeleton className="min-h-[240px] w-full rounded-xl flex-1" /> : <ActivityChart data={last(monthly, range)} lang={LANG} text={CHART_TEXT} />}
        </section>

        {/* Actividad reciente: solo clínicas, tickets y servicios */}
        <section aria-labelledby="supra-activity" className={`${cardClass} p-4 md:p-5 min-w-0 flex flex-col`}>
          <h2 id="supra-activity" className="font-bold text-foreground mb-1">Actividad reciente</h2>
          {activityQuery.isLoading ? (
            <ul className="space-y-3 pt-2" aria-busy="true">
              {Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><span className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></span></li>
              ))}
            </ul>
          ) : events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-10" data-testid="supra-activity-empty">
              <span aria-hidden="true" className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mb-3"><Inbox className="w-6 h-6 text-primary/60" /></span>
              <p className="text-sm text-muted-foreground max-w-xs">Aún sin actividad. Aquí verás las clínicas nuevas, los tickets y las alertas de servicio.</p>
            </div>
          ) : (
            <ul className="-mx-2">
              {events.map((event, i) => {
                const ui = EVENT_UI[event.type];
                const target: SupraTarget | null = event.type === "clinic_created" ? "clinics" : event.type === "service_alert" ? (canManageUsers ? "admin" : null) : "support";
                const title = event.type === "service_alert" ? (event.serviceLabel ?? "Servicio") : (event.clinicName ?? "Clínica");
                const body = (
                  <>
                    <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-full bg-accent text-accent-foreground text-sm font-bold flex items-center justify-center ring-1 ring-primary/10">{title.trim().charAt(0).toUpperCase()}</span>
                    <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 ${ui.tone}`}>{ui.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground truncate">{title}</span>
                      <span className="block text-xs text-muted-foreground truncate">{ui.text}</span>
                    </span>
                    <time dateTime={event.at} className="shrink-0 text-xs text-muted-foreground">{timeAgo(event.at, LANG)}</time>
                  </>
                );
                const rowClass = "w-full min-h-11 flex items-center gap-3 rounded-xl px-2 py-2 text-start";
                return (
                  <li key={`${event.type}-${event.at}-${i}`}>
                    {target && onNavigate ? (
                      <button type="button" onClick={() => go(target)} className={`${rowClass} hover:bg-muted/70 transition-colors`} data-testid="supra-event">{body}</button>
                    ) : (
                      <div className={rowClass} data-testid="supra-event">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Clínicas recientes */}
      <Section
        title="Clínicas recientes"
        testId="supra-recent"
        action={recent.length > 0 && onNavigate && <Button type="button" variant="ghost" onClick={() => go("clinics")} className={linkButton}>Ver todas<ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>}
      >
        {recentQuery.isLoading ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => <li key={i} className="flex items-center gap-3 rounded-xl border border-border p-3"><Skeleton className="h-14 w-14 rounded-xl" /><span className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></span></li>)}
          </ul>
        ) : recent.length === 0 ? (
          <div className="px-6 py-10 text-center flex flex-col items-center" data-testid="supra-recent-empty">
            <span aria-hidden="true" className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4 ring-1 ring-border"><Building2 className="w-7 h-7 text-primary/60" /></span>
            <p className="text-lg font-semibold text-foreground">Aún no hay clínicas</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">Créalas desde la vista Clínicas.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {/* Una clínica no tiene foto: tarjeta horizontal con su logo o inicial. */}
            {recent.map((clinic) => (
              <li key={clinic.id}>
                <button
                  type="button"
                  onClick={() => onOpenClinic?.(clinic.id)}
                  className="group w-full h-full min-h-11 flex items-center gap-3.5 rounded-xl border border-border bg-card p-3 text-start transition-all hover:border-primary/40 hover:shadow-md"
                  data-testid="supra-recent-clinic"
                >
                  {clinic.logo ? (
                    <img src={clinic.logo} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1.5 ring-1 ring-border" />
                  ) : (
                    <span aria-hidden="true" className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-2xl font-bold text-primary">{clinic.name.trim().charAt(0).toUpperCase() || "C"}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground break-words leading-snug">{clinic.name}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {HOME.specialty[clinic.specialty as keyof typeof HOME.specialty] ?? clinic.specialty}
                      {clinic.plan ? ` · ${VIDEO_TEXT.es.planLabel} ${VIDEO_TEXT.es.planNames[clinic.plan]}` : ""}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{plural(clinic.patients, "paciente", "pacientes")} · <time dateTime={clinic.createdAt}>{timeAgo(clinic.createdAt, LANG)}</time></span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {data && t && light && p && (
        <>
          {/* Soporte y otros indicadores */}
          <section aria-labelledby="supra-more">
            <h2 id="supra-more" className="sr-only">Soporte y documentos</h2>
            <dl className={statGridClass(4)}>
              {more.map((item) => item.text !== undefined ? (
                <div key={item.key} className={`${cardClass} p-4 md:p-5 flex items-start gap-3.5`} data-testid={item.testId}>
                  <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl [&_svg]:h-[22px] [&_svg]:w-[22px] ${item.tone}`}>{item.icon}</span>
                  <div className="min-w-0 flex-1 flex flex-col-reverse">
                    <dt className="text-[13px] leading-snug text-muted-foreground mt-1">{item.label}<span className="block text-xs text-muted-foreground/90 mt-0.5">{item.sub}</span></dt>
                    <dd className="text-[28px] leading-none font-bold tabular-nums text-foreground">{item.text}</dd>
                  </div>
                </div>
              ) : (
                <StatCard key={item.key} item={item} loading={false} lang={LANG} changeLabel={HOME.change} testId={item.testId} sparkTestId={`supra-spark-${item.key}`} chipTestId="supra-change" />
              ))}
            </dl>
          </section>

          <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
            {/* Semáforo de servicios */}
            <section className={`${cardClass} p-4 md:p-5`} aria-labelledby="supra-services">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 id="supra-services" className="font-bold text-foreground">Estado de los servicios</h2>
                {onNavigate && canManageUsers && <Button type="button" variant="ghost" onClick={() => go("admin")} className={linkButton}>Ver detalle<ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>}
              </div>
              <div className={`flex flex-col gap-4 rounded-xl border p-4 ${light.cls}`} data-testid="traffic-light" data-light={data.services.light}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`h-4 w-4 shrink-0 rounded-full ${light.dot}`} aria-hidden />
                  <light.Icon className="h-6 w-6 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1 basis-44">
                    <p className="font-bold" data-testid="traffic-light-title">{light.title}</p>
                    <p className="text-sm opacity-80">{light.hint}</p>
                  </div>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {data.services.checks.map((c) => {
                    const ui = CHECK_UI[c.status];
                    return (
                      <li key={c.key} title={c.detail} data-testid={`light-${c.key}`} data-status={c.status} className={`flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1 text-xs font-semibold ${ui.cls}`}>
                        <ui.Icon className="h-3.5 w-3.5" aria-hidden />{c.label}: {ui.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <Section
              title="Clínicas por estado de pago"
              testId="card-payments"
              action={onNavigate && <Button type="button" variant="ghost" onClick={() => go("clinics")} className={linkButton}>Ir a clínicas<ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>}
            >
              <Bars rows={[
                { label: "Al día", value: p.upToDate },
                { label: `Vencen en ${data.clinics.expiringDays} días`, value: p.expiring },
                { label: "Vencidas", value: p.overdue },
                { label: "Sin registro", value: p.noRecord },
              ]} />
            </Section>
          </div>

          {data.finance && (
            <Section title={`Finanzas de ${monthName(data.finance.month)}`} testId="card-finance">
              {currencies.length === 0 ? <p className="text-sm text-muted-foreground">Sin movimientos este mes.</p> : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {currencies.map((cur) => { const f = data.finance!.totals[cur]!; return (
                    <div key={cur} className="rounded-xl bg-muted/70 p-4 text-sm" data-testid={`finance-${cur}`}>
                      <p className="font-bold">{cur}</p>
                      <p className="mt-1 flex justify-between"><span className="text-muted-foreground">Ingresos</span><span className="tabular-nums">{money(f.income, cur)}</span></p>
                      <p className="flex justify-between"><span className="text-muted-foreground">Gastos</span><span className="tabular-nums">{money(f.expense, cur)}</span></p>
                      <p className="flex justify-between font-bold"><span>Balance</span><span className="tabular-nums">{money(f.balance, cur)}</span></p>
                    </div>); })}
                </div>
              )}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

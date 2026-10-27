import { useState, type ReactNode } from "react";
import { UserPlus, Users, ClipboardList, Layers, UserCog, Camera, CalendarPlus, Stethoscope, ChevronRight, AlertCircle, RotateCw } from "lucide-react";
import {
  useGetLeads, getGetLeadsQueryKey,
  useGetLeadStats, getGetLeadStatsQueryKey,
  useGetClinicUsers, getGetClinicUsersQueryKey,
  type LeadSummary,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { HOME_TEXT, timeAgo, isSameMonth } from "@/lib/home-i18n";
import { STAFF_FLOW_TEXT } from "@/lib/staff-flow-i18n";
import { NAV_TEXT } from "@/lib/phases-i18n";
import { CONSULT_TEXT } from "@/lib/consult-types-i18n";

const cardShape = "rounded-2xl border shadow-[var(--cd-shadow)]";
const cardClass = `bg-card border-[hsl(var(--card-border))] ${cardShape}`;
const RECENT = 6;
const noFilters = {};

type Props = {
  userName: string;
  canManageUsers: boolean;
  canEditPhases: boolean;
  onNewPatient: () => void;
  onOpenPatients: () => void;
  onOpenReport: () => void;
  onOpenPhases: () => void;
  onOpenUsers: () => void;
  onOpenLead: (id: string) => void;
};

const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join("") || "—";

/** Miniatura del paciente: su primera foto (rendición ajustada) o sus iniciales. */
function PatientThumb({ lead }: { lead: LeadSummary }) {
  const [failed, setFailed] = useState(false);
  const base = "h-12 w-12 shrink-0 rounded-xl overflow-hidden";
  if (lead.coverPhotoId && !failed) {
    return (
      <img
        src={`/api/leads/${encodeURIComponent(lead.id)}/photos/${encodeURIComponent(lead.coverPhotoId)}`}
        alt=""
        loading="lazy"
        decoding="async"
        width={48}
        height={48}
        onError={() => setFailed(true)}
        className={`${base} object-cover bg-muted ring-1 ring-border`}
        data-testid="home-thumb"
      />
    );
  }
  return (
    <span aria-hidden="true" className={`${base} flex items-center justify-center bg-accent text-accent-foreground text-sm font-bold ring-1 ring-primary/15`} data-testid="home-initials">
      {initials(lead.name)}
    </span>
  );
}

function Skeleton({ className }: { className: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-muted ${className}`} />;
}

export function ClinicHome({ userName, canManageUsers, canEditPhases, onNewPatient, onOpenPatients, onOpenReport, onOpenPhases, onOpenUsers, onOpenLead }: Props) {
  const { t, lang } = useLanguage();
  const text = HOME_TEXT[lang];
  const consultText = CONSULT_TEXT[lang];
  const number = new Intl.NumberFormat(lang);
  const today = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  // Misma consulta (y caché) que la lista de pacientes sin filtros: sin peticiones por paciente.
  const leads = useGetLeads(noFilters, { query: { queryKey: getGetLeadsQueryKey(noFilters) } });
  const stats = useGetLeadStats({ query: { queryKey: getGetLeadStatsQueryKey() } });
  const users = useGetClinicUsers({ query: { enabled: canManageUsers, queryKey: getGetClinicUsersQueryKey() } });

  const list = leads.data?.leads ?? [];
  const loading = leads.isLoading || stats.isLoading;
  const failed = leads.isError || stats.isError;
  const retry = () => { void leads.refetch(); void stats.refetch(); if (canManageUsers) void users.refetch(); };

  const quick: Array<{ key: string; title: string; desc: string; icon: ReactNode; onClick: () => void; testId: string }> = [
    { key: "new", title: STAFF_FLOW_TEXT[lang].addPatient, desc: text.newPatientDesc, icon: <UserPlus />, onClick: onNewPatient, testId: "home-new-patient" },
    { key: "patients", title: text.patientsTitle, desc: text.patientsDesc, icon: <Users />, onClick: onOpenPatients, testId: "home-patients" },
    { key: "report", title: NAV_TEXT[lang].report, desc: text.reportDesc, icon: <ClipboardList />, onClick: onOpenReport, testId: "home-report" },
    ...(canEditPhases ? [{ key: "phases", title: t.adminPhases, desc: text.phasesDesc, icon: <Layers />, onClick: onOpenPhases, testId: "home-phases" }] : []),
    ...(canManageUsers ? [{ key: "users", title: t.adminUsers, desc: text.usersDesc, icon: <UserCog />, onClick: onOpenUsers, testId: "home-users" }] : []),
  ];

  const indicators: Array<{ key: string; label: string; value: number | undefined; pending: boolean; icon: ReactNode; tone: string }> = [
    { key: "total", label: text.totalPatients, value: stats.data?.total, pending: stats.isLoading, icon: <Users />, tone: "bg-accent text-primary" },
    { key: "photos", label: text.photos, value: leads.data ? list.reduce((sum, lead) => sum + lead.photoCount, 0) : undefined, pending: leads.isLoading, icon: <Camera />, tone: "bg-secondary text-[hsl(var(--cd-teal))]" },
    { key: "month", label: text.thisMonth, value: leads.data ? list.filter((lead) => isSameMonth(lead.createdAt)).length : undefined, pending: leads.isLoading, icon: <CalendarPlus />, tone: "bg-accent text-primary" },
    ...(canManageUsers ? [{ key: "professionals", label: text.professionals, value: users.data ? users.data.users.filter((user) => user.active).length : undefined, pending: users.isLoading, icon: <Stethoscope />, tone: "bg-secondary text-[hsl(var(--cd-teal))]" }] : []),
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"} data-testid="clinic-home">
      <header className="bg-card border-b border-border px-4 py-5 sm:px-6 md:px-10 md:py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight break-words">{userName ? text.greeting(userName) : text.greeting("").replace(/[,،，]\s*$/, "")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <time dateTime={new Date().toISOString().slice(0, 10)} className="inline-block first-letter:uppercase" data-testid="home-date">{today}</time>
          <span aria-hidden="true"> · </span>{text.subtitle}
        </p>
      </header>

      <div className="px-4 sm:px-6 md:px-10 py-5 md:py-6 space-y-6 md:space-y-8 pb-10">
        {failed && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="flex-1 min-w-48 text-sm font-medium">{text.error}</p>
            <Button type="button" variant="outline" onClick={retry} className="h-11 gap-2 rounded-xl bg-card border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900">
              <RotateCw className="h-4 w-4" />{text.retry}
            </Button>
          </div>
        )}

        {/* Accesos rápidos */}
        <section aria-labelledby="home-quick">
          <h2 id="home-quick" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{text.quickTitle}</h2>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            {quick.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                data-testid={item.testId}
                className={`group ${cardShape} min-h-11 p-3.5 sm:p-4 flex flex-col items-start gap-2.5 sm:gap-3 text-start transition-all hover:-translate-y-0.5 hover:shadow-md ${index === 0 ? "bg-primary border-primary hover:bg-primary/90" : "bg-card border-[hsl(var(--card-border))] hover:border-primary/40"}`}
              >
                <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:h-5 [&_svg]:w-5 ${index === 0 ? "bg-white/15 text-white" : "bg-accent text-primary"}`}>
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className={`block font-semibold ${index === 0 ? "text-white" : "text-foreground"}`}>{item.title}</span>
                  <span className={`sr-only sm:not-sr-only sm:block text-sm mt-0.5 ${index === 0 ? "text-white/85" : "text-muted-foreground"}`}>{item.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Indicadores: solo números que entrega la API */}
        <section aria-labelledby="home-stats">
          <h2 id="home-stats" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{text.statsTitle}</h2>
          <dl className={`grid grid-cols-2 ${indicators.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3`}>
            {indicators.map((item) => (
              <div key={item.key} className={`${cardClass} p-4 sm:p-5`} data-testid={`home-stat-${item.key}`}>
                <dt className="flex items-start gap-3 text-[11px] leading-[1.1rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 ${item.tone}`}>{item.icon}</span>
                  <span className="pt-1.5">{item.label}</span>
                </dt>
                <dd className="mt-3 text-[28px] sm:text-[32px] leading-none font-bold tabular-nums text-foreground">
                  {item.pending ? <Skeleton className="h-8 w-16" /> : item.value === undefined ? "—" : number.format(item.value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Pacientes recientes */}
        <section aria-labelledby="home-recent" className={`${cardClass} overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border">
            <h2 id="home-recent" className="font-bold text-foreground">{text.recentTitle}</h2>
            {list.length > 0 && (
              <Button type="button" variant="ghost" onClick={onOpenPatients} className="h-11 gap-1 rounded-xl px-3 text-primary hover:bg-accent hover:text-primary font-semibold">
                {text.seeAll}<ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            )}
          </div>
          {loading ? (
            <ul className="grid md:grid-cols-2 -mb-px" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="flex items-center gap-3 p-4 border-b border-border md:odd:border-e">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <span className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></span>
                </li>
              ))}
            </ul>
          ) : failed && !leads.data ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{text.error}</p>
          ) : list.length === 0 ? (
            <div className="px-6 py-12 text-center flex flex-col items-center" data-testid="home-empty">
              <span aria-hidden="true" className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4 ring-1 ring-border">
                <Users className="w-7 h-7 text-primary/60" />
              </span>
              <p className="text-lg font-semibold text-foreground">{text.emptyTitle}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">{text.emptyDesc}</p>
              <Button type="button" onClick={onNewPatient} className="mt-5 h-11 gap-2 rounded-xl px-5 font-semibold" data-testid="home-empty-new">
                <UserPlus className="h-4 w-4" />{STAFF_FLOW_TEXT[lang].addPatient}
              </Button>
            </div>
          ) : (
            <ul className="grid md:grid-cols-2 -mb-px">
              {list.slice(0, RECENT).map((lead) => (
                <li key={lead.id} className="border-b border-border md:odd:border-e">
                  <button
                    type="button"
                    onClick={() => onOpenLead(lead.id)}
                    className="w-full min-h-11 flex items-center gap-3 p-4 text-start hover:bg-muted/60 transition-colors"
                    data-testid="home-recent"
                  >
                    <PatientThumb lead={lead} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground truncate">{lead.name || "—"}</span>
                      {lead.consultTypeName && (
                        <span className="block text-xs font-semibold text-[hsl(var(--cd-teal))] truncate">
                          {lead.consultTypeName}{(lead.consultCount ?? 1) > 1 ? ` · ${consultText.consultCount(lead.consultCount ?? 1)}` : ""}
                        </span>
                      )}
                      <span className="block text-sm text-muted-foreground"><time dateTime={lead.createdAt}>{timeAgo(lead.createdAt, lang)}</time></span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

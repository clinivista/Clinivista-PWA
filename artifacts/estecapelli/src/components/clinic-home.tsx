import { useState, type ReactNode } from "react";
import {
  UserPlus, Users, ClipboardList, Layers, UserCog, Camera, CalendarPlus, Stethoscope, ChevronRight,
  AlertCircle, RotateCw, Ruler, BadgeCheck,
} from "lucide-react";
import {
  useGetLeads, getGetLeadsQueryKey,
  useGetClinicOverview, getGetClinicOverviewQueryKey,
  useGetClinicActivity, getGetClinicActivityQueryKey,
  type LeadSummary, type ClinicActivityEvent,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { HOME_TEXT, timeAgo, percentChange, cumulative } from "@/lib/home-i18n";
import { STAFF_FLOW_TEXT } from "@/lib/staff-flow-i18n";
import { NAV_TEXT } from "@/lib/phases-i18n";
import { CONSULT_TEXT } from "@/lib/consult-types-i18n";
import { ActivityChart } from "@/components/home-charts";
import { initialsOf } from "@/components/clinic-topbar";
import {
  cardClass, Skeleton, StatCard, QuickCard, Welcome, RangeSelect, ChartLegend, quickGridClass, statGridClass,
  type QuickItem, type StatItem,
} from "@/components/dashboard/cards";
const RECENT = 6;
const SPARK_MONTHS = 6;
const RANGES = [3, 6, 12] as const;
const noFilters = {};
// Se pide un año una sola vez: el selector 3/6/12 y los mini-gráficos recortan en el navegador.
const overviewParams = { months: 12 as const };
const activityParams = { limit: 8 };

type Specialty = "capilar" | "plastica" | "dermatologia";

type Props = {
  userName: string;
  canManageUsers: boolean;
  canEditPhases: boolean;
  specialty?: Specialty;
  onNewPatient: () => void;
  onOpenPatients: () => void;
  onOpenReport: () => void;
  onOpenPhases: () => void;
  onOpenUsers: () => void;
  onOpenLead: (id: string) => void;
};

const photoUrl = (leadId: string, photoId: string) => `/api/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photoId)}`;

/** Foto de portada del paciente (coverPhotoId) o sus iniciales. Solo personal de la clínica ve esta pantalla. */
function PatientPhoto({ lead, className, initialsClass, size }: { lead: Pick<LeadSummary, "id" | "name" | "coverPhotoId">; className: string; initialsClass: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (lead.coverPhotoId && !failed) {
    return (
      <img
        src={photoUrl(lead.id, lead.coverPhotoId)}
        alt=""
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={`${className} object-cover bg-muted`}
        data-testid="home-thumb"
      />
    );
  }
  return (
    <span aria-hidden="true" className={`${className} ${initialsClass} flex items-center justify-center font-bold`} data-testid="home-initials">
      {initialsOf(lead.name)}
    </span>
  );
}

const EVENT_STYLE: Record<ClinicActivityEvent["type"], { icon: ReactNode; tone: string }> = {
  photos: { icon: <Camera />, tone: "bg-blue-50 text-blue-700" },
  patient: { icon: <UserPlus />, tone: "bg-violet-50 text-violet-700" },
  measured: { icon: <Ruler />, tone: "bg-teal-50 text-teal-700" },
  discharged: { icon: <BadgeCheck />, tone: "bg-emerald-50 text-emerald-700" },
};

export function ClinicHome({ userName, canManageUsers, canEditPhases, specialty, onNewPatient, onOpenPatients, onOpenReport, onOpenPhases, onOpenUsers, onOpenLead }: Props) {
  const { t, lang } = useLanguage();
  const text = HOME_TEXT[lang];
  const consultText = CONSULT_TEXT[lang];
  const number = new Intl.NumberFormat(lang);
  const [range, setRange] = useState<(typeof RANGES)[number]>(6);

  // Misma consulta (y caché) que la lista de pacientes sin filtros; las cifras salen de
  // agregados del servidor, nunca de contar en el navegador.
  const leads = useGetLeads(noFilters, { query: { queryKey: getGetLeadsQueryKey(noFilters) } });
  const overview = useGetClinicOverview(overviewParams, { query: { queryKey: getGetClinicOverviewQueryKey(overviewParams) } });
  const activity = useGetClinicActivity(activityParams, { query: { queryKey: getGetClinicActivityQueryKey(activityParams) } });

  const list = leads.data?.leads ?? [];
  const byId = new Map(list.map((lead) => [lead.id, lead]));
  const failed = leads.isError || overview.isError || activity.isError;
  const retry = () => { void leads.refetch(); void overview.refetch(); void activity.refetch(); };

  const monthly = overview.data?.monthly ?? [];
  const totals = overview.data?.totals;
  const last = <T,>(values: T[], n: number) => values.slice(Math.max(0, values.length - n));
  const patientsCum = totals ? cumulative(totals.patients, monthly.map((m) => m.patients)) : [];
  const photosCum = totals ? cumulative(totals.photos, monthly.map((m) => m.photos)) : [];
  const newPerMonth = monthly.map((m) => m.patients);
  const at = (values: number[], fromEnd: number) => values[values.length - 1 - fromEnd];

  const quick: QuickItem[] = [
    { key: "new", title: STAFF_FLOW_TEXT[lang].addPatient, desc: text.newPatientDesc, icon: <UserPlus />, tone: "bg-[#2563EB]", onClick: onNewPatient, testId: "home-new-patient" },
    { key: "patients", title: text.patientsTitle, desc: text.patientsDesc, icon: <Users />, tone: "bg-[#7C3AED]", onClick: onOpenPatients, testId: "home-patients" },
    { key: "report", title: NAV_TEXT[lang].report, desc: text.reportDesc, icon: <ClipboardList />, tone: "bg-[#0D9488]", onClick: onOpenReport, testId: "home-report" },
    ...(canEditPhases ? [{ key: "phases", title: t.adminPhases, desc: text.phasesDesc, icon: <Layers />, tone: "bg-[#64748B]", onClick: onOpenPhases, testId: "home-phases" }] : []),
    ...(canManageUsers ? [{ key: "users", title: t.adminUsers, desc: text.usersDesc, icon: <UserCog />, tone: "bg-[#4F46E5]", onClick: onOpenUsers, testId: "home-users" }] : []),
  ];

  const indicators: StatItem[] = [
    { key: "total", label: text.totalPatients, value: totals?.patients, change: totals ? percentChange(at(patientsCum, 0)!, at(patientsCum, 1)) : null, spark: last(patientsCum, SPARK_MONTHS), sparkColor: "#2563EB", icon: <Users />, tone: "bg-blue-50 text-blue-600" },
    { key: "photos", label: text.photos, value: totals?.photos, change: totals ? percentChange(at(photosCum, 0)!, at(photosCum, 1)) : null, spark: last(photosCum, SPARK_MONTHS), sparkColor: "#8B5CF6", icon: <Camera />, tone: "bg-violet-50 text-violet-600" },
    { key: "month", label: text.thisMonth, value: totals?.thisMonth, change: totals ? percentChange(totals.thisMonth, at(newPerMonth, 1)) : null, spark: last(newPerMonth, SPARK_MONTHS), sparkColor: "#0D9488", icon: <CalendarPlus />, tone: "bg-teal-50 text-teal-700" },
    // Sin historial de altas y bajas de usuarios: ni variación ni mini-gráfico.
    ...(canManageUsers ? [{ key: "professionals", label: text.professionals, value: totals?.activeProfessionals, change: null, spark: null, sparkColor: "", icon: <Stethoscope />, tone: "bg-orange-50 text-orange-600" }] : []),
  ];

  const events = activity.data?.events ?? [];
  const eventText = (event: ClinicActivityEvent) =>
    event.type === "photos" ? text.evPhotos(event.count) : event.type === "patient" ? text.evPatient : event.type === "measured" ? text.evMeasured : text.evDischarged;
  const seeAllButton = (label: string) => (
    <Button type="button" variant="ghost" onClick={onOpenPatients} className="h-11 gap-1 rounded-xl px-3 text-primary hover:bg-accent hover:text-primary font-semibold text-sm">
      {label}<ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
    </Button>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"} data-testid="clinic-home">
      <div className="px-4 sm:px-6 md:px-8 py-6 md:py-7 space-y-5 md:space-y-6 pb-12">
        {/* Bienvenida */}
        <Welcome title={userName ? text.welcome(userName) : text.welcomeNoName} subtitle={text.subtitle} lang={lang} />

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
          <h2 id="home-quick" className="sr-only">{text.quickTitle}</h2>
          <div className={quickGridClass(quick.length)}>
            {quick.map((item) => <QuickCard key={item.key} item={item} five={quick.length === 5} />)}
          </div>
        </section>

        {/* Indicadores */}
        <section aria-labelledby="home-stats">
          <h2 id="home-stats" className="sr-only">{text.statsTitle}</h2>
          <dl className={statGridClass(indicators.length)}>
            {indicators.map((item) => (
              <StatCard key={item.key} item={item} loading={overview.isLoading} lang={lang} changeLabel={text.change} testId={`home-stat-${item.key}`} sparkTestId={`home-spark-${item.key}`} />
            ))}
          </dl>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 md:gap-5">
          {/* Actividad fotográfica */}
          <section aria-labelledby="home-chart" className={`${cardClass} p-4 md:p-5 min-w-0 flex flex-col`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h2 id="home-chart" className="font-bold text-foreground">{text.chartTitle}</h2>
              <RangeSelect<(typeof RANGES)[number]> value={range} options={RANGES} onChange={setRange} label={text.chartRange} optionLabel={text.lastMonths} testId="home-range" />
            </div>
            <ChartLegend patients={text.chartPatients} photos={text.chartPhotos} />
            {overview.isLoading ? <Skeleton className="min-h-[240px] w-full rounded-xl flex-1" /> : <ActivityChart data={last(monthly, range)} lang={lang} text={text} />}
          </section>

          {/* Actividad reciente */}
          <section aria-labelledby="home-activity" className={`${cardClass} p-4 md:p-5 min-w-0 flex flex-col`}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 id="home-activity" className="font-bold text-foreground">{text.activityTitle}</h2>
              {events.length > 0 && seeAllButton(text.seeAllActivity)}
            </div>
            {activity.isLoading ? (
              <ul className="space-y-3 pt-2" aria-busy="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <li key={i} className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><span className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></span></li>
                ))}
              </ul>
            ) : events.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-10" data-testid="home-activity-empty">
                <span aria-hidden="true" className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mb-3"><Camera className="w-6 h-6 text-primary/60" /></span>
                <p className="text-sm text-muted-foreground max-w-xs">{text.activityEmpty}</p>
              </div>
            ) : (
              <ul className="-mx-2">
                {events.map((event, i) => {
                  const lead = byId.get(event.leadId);
                  const style = EVENT_STYLE[event.type];
                  return (
                    <li key={`${event.type}-${event.leadId}-${event.at}-${i}`}>
                      <button type="button" onClick={() => onOpenLead(event.leadId)} className="w-full min-h-11 flex items-center gap-3 rounded-xl px-2 py-2 text-start hover:bg-muted/70 transition-colors" data-testid="home-event">
                        <PatientPhoto lead={lead ?? { id: event.leadId, name: event.leadName, coverPhotoId: null }} size={40} className="h-10 w-10 shrink-0 rounded-full" initialsClass="bg-accent text-accent-foreground text-xs ring-1 ring-primary/10" />
                        <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 ${style.tone}`}>{style.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground truncate">{event.leadName || "—"}</span>
                          <span className="block text-xs text-muted-foreground truncate">{eventText(event)}</span>
                        </span>
                        <time dateTime={event.at} className="shrink-0 text-xs text-muted-foreground">{timeAgo(event.at, lang)}</time>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Pacientes recientes */}
        <section aria-labelledby="home-recent" className={`${cardClass} p-4 md:p-5`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 id="home-recent" className="font-bold text-foreground">{text.recentTitle}</h2>
            {list.length > 0 && seeAllButton(text.seeAll)}
          </div>
          {leads.isLoading ? (
            <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="rounded-xl border border-border overflow-hidden"><Skeleton className="aspect-[4/3] w-full rounded-none" /><span className="block p-3 space-y-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></span></li>
              ))}
            </ul>
          ) : leads.isError && !leads.data ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{text.error}</p>
          ) : list.length === 0 ? (
            <div className="px-6 py-10 text-center flex flex-col items-center" data-testid="home-empty">
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
            <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {list.slice(0, RECENT).map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => onOpenLead(lead.id)}
                    className="group w-full h-full flex flex-col rounded-xl border border-border bg-card overflow-hidden text-start transition-all hover:border-primary/40 hover:shadow-md"
                    data-testid="home-recent"
                  >
                    <PatientPhoto lead={lead} size={240} className="aspect-[4/3] w-full" initialsClass="bg-gradient-to-br from-accent to-secondary text-primary text-2xl" />
                    <span className="flex items-center gap-2 p-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground truncate">{lead.name || "—"}</span>
                        <span className="block text-xs text-muted-foreground truncate">
                          {lead.consultTypeName
                            ? `${lead.consultTypeName}${(lead.consultCount ?? 1) > 1 ? ` · ${consultText.consultCount(lead.consultCount ?? 1)}` : ""}`
                            : specialty ? text.specialty[specialty] : ""}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5"><time dateTime={lead.createdAt}>{timeAgo(lead.createdAt, lang)}</time></span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                    </span>
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

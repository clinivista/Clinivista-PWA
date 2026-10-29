import { AlertTriangle, CalendarClock, Clock3, Database, FileText, Gauge, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage, type LangCode } from "@/lib/language";
import { DATE_LOCALES } from "@/lib/phases-i18n";
import { VIDEO_TEXT } from "@/lib/video-i18n";
import { PLAN_COUNTER_TEXT, fillPlan, type PlanCounterText } from "@/lib/plan-counter-i18n";
import { meters, planAlerts, usePlanStatus, type Meter, type MeterKey, type PlanAlert, type PlanStatus } from "@/lib/plan-status";
import { cardClass } from "@/components/dashboard/cards";

const TIME_ZONE = "America/Santiago";

const formatDate = (iso: string, lang: LangCode) =>
  new Date(iso).toLocaleDateString(DATE_LOCALES[lang], { year: "numeric", month: "long", day: "numeric", timeZone: TIME_ZONE });

const hoursOf = (minutes: number, lang: LangCode) => new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(minutes / 60);

function meterLabel(key: MeterKey, text: PlanCounterText): string {
  return key === "patients" ? text.patients : key === "storage" ? text.storage : text.transcriptions;
}

function meterWhat(key: MeterKey, text: PlanCounterText): string {
  return key === "patients" ? text.whatPatients : key === "storage" ? text.whatStorage : text.whatTranscriptions;
}

function amount(meter: Meter, value: number, lang: LangCode): string {
  const digits = meter.key === "storage" ? (value >= 10 ? 0 : 1) : 0;
  const formatted = new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(value);
  return meter.key === "storage" ? `${formatted} GB` : formatted;
}

const METER_ICON: Record<MeterKey, typeof Users> = { patients: Users, storage: Database, transcriptions: FileText };

function MeterRow({ meter, text, lang }: { meter: Meter; text: PlanCounterText; lang: LangCode }) {
  const Icon = METER_ICON[meter.key];
  const ratio = meter.ratio;
  const percent = ratio === null ? 0 : Math.min(100, Math.round(ratio * 100));
  const tone = ratio === null ? "bg-primary/60" : ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary";
  const label = meterLabel(meter.key, text);
  const summary = meter.limit > 0
    ? fillPlan(text.usedOf, { used: amount(meter, meter.used, lang), limit: amount(meter, meter.limit, lang) })
    : `${amount(meter, meter.used, lang)} · ${text.unlimited}`;
  return (
    <li className="flex flex-col gap-1.5" data-testid={`plan-meter-${meter.key}`}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-semibold text-foreground"><Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{label}</span>
        <span className="tabular-nums text-muted-foreground" dir="ltr">{summary}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={meter.limit > 0 ? 100 : undefined}
        aria-valuenow={meter.limit > 0 ? percent : undefined}
        aria-valuetext={summary}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: meter.limit > 0 ? `${percent}%` : "100%", opacity: meter.limit > 0 ? 1 : 0.25 }} />
      </div>
    </li>
  );
}

/** Tarjeta «Mi plan» del Inicio: plan, uso del mes, horas y estado de la suscripción. */
export function PlanCounterCard() {
  const { lang } = useLanguage();
  const { data } = usePlanStatus();
  if (!data) return null;
  const text = PLAN_COUNTER_TEXT[lang];
  const planName = VIDEO_TEXT[lang].planNames[data.plan];
  const hasHours = data.hours.includedMinutes + data.hours.purchasedMinutes + data.hours.adjustMinutes > 0 || data.hours.usedMinutes > 0;
  const totalMinutes = data.hours.includedMinutes + data.hours.purchasedMinutes + data.hours.adjustMinutes;
  return (
    <section aria-labelledby="home-plan" className={`${cardClass} p-4 md:p-5 min-w-0`} data-testid="plan-counter">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="home-plan" className="flex items-center gap-2 font-bold text-foreground"><Gauge className="h-4 w-4 text-primary" aria-hidden="true" />{text.title}</h2>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground" data-testid="plan-counter-plan">{fillPlan(text.planOf, { plan: planName })}</span>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {meters(data).map((meter) => <MeterRow key={meter.key} meter={meter} text={text} lang={lang} />)}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3 text-sm text-muted-foreground">
        {hasHours && (
          <p className="flex items-center gap-2" data-testid="plan-counter-hours">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            <span><span className="font-semibold text-foreground">{text.hours}:</span> {fillPlan(text.hoursLeft, { h: hoursOf(data.hours.balanceMinutes, lang) })} · {fillPlan(text.hoursDetail, { used: hoursOf(data.hours.usedMinutes, lang), total: hoursOf(totalMinutes, lang) })}</span>
          </p>
        )}
        <p className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          <span>{data.billing.paidUntil ? fillPlan(text.paidUntil, { date: formatDate(data.billing.paidUntil, lang) }) : text.noPayment}</span>
        </p>
      </div>
    </section>
  );
}

function alertText(alert: PlanAlert, status: PlanStatus, text: PlanCounterText, lang: LangCode): { message: string; severe: boolean } {
  if (alert.kind === "full") return { message: fillPlan(text.fullLimit, { what: meterWhat(alert.meter, text) }), severe: true };
  if (alert.kind === "near") return { message: fillPlan(text.nearLimit, { what: meterWhat(alert.meter, text) }), severe: false };
  if (alert.kind === "pending") {
    const plan = VIDEO_TEXT[lang].planNames[status.pendingPlan ?? status.plan];
    return { message: fillPlan(text.pendingPlan, { plan, date: status.pendingPlanFrom ? formatDate(status.pendingPlanFrom, lang) : "" }), severe: false };
  }
  const date = status.billing.paidUntil ? formatDate(status.billing.paidUntil, lang) : "";
  if (alert.stage === "aviso") return { message: fillPlan(text.stageAviso, { date }), severe: false };
  if (alert.stage === "gracia") return { message: fillPlan(text.stageGracia, { date }), severe: true };
  return { message: text.stageLectura, severe: true };
}

/** Franja de avisos bajo la barra superior: cerca o en el límite, cobro por vencer y cambio de plan programado. */
export function PlanNotice({ onContact }: { onContact?: () => void }) {
  const { lang } = useLanguage();
  const { data } = usePlanStatus();
  if (!data) return null;
  const alerts = planAlerts(data);
  if (alerts.length === 0) return null;
  const text = PLAN_COUNTER_TEXT[lang];
  const severe = alerts.some((alert) => alertText(alert, data, text, lang).severe);
  return (
    <div
      role="status"
      aria-label={text.notice}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={`flex items-start gap-3 border-b px-4 py-3 text-sm sm:px-6 md:px-8 ${severe ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
      data-testid="plan-notice"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <ul className="min-w-0 flex-1 space-y-1">
        {alerts.map((alert, index) => <li key={`${alert.kind}-${index}`}>{alertText(alert, data, text, lang).message}</li>)}
      </ul>
      {onContact && <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full bg-card" onClick={onContact}>{text.contact}</Button>}
    </div>
  );
}

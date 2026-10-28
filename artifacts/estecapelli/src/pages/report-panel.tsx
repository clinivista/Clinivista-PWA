import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, FileText, Loader2, Mail, Send, Stethoscope } from "lucide-react";
import {
  getGetClinicReportQueryKey,
  useGetClinicReport,
  useSendClinicReport,
  useUpdateClinicReport,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { REPORT_LOCALE, REPORT_PANEL_TEXT } from "@/lib/report-panel-i18n";

const SELECT = "h-10 rounded-full bg-[#F5F2EE] px-4 text-sm font-semibold disabled:opacity-60";

/** «hoy», «ayer», «hace 3 días»… en el idioma de la persona. */
const waiting = (days: number, locale: string) => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-days, "day");
/** Nombres de los días (domingo = 0) en el idioma de la persona; el 7 de enero de 2024 fue domingo. */
const weekdayNames = (locale: string) =>
  Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + index))));
const splitEmails = (text: string) => text.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);

function errorText(error: unknown, fallback: string): string {
  const data = (error as { data?: { error?: string } } | null)?.data;
  return data?.error ?? fallback;
}

export function ReportPanel({ onOpenLead }: { onOpenLead: (leadId: string) => void }) {
  const { toast } = useToast();
  const { lang } = useLanguage();
  const x = REPORT_PANEL_TEXT[lang];
  const locale = REPORT_LOCALE[lang];
  const FREQUENCIES: Array<{ value: "daily" | "weekly" | "monthly"; label: string }> = [
    { value: "daily", label: x.freqDaily },
    { value: "weekly", label: x.freqWeekly },
    { value: "monthly", label: x.freqMonthly },
  ];
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetClinicReport({ query: { queryKey: getGetClinicReportQueryKey() } });
  const update = useUpdateClinicReport();
  const send = useSendClinicReport();

  const [enabled, setEnabled] = useState(false);
  const [emails, setEmails] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [weekday, setWeekday] = useState(1);
  const [hour, setHour] = useState(8);
  const [skipWhenEmpty, setSkipWhenEmpty] = useState(true);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.config.enabled);
    setEmails(data.config.recipients.join("\n"));
    setFrequency(data.config.frequency);
    setWeekday(data.config.weekday);
    setHour(data.config.hour);
    setSkipWhenEmpty(data.config.skipWhenEmpty);
  }, [data]);

  if (isLoading || !data) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  const canEdit = data.canEdit;

  const save = () =>
    update.mutate(
      { data: { enabled, recipients: splitEmails(emails), frequency, weekday, hour, skipWhenEmpty } },
      {
        onSuccess: (saved) => {
          queryClient.setQueryData(getGetClinicReportQueryKey(), saved);
          toast({ title: x.savedToast });
        },
        onError: (error) => toast({ variant: "destructive", title: x.saveFailTitle, description: errorText(error, x.saveFailDesc) }),
      },
    );

  const sendNow = () =>
    send.mutate(undefined, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getGetClinicReportQueryKey() });
        toast({ title: x.sentTitle, description: (result.sent === 1 ? x.sentOne : x.sentMany).replace("{n}", String(result.sent)) });
      },
      onError: (error) => toast({ variant: "destructive", title: x.sendFailTitle, description: errorText(error, x.tryAgain) }),
    });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-10" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight">{x.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {x.subtitle}
            </p>
          </div>
          {/* El mismo listado en PDF (uso interno), con los resultados listos aún sin enviar aparte. No envía nada. */}
          <Button asChild variant="outline" className="rounded-full">
            <a href="/api/clinic/report/pdf" target="_blank" rel="noreferrer" data-testid="report-pdf"><FileText className="w-4 h-4 me-2" />{x.pdf}</a>
          </Button>
        </header>

        <section className="rounded-[1.5rem] bg-white shadow-sm p-4 sm:p-5" aria-label={x.pendingAria}>
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-5 h-5 text-primary" />
            <h2 className="font-bold">{x.pendingTitle} ({data.pending.length})</h2>
          </div>
          {data.pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{x.none}</p>
          ) : (
            <ul className="divide-y divide-[#E8E4DE]">
              {data.pending.map((patient) => (
                <li key={patient.leadId} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{patient.name || x.noName}</p>
                    <p className="text-xs text-muted-foreground">
                      {patient.documentId ? `${patient.documentId} · ` : ""}{x.waitingWord} {waiting(patient.waitingDays, locale)}
                    </p>
                  </div>
                  <Button size="sm" className="rounded-full" onClick={() => onOpenLead(patient.leadId)}>
                    {x.diagnose}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[1.5rem] bg-white shadow-sm p-4 sm:p-5 flex flex-col gap-4" aria-label={x.scheduleAria}>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h2 className="font-bold">{x.scheduleTitle}</h2>
          </div>
          {!canEdit && (
            <p className="text-xs text-muted-foreground">{x.onlyLegal}</p>
          )}
          {!data.mailConfigured && (
            <p className="text-xs rounded-xl bg-amber-50 text-amber-800 p-3">{x.noMail}</p>
          )}

          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="w-4 h-4" checked={enabled} disabled={!canEdit} onChange={(event) => setEnabled(event.target.checked)} />
            {x.autoSend}
          </label>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-emails" className="text-sm font-semibold flex items-center gap-1.5"><Mail className="w-4 h-4" /> {x.recipients}</label>
            <textarea
              id="report-emails"
              rows={3}
              value={emails}
              disabled={!canEdit}
              onChange={(event) => setEmails(event.target.value)}
              placeholder={"direccion@clinica.cl\nagenda@clinica.cl"}
              className="rounded-2xl bg-[#F5F2EE] p-3 text-sm disabled:opacity-60"
            />
            <p className="text-xs text-muted-foreground">{x.recipientsHint}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-frequency" className="text-sm font-semibold">{x.frequency}</label>
              <select id="report-frequency" className={SELECT} value={frequency} disabled={!canEdit} onChange={(event) => setFrequency(event.target.value as typeof frequency)}>
                {FREQUENCIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {frequency === "weekly" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="report-weekday" className="text-sm font-semibold">{x.day}</label>
                <select id="report-weekday" className={SELECT} value={weekday} disabled={!canEdit} onChange={(event) => setWeekday(Number(event.target.value))}>
                  {weekdayNames(locale).map((name, index) => <option key={name} value={index}>{name}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-hour" className="text-sm font-semibold">{x.hour}</label>
              <select id="report-hour" className={SELECT} value={hour} disabled={!canEdit} onChange={(event) => setHour(Number(event.target.value))}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="w-4 h-4" checked={skipWhenEmpty} disabled={!canEdit} onChange={(event) => setSkipWhenEmpty(event.target.checked)} />
            {x.skipEmpty}
          </label>

          {data.config.lastSentAt && (
            <p className="text-xs text-muted-foreground">
              {x.lastSent}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(data.config.lastSentAt))}
            </p>
          )}
          {data.config.lastError && (
            <p role="alert" className="text-xs rounded-xl bg-red-50 text-red-700 p-3">{x.lastFailed}: {data.config.lastError}</p>
          )}

          {canEdit && (
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-full" onClick={save} disabled={update.isPending}>
                {update.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}{x.save}
              </Button>
              <Button variant="outline" className="rounded-full" onClick={sendNow} disabled={send.isPending || data.config.recipients.length === 0}>
                {send.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Send className="w-4 h-4 me-2" />}{x.sendNow}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Mail, Send, Stethoscope } from "lucide-react";
import {
  getGetClinicReportQueryKey,
  useGetClinicReport,
  useSendClinicReport,
  useUpdateClinicReport,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FREQUENCIES: Array<{ value: "daily" | "weekly" | "monthly"; label: string }> = [
  { value: "daily", label: "Todos los días" },
  { value: "weekly", label: "Una vez por semana" },
  { value: "monthly", label: "Una vez al mes (el día 1)" },
];
const SELECT = "h-10 rounded-full bg-[#F5F2EE] px-4 text-sm font-semibold disabled:opacity-60";

const waiting = (days: number) => (days === 0 ? "hoy" : days === 1 ? "hace 1 día" : `hace ${days} días`);
const splitEmails = (text: string) => text.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);

function errorText(error: unknown, fallback: string): string {
  const data = (error as { data?: { error?: string } } | null)?.data;
  return data?.error ?? fallback;
}

export function ReportPanel({ onOpenLead }: { onOpenLead: (leadId: string) => void }) {
  const { toast } = useToast();
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
          toast({ title: "Configuración guardada" });
        },
        onError: (error) => toast({ variant: "destructive", title: "No se pudo guardar", description: errorText(error, "Revisa los datos e inténtalo de nuevo.") }),
      },
    );

  const sendNow = () =>
    send.mutate(undefined, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getGetClinicReportQueryKey() });
        toast({ title: "Informe enviado", description: `Se envió a ${result.sent} ${result.sent === 1 ? "correo" : "correos"}.` });
      },
      onError: (error) => toast({ variant: "destructive", title: "No se pudo enviar", description: errorText(error, "Inténtalo de nuevo.") }),
    });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-10">
      <div className="mx-auto max-w-3xl flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight">Informe de pendientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pacientes con la pre-evaluación completa que todavía esperan el diagnóstico del médico.
          </p>
        </header>

        <section className="rounded-[1.5rem] bg-white shadow-sm p-4 sm:p-5" aria-label="Pacientes pendientes de diagnóstico">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope className="w-5 h-5 text-primary" />
            <h2 className="font-bold">Pendientes de diagnóstico ({data.pending.length})</h2>
          </div>
          {data.pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hay pacientes pendientes. 🎉</p>
          ) : (
            <ul className="divide-y divide-[#E8E4DE]">
              {data.pending.map((patient) => (
                <li key={patient.leadId} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{patient.name || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground">
                      {patient.documentId ? `${patient.documentId} · ` : ""}esperando {waiting(patient.waitingDays)}
                    </p>
                  </div>
                  <Button size="sm" className="rounded-full" onClick={() => onOpenLead(patient.leadId)}>
                    Diagnosticar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[1.5rem] bg-white shadow-sm p-4 sm:p-5 flex flex-col gap-4" aria-label="Envío periódico del informe">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h2 className="font-bold">Envío periódico por correo</h2>
          </div>
          {!canEdit && (
            <p className="text-xs text-muted-foreground">Solo el representante legal de la clínica puede cambiar esta configuración.</p>
          )}
          {!data.mailConfigured && (
            <p className="text-xs rounded-xl bg-amber-50 text-amber-800 p-3">El envío de correos no está configurado en el servidor, así que el informe no podrá enviarse todavía.</p>
          )}

          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="w-4 h-4" checked={enabled} disabled={!canEdit} onChange={(event) => setEnabled(event.target.checked)} />
            Enviar el informe automáticamente
          </label>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-emails" className="text-sm font-semibold flex items-center gap-1.5"><Mail className="w-4 h-4" /> Correos que lo reciben</label>
            <textarea
              id="report-emails"
              rows={3}
              value={emails}
              disabled={!canEdit}
              onChange={(event) => setEmails(event.target.value)}
              placeholder={"direccion@clinica.cl\nagenda@clinica.cl"}
              className="rounded-2xl bg-[#F5F2EE] p-3 text-sm disabled:opacity-60"
            />
            <p className="text-xs text-muted-foreground">Uno por línea o separados por coma. Máximo 5.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-frequency" className="text-sm font-semibold">Periodicidad</label>
              <select id="report-frequency" className={SELECT} value={frequency} disabled={!canEdit} onChange={(event) => setFrequency(event.target.value as typeof frequency)}>
                {FREQUENCIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            {frequency === "weekly" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="report-weekday" className="text-sm font-semibold">Día</label>
                <select id="report-weekday" className={SELECT} value={weekday} disabled={!canEdit} onChange={(event) => setWeekday(Number(event.target.value))}>
                  {WEEKDAYS.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-hour" className="text-sm font-semibold">Hora (Chile)</label>
              <select id="report-hour" className={SELECT} value={hour} disabled={!canEdit} onChange={(event) => setHour(Number(event.target.value))}>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="w-4 h-4" checked={skipWhenEmpty} disabled={!canEdit} onChange={(event) => setSkipWhenEmpty(event.target.checked)} />
            No enviarlo cuando no haya pacientes pendientes
          </label>

          {data.config.lastSentAt && (
            <p className="text-xs text-muted-foreground">
              Último envío: {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(data.config.lastSentAt))}
            </p>
          )}
          {data.config.lastError && (
            <p role="alert" className="text-xs rounded-xl bg-red-50 text-red-700 p-3">El último intento falló: {data.config.lastError}</p>
          )}

          {canEdit && (
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-full" onClick={save} disabled={update.isPending}>
                {update.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Guardar configuración
              </Button>
              <Button variant="outline" className="rounded-full" onClick={sendNow} disabled={send.isPending || data.config.recipients.length === 0}>
                {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Enviar ahora
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

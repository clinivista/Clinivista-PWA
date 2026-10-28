import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Loader2 } from "lucide-react";
import type { LeadPhase } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { ATTENTION_TEXT } from "@/lib/attention-i18n";
import { refreshLeadViews } from "@/lib/phases-i18n";

const todayIso = () => new Date().toLocaleDateString("en-CA");

/** Fecha (obligatoria) e ID de la agenda de la clínica de la atención de una fase, desde el diagnóstico. */
export function PhaseAttention({ leadId, phase, readOnly = false }: { leadId: string; phase: LeadPhase; readOnly?: boolean }) {
  const { lang } = useLanguage();
  const a = ATTENTION_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const saved = phase.attention;
  const [date, setDate] = useState(saved?.date ?? "");
  const [agendaId, setAgendaId] = useState(saved?.agendaId ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDate(saved?.date ?? ""); setAgendaId(saved?.agendaId ?? ""); }, [saved?.date, saved?.agendaId]);
  const dirty = date !== (saved?.date ?? "") || agendaId.trim() !== (saved?.agendaId ?? "");

  const save = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}/phases/${encodeURIComponent(phase.id)}/attention`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, agendaId: agendaId.trim() }),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error ?? "");
      }
      toast({ title: a.saved });
      await refreshLeadViews(queryClient);
    } catch (error) {
      toast({ variant: "destructive", title: a.cantSave, description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl bg-[#F5F2EE] p-3" data-testid={`attention-${phase.id}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold text-foreground"><CalendarCheck className="w-4 h-4 text-primary" />{a.title}</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="w-full min-w-0 sm:w-48">
          <label htmlFor={`attention-date-${phase.id}`} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{a.dateLabel}</label>
          <Input id={`attention-date-${phase.id}`} type="date" max={todayIso()} value={date} disabled={readOnly || busy} onChange={(event) => setDate(event.target.value)} className="h-10 w-full min-w-0 max-w-full rounded-full bg-white appearance-none [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em] [&::-webkit-datetime-edit]:p-0" />
        </div>
        <div className="min-w-0 w-full sm:w-auto sm:min-w-[14rem] sm:flex-1">
          <label htmlFor={`attention-id-${phase.id}`} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{a.idLabel}</label>
          <Input id={`attention-id-${phase.id}`} value={agendaId} maxLength={60} placeholder={a.idPlaceholder} disabled={readOnly || busy} onChange={(event) => setAgendaId(event.target.value)} className="h-10 w-full min-w-0 rounded-full bg-white" />
        </div>
        {!readOnly && (
          <Button type="button" size="sm" className="rounded-full h-10 px-4" disabled={busy || !date || !dirty} onClick={save}>
            {busy && <Loader2 className="w-4 h-4 me-2 animate-spin" />}{busy ? a.saving : a.save}
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {saved ? a.recordedBy(saved.byName) : phase.kind === "diagnosis" ? a.requiredDiagnosis : a.requiredPhotos}
      </p>
    </div>
  );
}

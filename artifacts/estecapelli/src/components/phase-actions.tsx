import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, RotateCcw, SkipForward } from "lucide-react";
import type { LeadPhase } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { DATE_LOCALES, phaseName, refreshLeadViews } from "@/lib/phases-i18n";
import { STAFF_FLOW_TEXT } from "@/lib/staff-flow-i18n";

async function call(url: string, method: string, body?: unknown): Promise<void> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? "");
  }
}

export function formatWhen(iso: string | null | undefined, lang: keyof typeof DATE_LOCALES): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(DATE_LOCALES[lang], { day: "numeric", month: "short", year: "numeric" });
}

/** «Omitir etapa» con motivo obligatorio. */
export function SkipPhaseButton({ leadId, phase }: { leadId: string; phase: LeadPhase }) {
  const { lang } = useLanguage();
  const s = STAFF_FLOW_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await call(`/api/leads/${encodeURIComponent(leadId)}/phases/${encodeURIComponent(phase.id)}/skip`, "PUT", { reason: reason.trim() });
      toast({ title: s.skippedToast });
      setOpen(false);
      setReason("");
      await refreshLeadViews(queryClient);
    } catch (error) {
      toast({ variant: "destructive", title: s.cantSkip, description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs" onClick={() => setOpen(true)}>
        <SkipForward className="w-3.5 h-3.5 mr-1.5" />{s.skipStage}
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{s.skipTitle}: {phaseName(phase, lang)}</DialogTitle>
            <DialogDescription>{s.skipIntro}</DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor={`skip-reason-${phase.id}`} className="text-xs font-bold uppercase tracking-wider mb-2 block">{s.reasonLabel}</label>
            <Textarea id={`skip-reason-${phase.id}`} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} placeholder={s.reasonPlaceholder} className="rounded-2xl" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="rounded-full" disabled={busy} onClick={() => setOpen(false)}>{s.cancel}</Button>
            <Button type="button" className="rounded-full" disabled={busy || reason.trim().length < 3} onClick={submit}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{s.skipConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Lo que quedó registrado de una etapa omitida, con «Deshacer». */
export function SkippedNote({ leadId, phase, canUndo }: { leadId: string; phase: LeadPhase; canUndo: boolean }) {
  const { lang } = useLanguage();
  const s = STAFF_FLOW_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const undo = async () => {
    setBusy(true);
    try {
      await call(`/api/leads/${encodeURIComponent(leadId)}/phases/${encodeURIComponent(phase.id)}/skip`, "DELETE");
      toast({ title: s.undoToast });
      await refreshLeadViews(queryClient);
    } catch (error) {
      toast({ variant: "destructive", title: s.cantSkip, description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };
  const skip = phase.skip;
  return (
    <div className="mt-3 rounded-2xl bg-[#F5F2EE] p-3 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
      <span className="font-bold text-foreground">{s.skippedBadge}</span>
      <span className="min-w-0 break-words">{skip ? `${s.by} ${skip.byName} · ${formatWhen(skip.at, lang)} — ${skip.reason}` : ""}</span>
      {canUndo && (
        <Button type="button" size="sm" variant="ghost" className="ml-auto rounded-full h-8 px-3 text-xs" disabled={busy} onClick={undo}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />{s.undoSkip}
        </Button>
      )}
    </div>
  );
}

/** Alta médica (solo médicos) y reapertura. */
export function DischargeControl({ leadId, status, isDoctor, afterDiagnosis, dischargedByName, dischargedAt, dischargeNote }: {
  leadId: string;
  status: string;
  isDoctor: boolean;
  afterDiagnosis: boolean;
  dischargedByName?: string | null;
  dischargedAt?: string | null;
  dischargeNote?: string | null;
}) {
  const { lang } = useLanguage();
  const s = STAFF_FLOW_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const discharged = status === "alta";

  const run = async (action: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await action();
      toast({ title: ok });
      setOpen(false);
      setNote("");
      await refreshLeadViews(queryClient);
    } catch (error) {
      toast({ variant: "destructive", title: s.cantDischarge, description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  if (!discharged && !afterDiagnosis) return null;
  return (
    <div className="mt-5 rounded-2xl border border-[#E8E4DE] p-4 flex flex-wrap items-center gap-3" data-testid="discharge-control">
      <BadgeCheck className="w-5 h-5 text-primary shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold text-foreground">{s.dischargeTitle}</p>
        <p className="text-xs text-muted-foreground break-words">
          {discharged
            ? `${s.by} ${dischargedByName ?? ""} · ${formatWhen(dischargedAt, lang)}${dischargeNote ? ` — ${dischargeNote}` : ""}`
            : isDoctor ? s.dischargeIntro : s.doctorOnly}
        </p>
      </div>
      {isDoctor && (discharged ? (
        <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={busy}
          onClick={() => run(() => call(`/api/leads/${encodeURIComponent(leadId)}/discharge`, "DELETE"), s.reopenedToast)}>
          <RotateCcw className="w-4 h-4 mr-1.5" />{s.reopenProcess}
        </Button>
      ) : (
        <Button type="button" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
          <BadgeCheck className="w-4 h-4 mr-1.5" />{s.discharge}
        </Button>
      ))}
      <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{s.dischargeTitle}</DialogTitle>
            <DialogDescription>{s.dischargeIntro}</DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="discharge-note" className="text-xs font-bold uppercase tracking-wider mb-2 block">{s.noteLabel}</label>
            <Textarea id="discharge-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder={s.notePlaceholder} className="rounded-2xl" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" className="rounded-full" disabled={busy} onClick={() => setOpen(false)}>{s.cancel}</Button>
            <Button type="button" className="rounded-full" disabled={busy}
              onClick={() => run(() => call(`/api/leads/${encodeURIComponent(leadId)}/discharge`, "POST", { note: note.trim() }), s.dischargedToast)}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{s.dischargeConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

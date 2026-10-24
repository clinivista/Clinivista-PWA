import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ScanText, Sparkles } from "lucide-react";
import type { LeadPhaseView } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { TRANSCRIPTION_TEXT } from "@/lib/transcription-i18n";
import { refreshLeadViews } from "@/lib/phases-i18n";

type Status = { available: boolean; monthlyQuota: number; used: number; remaining: number; advancedEnabled: boolean };
const STATUS_KEY = ["/api/clinic/transcription"];

async function request(url: string, method: string, body?: unknown): Promise<Response> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? "");
  }
  return response;
}

/**
 * Transcripción (OCR) bajo una foto marcada como documento. Es una acción
 * manual del personal: el texto es editable y la clínica tiene una cuota
 * mensual. El paciente nunca lo ve.
 */
export function PhotoTranscription({ leadId, view, readOnly = false }: { leadId: string; view: LeadPhaseView; readOnly?: boolean }) {
  const { lang } = useLanguage();
  const x = TRANSCRIPTION_TEXT[lang];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const photo = view.photo;
  const saved = view.transcription ?? null;
  const [text, setText] = useState(saved?.text ?? "");
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState<"transcribe" | "advanced" | "save" | null>(null);
  useEffect(() => { setText(saved?.text ?? ""); }, [saved?.text, saved?.at, photo?.id]);
  useEffect(() => { setManual(false); }, [photo?.id]);

  const { data: status } = useQuery({
    queryKey: STATUS_KEY,
    queryFn: async () => (await (await request("/api/clinic/transcription", "GET")).json()) as Status,
    staleTime: 30_000,
  });
  if (!photo) return null;
  const base = `/api/leads/${encodeURIComponent(leadId)}/phase-photos/${encodeURIComponent(photo.id)}`;

  const run = async (advanced: boolean) => {
    if (advanced && !window.confirm(x.retryConfirm)) return;
    setBusy(advanced ? "advanced" : "transcribe");
    try {
      await request(`${base}/transcribe`, "POST", { advanced });
      await Promise.all([refreshLeadViews(queryClient), queryClient.invalidateQueries({ queryKey: STATUS_KEY })]);
    } catch (error) {
      toast({ variant: "destructive", title: x.cantTranscribe, description: error instanceof Error && error.message ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    try {
      await request(`${base}/transcription`, "PUT", { text });
      toast({ title: x.saved });
      await refreshLeadViews(queryClient);
    } catch (error) {
      toast({ variant: "destructive", title: x.cantSave, description: error instanceof Error && error.message ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const editor = saved !== null || manual;
  const outOfQuota = status ? status.remaining < 1 : false;
  const dirty = text !== (saved?.text ?? "");
  const who = saved
    ? saved.tier === "manual" ? x.byManual(saved.byName) : saved.tier === "advanced" ? x.byAdvanced(saved.byName) : x.byBasic(saved.byName)
    : "";

  return (
    <div className="border-t border-[#E8E4DE] bg-white p-3 text-left" data-testid={`transcription-${view.id}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold text-foreground"><ScanText className="w-4 h-4 text-primary" />{x.title}</p>

      {!editor && !readOnly && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" className="rounded-full h-9 px-4" disabled={busy !== null || !status?.available || outOfQuota} onClick={() => run(false)}>
            {busy === "transcribe" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {busy === "transcribe" ? x.working : x.transcribe}
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full h-9 px-4" disabled={busy !== null} onClick={() => setManual(true)}>{x.writeManual}</Button>
        </div>
      )}
      {!editor && status && (
        <p className="mt-2 text-xs text-muted-foreground">
          {!status.available ? x.unavailable : outOfQuota ? x.quotaOut : x.quota(status.remaining, status.monthlyQuota)}
        </p>
      )}

      {editor && (
        <>
          <textarea
            aria-label={x.title}
            className="mt-2 w-full min-h-40 rounded-2xl border border-[#E8E4DE] bg-[#FBFAF8] p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-70"
            value={text}
            maxLength={20000}
            placeholder={x.placeholder}
            disabled={readOnly || busy !== null}
            dir="auto"
            onChange={(event) => setText(event.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!readOnly && (
              <Button type="button" size="sm" className="rounded-full h-9 px-4" disabled={busy !== null || !dirty || text.trim() === ""} onClick={save}>
                {busy === "save" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{busy === "save" ? x.saving : x.save}
              </Button>
            )}
            {!readOnly && saved && saved.tier === "basic" && status?.advancedEnabled && (
              <Button type="button" size="sm" variant="outline" className="rounded-full h-9 px-4" disabled={busy !== null || !status.available || status.remaining < 2} onClick={() => run(true)}>
                {busy === "advanced" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {busy === "advanced" ? x.working : x.retryAdvanced}
              </Button>
            )}
          </div>
          {!readOnly && saved && saved.tier === "basic" && status && !status.advancedEnabled && (
            <p className="mt-2 text-xs text-muted-foreground">{x.advancedOff}</p>
          )}
          {saved && (
            <p className="mt-2 text-xs text-muted-foreground">
              {who}{saved.editedByName ? ` · ${x.editedBy(saved.editedByName)}` : ""}
            </p>
          )}
          <p className="mt-1 text-xs text-amber-700">{x.review}</p>
        </>
      )}
    </div>
  );
}

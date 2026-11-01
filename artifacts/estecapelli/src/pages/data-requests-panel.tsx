import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { DATA_REQUESTS_PANEL_TEXT } from "@/lib/data-rights-i18n";
import { DATA_RIGHTS_TEXT } from "@/lib/data-rights-i18n";

type Row = {
  id: string; leadId: string; type: keyof (typeof DATA_RIGHTS_TEXT)["es"]["types"]; message: string; status: "pending" | "in_progress" | "resolved" | "rejected";
  dueAt: string; resolvedAt: string | null; resolvedByName: string; resolutionNote: string; patientName: string;
};
type AccessEvent = { id: string; userId: string; action: "view" | "export"; createdAt: string };
const KEY = ["/api/clinic/data-requests"];

// «Solicitudes de datos»: los pedidos de los pacientes (Ley 21.719). La clínica responde, exporta los datos del paciente
// y puede ver quién abrió su ficha. Lo que la ley obliga a conservar no se elimina.
export function DataRequestsPanel() {
  const { lang } = useLanguage();
  const x = DATA_REQUESTS_PANEL_TEXT[lang];
  const types = DATA_RIGHTS_TEXT[lang].types;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<AccessEvent[] | null>(null);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(lang, { dateStyle: "medium" });

  const { data, isLoading, isError } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const response = await fetch("/api/clinic/data-requests", { credentials: "include" });
      if (!response.ok) throw new Error();
      return ((await response.json()) as { requests: Row[] }).requests;
    },
  });

  const update = async (row: Row, status: Row["status"]) => {
    setBusy(row.id);
    try {
      const response = await fetch(`/api/clinic/data-requests/${encodeURIComponent(row.id)}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note: notes[row.id] ?? row.resolutionNote }),
      });
      if (!response.ok) throw new Error();
      await queryClient.invalidateQueries({ queryKey: KEY });
      toast({ title: x.toastSaved });
    } catch {
      toast({ variant: "destructive", title: x.saveError });
    } finally {
      setBusy(null);
    }
  };

  const exportData = async (row: Row) => {
    setBusy(row.id);
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(row.leadId)}/data-export`, { credentials: "include" });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `datos-paciente-${row.leadId}.json`; link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: "destructive", title: x.saveError });
    } finally {
      setBusy(null);
    }
  };

  const showLog = async (row: Row) => {
    const response = await fetch(`/api/leads/${encodeURIComponent(row.leadId)}/access-log`, { credentials: "include" });
    if (!response.ok) { toast({ variant: "destructive", title: x.loadError }); return; }
    setLog(((await response.json()) as { events: AccessEvent[] }).events);
  };

  return (
    <div className="flex flex-col gap-5 max-w-3xl" dir={lang === "ar" ? "rtl" : "ltr"} data-testid="data-requests-panel">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">{x.title}</h1>
        <p className="text-sm text-muted-foreground">{x.intro}</p>
      </header>
      {isLoading && <Loader2 className="w-5 h-5 animate-spin" aria-label="loading" />}
      {isError && <p role="alert" className="text-sm text-destructive">{x.loadError}</p>}
      {data && data.length === 0 && <p className="text-sm text-muted-foreground" data-testid="data-requests-empty">{x.empty}</p>}
      {data?.map((row) => {
        const open = row.status === "pending" || row.status === "in_progress";
        const late = open && new Date(row.dueAt).getTime() < Date.now();
        return (
          <article key={row.id} className="rounded-2xl border border-[#E8E4DE] bg-white p-4 flex flex-col gap-3" data-testid={`data-request-${row.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{types[row.type]}</p>
              <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${row.status === "resolved" ? "bg-emerald-100 text-emerald-800" : row.status === "rejected" ? "bg-slate-200 text-slate-700" : late ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                {late ? x.overdue : x.statuses[row.status]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{x.patient}: <strong className="text-foreground">{row.patientName}</strong> · {open ? `${x.due} ${fmt(row.dueAt)}` : row.resolvedAt ? `${x.resolvedOn(fmt(row.resolvedAt))}${row.resolvedByName ? ` · ${row.resolvedByName}` : ""}` : ""}</p>
            {row.message && <p className="text-sm rounded-xl bg-[#F5F2EE] p-3">{row.message}</p>}
            {open ? (
              <>
                <label className="text-sm font-semibold" htmlFor={`note-${row.id}`}>{x.note}</label>
                <Textarea id={`note-${row.id}`} value={notes[row.id] ?? row.resolutionNote} onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })} placeholder={x.notePlaceholder} maxLength={1000} />
                <div className="flex flex-wrap gap-2">
                  {row.status === "pending" && <Button type="button" variant="outline" className="rounded-full" disabled={busy === row.id} onClick={() => update(row, "in_progress")}>{x.markInProgress}</Button>}
                  <Button type="button" className="rounded-full" disabled={busy === row.id} onClick={() => update(row, "resolved")} data-testid={`resolve-${row.id}`}>{x.resolve}</Button>
                  <Button type="button" variant="outline" className="rounded-full" disabled={busy === row.id} onClick={() => update(row, "rejected")}>{x.reject}</Button>
                </div>
              </>
            ) : row.resolutionNote ? <p className="text-sm">{row.resolutionNote}</p> : null}
            <div className="flex flex-wrap gap-2 border-t border-[#E8E4DE] pt-3">
              <Button type="button" variant="ghost" className="rounded-full text-sm" disabled={busy === row.id} onClick={() => exportData(row)}><Download className="w-4 h-4 me-2" />{x.exportData}</Button>
              <Button type="button" variant="ghost" className="rounded-full text-sm" onClick={() => showLog(row)}><History className="w-4 h-4 me-2" />{x.accessLog}</Button>
            </div>
          </article>
        );
      })}
      <Dialog open={log !== null} onOpenChange={(next) => { if (!next) setLog(null); }}>
        <DialogContent className="rounded-3xl max-w-md" dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{x.accessLog}</DialogTitle></DialogHeader>
          {log && log.length === 0 && <p className="text-sm text-muted-foreground">{x.accessLogEmpty}</p>}
          <ul className="flex flex-col gap-2 max-h-72 overflow-auto text-sm">
            {log?.map((event) => <li key={event.id} className="flex justify-between gap-3"><span>{x.accessAction[event.action]}</span><span className="text-muted-foreground">{new Date(event.createdAt).toLocaleString(lang)}</span></li>)}
          </ul>
          <Button type="button" onClick={() => setLog(null)} className="rounded-full">{x.closeLog}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

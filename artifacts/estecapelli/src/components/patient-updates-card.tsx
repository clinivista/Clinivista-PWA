import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { PATIENT_UPDATES_TEXT } from "@/lib/evaluation-edit-i18n";

type Update = { id: string; kind: "data" | "photo" | "addition"; details: { changes?: Record<string, { from: string; to: string }>; view?: string }; createdAt: string; seenAt: string | null };
type Addition = { id: string; note: string; status: "pending" | "incorporated" | "dismissed"; createdAt: string; resolvedByName: string; files: { index: number; mimeType: string }[] };
export const UPDATES_SUMMARY_KEY = ["/api/clinic/patient-updates/summary"];

/** Cuántos cambios o envíos sin revisar tiene cada paciente (para la lista de pacientes). */
export function useUnseenUpdates(): Record<string, number> {
  const { data } = useQuery({
    queryKey: UPDATES_SUMMARY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/clinic/patient-updates/summary", { credentials: "include" });
      if (!response.ok) throw new Error();
      return ((await response.json()) as { unseen: Record<string, number> }).unseen;
    },
    refetchInterval: 60_000,
  });
  return data ?? {};
}

export function UpdatesBadge({ count }: { count: number }) {
  const { lang } = useLanguage();
  if (!count) return null;
  return <span data-testid="updates-badge" className="ms-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"><Bell className="w-3 h-3" />{PATIENT_UPDATES_TEXT[lang].badge}</span>;
}

// «Novedades del paciente»: qué cambió en la evaluación después de enviarla y la información adicional
// que mandó. La clínica la marca como vista, la incorpora a la ficha o la descarta.
export function PatientUpdatesCard({ leadId }: { leadId: string }) {
  const { lang } = useLanguage();
  const x = PATIENT_UPDATES_TEXT[lang];
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const key = ["/api/leads", leadId, "patient-updates"];
  const { data, isError } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}/patient-updates`, { credentials: "include" });
      if (!response.ok) throw new Error();
      return (await response.json()) as { updates: Update[]; additions: Addition[] };
    },
  });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: key }); void queryClient.invalidateQueries({ queryKey: UPDATES_SUMMARY_KEY }); };
  const call = async (path: string, method: string, body?: unknown) => {
    setBusy(true);
    try {
      await fetch(path, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      refresh();
    } finally { setBusy(false); }
  };
  if (isError) return <p className="px-5 md:px-8 py-2 text-xs text-destructive">{x.error}</p>;
  if (!data || (data.updates.length === 0 && data.additions.length === 0)) return null;

  const unseen = data.updates.filter((update) => !update.seenAt).length;
  const when = (iso: string) => new Date(iso).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
  const label = (update: Update) => update.kind === "data" ? x.dataChanged : update.kind === "photo" ? x.photoChanged(update.details.view ?? "") : x.additionSent;
  const status = { pending: x.pending, incorporated: x.incorporated, dismissed: x.dismissed };

  return (
    <section className="mx-5 md:mx-8 my-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm space-y-3" data-testid="patient-updates">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-foreground flex items-center gap-2"><Bell className="w-4 h-4 text-amber-700" />{x.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{x.subtitle}</p>
        </div>
        {unseen > 0 && <Button size="sm" variant="outline" disabled={busy} className="rounded-xl shrink-0" onClick={() => call(`/api/leads/${encodeURIComponent(leadId)}/patient-updates/seen`, "POST")}>{x.markSeen}</Button>}
      </div>

      <ul className="space-y-2">
        {data.updates.filter((update) => update.kind !== "addition").map((update) => (
          <li key={update.id} className={`rounded-xl bg-white p-3 border ${update.seenAt ? "border-border opacity-70" : "border-amber-300"}`}>
            <p className="text-xs text-muted-foreground">{when(update.createdAt)}</p>
            <p className="font-semibold">{label(update)}</p>
            {update.kind === "data" && update.details.changes && (
              <dl className="mt-1 space-y-1">
                {Object.entries(update.details.changes).filter(([field]) => field !== "clinicalData").map(([field, change]) => (
                  <div key={field} className="text-xs break-words">
                    <dt className="inline font-semibold">{x.fields[field] ?? field}: </dt>
                    <dd className="inline"><span className="text-muted-foreground">{x.before}</span> <bdi>{change.from || "—"}</bdi> → <span className="text-muted-foreground">{x.now}</span> <bdi className="font-semibold">{change.to || "—"}</bdi></dd>
                  </div>
                ))}
                {update.details.changes.clinicalData && <div className="text-xs font-semibold">{x.fields.clinicalData}</div>}
              </dl>
            )}
          </li>
        ))}
      </ul>

      {data.additions.map((addition) => (
        <div key={addition.id} className="rounded-xl bg-white p-3 border border-amber-300 space-y-2" data-testid="patient-addition">
          <p className="text-xs text-muted-foreground">{when(addition.createdAt)} · <span className="font-semibold">{status[addition.status]}</span>{addition.resolvedByName ? ` ${x.reviewedBy(addition.resolvedByName)}` : ""}</p>
          <p className="font-semibold">{x.additionSent}</p>
          {addition.note && <p className="whitespace-pre-wrap break-words">{addition.note}</p>}
          {addition.files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {addition.files.map((file) => {
                const url = `/api/leads/${encodeURIComponent(leadId)}/additions/${encodeURIComponent(addition.id)}/files/${file.index}`;
                return <a key={file.index} href={url} target="_blank" rel="noreferrer"><img src={url} alt={x.photos(1)} className="h-20 w-20 rounded-lg object-cover border border-border" /></a>;
              })}
            </div>
          )}
          {addition.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} className="rounded-xl" onClick={() => call(`/api/leads/${encodeURIComponent(leadId)}/additions/${encodeURIComponent(addition.id)}`, "PATCH", { status: "incorporated" })}>{x.incorporate}</Button>
              <Button size="sm" variant="outline" disabled={busy} className="rounded-xl" onClick={() => call(`/api/leads/${encodeURIComponent(leadId)}/additions/${encodeURIComponent(addition.id)}`, "PATCH", { status: "dismissed" })}>{x.dismiss}</Button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

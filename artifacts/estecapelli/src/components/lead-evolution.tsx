import { useMemo, useState } from "react";
import { FileText, ImageOff, Loader2, Mail, Maximize2, Pencil } from "lucide-react";
import { useGetLeadEvolution, useSendLeadEvolution, type EvolutionCell, type EvolutionZone } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { DATE_LOCALES, phaseName, viewLabel } from "@/lib/phases-i18n";
import { EVOLUTION_UI } from "@/lib/evolution-i18n";

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

const photoUrl = (leadId: string, cell: EvolutionCell) =>
  `/api/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(cell.photoId)}${cell.edited ? "/annotation" : ""}`;

/**
 * Evolución: the same anatomical zone side by side across the patient's phases.
 * The diagnosis column shows the doctor's edited picture. The comparison can be
 * exported as a PDF or emailed to the patient or to another address.
 */
export function LeadEvolution({ leadId, onExpand }: { leadId: string; onExpand: (url: string) => void }) {
  const { lang, t } = useLanguage();
  const u = EVOLUTION_UI[lang];
  const { toast } = useToast();
  const { data, isLoading, isError } = useGetLeadEvolution(leadId);
  const send = useSendLeadEvolution();
  const [selected, setSelected] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "one">("all");
  const [email, setEmail] = useState<string | null>(null);

  const zones = data?.zones ?? [];
  const zone: EvolutionZone | undefined = zones.find((candidate) => candidate.key === selected) ?? zones[0];
  const comparable = useMemo(() => zones.filter((candidate) => candidate.cells.length >= 2), [zones]);
  const zoneName = (candidate: EvolutionZone) => {
    const first = candidate.cells[0];
    return viewLabel({ key: first.viewKey, label: first.viewLabel }, first.phaseKey, lang, t);
  };

  if (isLoading) return <section className="bg-white p-6 rounded-[1.75rem] shadow-sm"><Loader2 className="w-5 h-5 animate-spin" aria-label={u.loading} /></section>;
  if (isError || !data) return <section className="bg-white p-6 rounded-[1.75rem] shadow-sm text-sm text-destructive">{u.loadError}</section>;

  const zonesParam = scope === "one" && zone ? `?zones=${encodeURIComponent(zone.key)}` : "";
  const exportable = scope === "one" ? Boolean(zone && zone.cells.length >= 2) : comparable.length > 0;
  const recipient = (email ?? data.patientEmail ?? "").trim();
  const validEmail = EMAIL.test(recipient);

  const submit = () => {
    send.mutate({ id: leadId, data: { email: recipient, zones: scope === "one" && zone ? [zone.key] : [] } }, {
      onSuccess: (result) => toast({ title: u.sentToast, description: result.recipient }),
      onError: (error) => toast({ variant: "destructive", title: u.cantSend, description: (error as { data?: { error?: string } | null }).data?.error ?? u.tryAgain }),
    });
  };

  return (
    <section className="bg-white p-6 md:p-8 rounded-[1.75rem] shadow-sm flex flex-col gap-5" data-testid="lead-evolution" aria-labelledby="evolution-title">
      <div>
        <h3 id="evolution-title" className="text-lg font-extrabold text-foreground">{u.title}</h3>
        <p className="text-sm text-muted-foreground">{u.subtitle}</p>
      </div>

      {!zone ? (
        <p className="rounded-2xl bg-[#F5F2EE] p-6 text-center text-sm text-muted-foreground">{u.empty}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={u.zone}>
            {zones.map((candidate) => (
              <Button key={candidate.key} type="button" size="sm" variant={candidate.key === zone.key ? "default" : "outline"} className="rounded-full"
                aria-pressed={candidate.key === zone.key} onClick={() => setSelected(candidate.key)}>
                {zoneName(candidate)}
                <span className="ml-1.5 text-xs opacity-70">{candidate.cells.length}</span>
              </Button>
            ))}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 snap-x" role="list" aria-label={u.phasesAria}>
            {data.phases.map((phase) => {
              const cell = zone.cells.find((candidate) => candidate.phaseKey === phase.key);
              // The diagnosis column only exists for zones the doctor edited.
              if (!cell && phase.kind === "diagnosis") return null;
              const label = phaseName({ key: phase.key, name: phase.name }, lang);
              return (
                <figure key={phase.key} role="listitem" className="snap-start shrink-0 w-40 sm:w-48 flex flex-col gap-2" data-testid={`evolution-cell-${phase.key}`}>
                  {cell ? (
                    <button type="button" className="relative block rounded-2xl overflow-hidden bg-[#F5F2EE] hover:ring-2 hover:ring-primary/50 transition-all aspect-[3/4]"
                      onClick={() => onExpand(photoUrl(leadId, cell))} aria-label={`${u.expand}: ${label}`}>
                      <img src={photoUrl(leadId, cell)} alt={`${label} — ${zoneName(zone)}`} className="w-full h-full object-cover" loading="lazy" />
                      <Maximize2 className="absolute right-2 top-2 w-4 h-4 text-white drop-shadow" aria-hidden />
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border aspect-[3/4] text-xs text-muted-foreground">
                      <ImageOff className="w-5 h-5" aria-hidden />{u.noPhoto}
                    </div>
                  )}
                  <figcaption className="text-xs">
                    <span className="block font-bold text-foreground">{label}</span>
                    {cell?.createdAt && <span className="block text-muted-foreground">{new Date(cell.createdAt).toLocaleDateString(DATE_LOCALES[lang])}</span>}
                    {cell?.edited && <span className="inline-flex items-center gap-1 text-primary font-semibold"><Pencil className="w-3 h-3" aria-hidden />{u.edited}</span>}
                  </figcaption>
                </figure>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4" data-testid="evolution-export">
            <p className="text-sm font-bold">{u.exportTitle}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={u.exportTitle}>
              {(["all", "one"] as const).map((value) => (
                <Button key={value} type="button" size="sm" role="radio" aria-checked={scope === value} variant={scope === value ? "default" : "outline"} className="rounded-full"
                  onClick={() => setScope(value)}>{value === "all" ? u.scopeAll : u.scopeOne}</Button>
              ))}
            </div>
            {!exportable && <p className="text-xs text-amber-700">{scope === "one" ? u.needTwo : u.nothingToCompare}</p>}
            <div className="flex flex-wrap items-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" disabled={!exportable} asChild={exportable}>
                {exportable ? (
                  <a href={`/api/leads/${encodeURIComponent(leadId)}/evolution/pdf${zonesParam}`} target="_blank" rel="noreferrer"><FileText className="w-4 h-4 mr-1.5" />{u.exportPdf}</a>
                ) : (<span><FileText className="w-4 h-4 mr-1.5" />{u.exportPdf}</span>)}
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="evolution-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{u.emailLabel}</label>
              <div className="flex flex-wrap gap-2">
                <Input id="evolution-email" type="email" inputMode="email" autoComplete="off" className="flex-1 min-w-[14rem] rounded-full" value={email ?? data.patientEmail ?? ""}
                  onChange={(event) => setEmail(event.target.value)} aria-invalid={recipient !== "" && !validEmail} />
                <Button type="button" className="rounded-full" disabled={!exportable || !validEmail || send.isPending} onClick={submit}>
                  {send.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}{u.send}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{recipient !== "" && !validEmail ? u.invalidEmail : u.emailHint}</p>
              {!data.emailConfigured && <p className="text-xs text-amber-700">{u.emailNotConfigured}</p>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

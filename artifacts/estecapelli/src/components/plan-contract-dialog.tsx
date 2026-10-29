import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileSignature, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language";
import { DATE_LOCALES } from "@/lib/phases-i18n";
import { VIDEO_TEXT } from "@/lib/video-i18n";
import { PLAN_COUNTER_TEXT } from "@/lib/plan-counter-i18n";
import { CONTRACT_TEXT, fillContract } from "@/lib/contract-i18n";
import { PLAN_CATALOG_TEXT, type PlanCatalogText } from "@/lib/plan-catalog-i18n";
import { CONTRACT_KEY, usePlanCatalog, useClinicContract, type PlanCatalog } from "@/lib/clinic-contract";

export type PlanContractTab = "plan" | "compare" | "contract";

type Row = { key: string; label: string; value: (plan: PlanCatalog["plans"][number]) => string };

function rowsOf(text: PlanCatalogText, unlimited: string, lang: string): Row[] {
  const count = (value: number, unit = "") => (value === 0 ? unlimited : `${new Intl.NumberFormat(lang).format(value)}${unit}`);
  return [
    { key: "patients", label: text.fPatients, value: (plan) => count(plan.limits.patientsPerMonth) },
    { key: "storage", label: text.fStorage, value: (plan) => count(plan.limits.storageGb, " GB") },
    { key: "transcriptions", label: text.fTranscriptions, value: (plan) => String(plan.limits.transcriptionsPerMonth) },
    { key: "hours", label: text.fHours, value: (plan) => (plan.limits.includedHours > 0 ? text.hoursUnit.replace("{n}", String(plan.limits.includedHours)) : "—") },
    { key: "buy", label: text.fBuyHours, value: (plan) => (plan.services.buyHours ? text.included : text.notAvailable) },
    { key: "custom", label: text.fCustom, value: (plan) => (plan.services.customWork ? text.included : text.notAvailable) },
    { key: "phases", label: text.fPhases, value: () => text.included },
  ];
}

/** «Mi plan y contrato»: características del plan, comparativa con los demás y el contrato (leer y aceptar, sin vuelta atrás). */
export function PlanContractDialog({ open, onOpenChange, initialTab = "plan" }: { open: boolean; onOpenChange: (open: boolean) => void; initialTab?: PlanContractTab }) {
  const { lang } = useLanguage();
  const text = PLAN_CATALOG_TEXT[lang];
  const contractText = CONTRACT_TEXT[lang];
  const unlimited = PLAN_COUNTER_TEXT[lang].unlimited;
  const planNames = VIDEO_TEXT[lang].planNames;
  const queryClient = useQueryClient();
  const catalog = usePlanCatalog().data;
  const contract = useClinicContract().data;
  const [tab, setTab] = useState<PlanContractTab>(initialTab);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALES[lang], { year: "numeric", month: "long", day: "numeric", timeZone: "America/Santiago" });
  const rows = rowsOf(text, unlimited, lang);

  const accept = async () => {
    if (!contract || !contract.enabled) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/clinic/contract/accept", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: contract.contract.version, hash: contract.contract.hash }),
      });
      if (response.status === 409) { setError(contractText.changed); await queryClient.invalidateQueries({ queryKey: CONTRACT_KEY }); return; }
      if (!response.ok) { setError(contractText.error); return; }
      await queryClient.invalidateQueries({ queryKey: CONTRACT_KEY });
    } catch {
      setError(contractText.error);
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<[PlanContractTab, string]> = [["plan", text.tabPlan], ["compare", text.tabCompare], ["contract", text.tabContract]];
  const current = catalog?.plans.find((plan) => plan.id === catalog.current);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-3xl max-h-[92dvh] overflow-y-auto sm:max-w-3xl" data-testid="plan-contract-dialog">
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>{catalog ? `${text.current}: ${planNames[catalog.current]}` : ""}</DialogDescription>
        </DialogHeader>
        <div role="tablist" className="flex flex-wrap gap-2">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === id ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>{label}</button>
          ))}
        </div>

        {tab === "plan" && current && (
          <ul className="divide-y divide-border rounded-2xl border border-border text-sm" data-testid="plan-features">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-semibold text-foreground">{row.value(current)}</span>
              </li>
            ))}
          </ul>
        )}

        {tab === "compare" && catalog && (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[30rem] text-sm" data-testid="plan-compare">
              <thead>
                <tr className="bg-muted/40 text-start">
                  <th scope="col" className="px-4 py-2.5 text-start font-semibold" />
                  {catalog.plans.map((plan) => (
                    <th key={plan.id} scope="col" className={`px-4 py-2.5 text-start font-bold ${plan.id === catalog.current ? "bg-accent text-accent-foreground" : ""}`}>
                      {planNames[plan.id]}{plan.id === catalog.current && <span className="ms-2 text-xs font-semibold">· {text.yourPlan}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-border">
                    <th scope="row" className="px-4 py-2.5 text-start font-normal text-muted-foreground">{row.label}</th>
                    {catalog.plans.map((plan) => (
                      <td key={plan.id} className={`px-4 py-2.5 font-medium ${plan.id === catalog.current ? "bg-accent/40" : ""}`}>{row.value(plan)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{text.changeNote}</p>
          </div>
        )}

        {tab === "contract" && (
          !contract || !contract.enabled ? (
            <p className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground" data-testid="contract-off">{text.contractOff}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className={`flex items-start gap-2 text-sm font-semibold ${contract.accepted ? "text-emerald-700" : "text-amber-700"}`} data-testid="contract-state">
                <FileSignature className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {contract.accepted && contract.acceptance
                  ? fillContract(text.accepted, { date: dateOf(contract.acceptance.acceptedAt), name: contract.acceptance.byName })
                  : text.pending}
              </p>
              <p className="text-xs text-muted-foreground">{fillContract(contractText.version, { version: contract.contract.version })} · {contractText.spanishOnly}</p>
              <div lang="es" dir="ltr" className="max-h-[42dvh] overflow-y-auto rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-relaxed" data-testid="contract-text">
                {contract.contract.clauses.map((clause) => <p key={clause.title} className="mb-3"><span className="font-semibold">{clause.title}.</span> {clause.body}</p>)}
                <p className="mb-2 mt-4 font-semibold">{contract.contract.annexTitle}</p>
                <ul className="space-y-1">{contract.contract.annex.map((row) => <li key={row.label}><span className="font-medium">{row.label}:</span> {row.value}</li>)}</ul>
              </div>
              {!contract.accepted && (
                contract.canAccept ? (
                  <div className="flex flex-col gap-3">
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                      <span>{contractText.agree}</span>
                    </label>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" aria-hidden="true" />{text.irreversible}</p>
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                    <Button type="button" className="self-start rounded-full" disabled={!agreed || busy} onClick={() => void accept()}>
                      {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {contractText.accepting}</> : contractText.accept}
                    </Button>
                  </div>
                ) : <p className="text-sm text-muted-foreground">{contractText.onlyAdmin}</p>
              )}
              {contract.accepted && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" aria-hidden="true" />{text.irreversible}</p>}
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Botón «Ver plan y contrato»: solo para quien administra la clínica (administrativo o representante legal). */
export function PlanContractLauncher() {
  const { lang } = useLanguage();
  const { data } = usePlanCatalog();
  const [open, setOpen] = useState(false);
  if (!data?.canManage) return null;
  return (
    <>
      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(true)} data-testid="plan-contract-open">{PLAN_CATALOG_TEXT[lang].open}</Button>
      {open && <PlanContractDialog open onOpenChange={setOpen} />}
    </>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language";
import { DATE_LOCALES } from "@/lib/phases-i18n";
import { CONTRACT_TEXT, fillContract } from "@/lib/contract-i18n";

type Acceptance = { id: string; plan: string; version: string; byName: string; acceptedAt: string };
type ContractView =
  | { enabled: false }
  | {
      enabled: true;
      plan: string;
      accepted: boolean;
      acceptance: Acceptance | null;
      canAccept: boolean;
      contract: { title: string; version: string; hash: string; clauses: { title: string; body: string }[]; annexTitle: string; annex: { label: string; value: string }[] };
    };

const KEY = ["clinic-contract"] as const;

/** Aviso (sin bloqueo) cuando el contrato de servicio vigente aún no fue aceptado, con el cuadro para leerlo y aceptarlo. */
export function ContractNotice() {
  const { lang } = useLanguage();
  const text = CONTRACT_TEXT[lang];
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const response = await fetch("/api/clinic/contract", { credentials: "same-origin" });
      if (!response.ok) throw new Error("contract");
      return (await response.json()) as ContractView;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!data || !data.enabled || data.accepted) return null;

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/clinic/contract/accept", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: data.contract.version, hash: data.contract.hash }),
      });
      if (response.status === 409) { setError(text.changed); await queryClient.invalidateQueries({ queryKey: KEY }); return; }
      if (!response.ok) { setError(text.error); return; }
      await queryClient.invalidateQueries({ queryKey: KEY });
      setOpen(false);
    } catch {
      setError(text.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        role="status"
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6 md:px-8"
        data-testid="contract-notice"
      >
        <FileSignature className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">{text.pending}</p>
        <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full bg-card" onClick={() => { setOpen(true); setAgreed(false); setError(""); }}>{text.review}</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-3xl max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{text.title}</DialogTitle>
            <DialogDescription>{fillContract(text.version, { version: data.contract.version })} · {text.spanishOnly}</DialogDescription>
          </DialogHeader>
          <div lang="es" dir="ltr" className="max-h-[50dvh] overflow-y-auto rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-relaxed" data-testid="contract-text">
            {data.contract.clauses.map((clause) => (
              <p key={clause.title} className="mb-3"><span className="font-semibold">{clause.title}.</span> {clause.body}</p>
            ))}
            <p className="mb-2 mt-4 font-semibold">{data.contract.annexTitle}</p>
            <ul className="space-y-1">
              {data.contract.annex.map((row) => <li key={row.label}><span className="font-medium">{row.label}:</span> {row.value}</li>)}
            </ul>
          </div>
          {data.canAccept ? (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span>{text.agree}</span>
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">{text.onlyAdmin}</p>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>{text.close}</Button>
            {data.canAccept && (
              <Button type="button" className="rounded-full" disabled={!agreed || busy} onClick={() => void accept()}>
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {text.accepting}</> : text.accept}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

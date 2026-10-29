import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { LanguagePicker } from "@/components/language-picker";
import { useLanguage } from "@/lib/language";
import { DATE_LOCALES } from "@/lib/phases-i18n";
import { CONTRACT_TEXT, fillContract } from "@/lib/contract-i18n";

type Info = {
  clinicName: string; recipientName: string; plan: string;
  contract: { title: string; version: string; hash: string; clauses: { title: string; body: string }[]; annexTitle: string; annex: { label: string; value: string }[] };
  accepted: { at: string; by: string } | null;
};

// Página del correo «Contrato de servicio»: el representante legal lee el contrato y lo acepta con su enlace único.
export default function ContractAccept() {
  const { lang } = useLanguage();
  const text = CONTRACT_TEXT[lang];
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<"loading" | "invalid" | "ready" | "done">("loading");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(DATE_LOCALES[lang], { year: "numeric", month: "long", day: "numeric", timeZone: "America/Santiago" });

  useEffect(() => {
    let active = true;
    if (!token) { setState("invalid"); return; }
    fetch(`/api/contract-invite?token=${encodeURIComponent(token)}`, { credentials: "same-origin" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) { setState("invalid"); return; }
        const data = (await response.json()) as Info;
        setInfo(data);
        setState(data.accepted ? "done" : "ready");
      })
      .catch(() => { if (active) setState("invalid"); });
    return () => { active = false; };
  }, [token]);

  const accept = async () => {
    if (!info) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/contract-invite/accept", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, version: info.contract.version, hash: info.contract.hash }),
      });
      if (response.status === 409) { setError(text.changed); return; }
      if (!response.ok) { setError(text.error); return; }
      setState("done");
    } catch {
      setError(text.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] cv-page px-4 py-10 flex justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <BrandLogo variant="logo-sin-lema" className="h-11" />
          <LanguagePicker label="Language" />
        </div>
        <h1 className="text-2xl font-bold">{text.title}</h1>
        {state === "loading" && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {text.loading}</p>}
        {state === "invalid" && <p role="alert" className="rounded-2xl bg-white p-5 shadow-sm" data-testid="contract-invalid">{text.linkInvalid}</p>}
        {info && (state === "ready" || state === "done") && (
          <>
            <p className="text-sm text-muted-foreground">{fillContract(text.forClinic, { name: info.clinicName })} · {fillContract(text.version, { version: info.contract.version })}</p>
            <div lang="es" dir="ltr" className="max-h-[55dvh] overflow-y-auto rounded-2xl bg-white p-5 text-sm leading-relaxed shadow-sm" data-testid="contract-text">
              {info.contract.clauses.map((clause) => <p key={clause.title} className="mb-3"><span className="font-semibold">{clause.title}.</span> {clause.body}</p>)}
              <p className="mb-2 mt-4 font-semibold">{info.contract.annexTitle}</p>
              <ul className="space-y-1">{info.contract.annex.map((row) => <li key={row.label}><span className="font-medium">{row.label}:</span> {row.value}</li>)}</ul>
            </div>
            <p className="text-xs text-muted-foreground">{text.spanishOnly}</p>
            {state === "done" ? (
              <p role="status" className="flex items-start gap-2 rounded-2xl bg-white p-5 shadow-sm" data-testid="contract-done">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{info.accepted ? fillContract(text.alreadyDone, { date: dateOf(info.accepted.at) }) : text.thanks}</span>
              </p>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                  <span>{text.agree}</span>
                </label>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button className="rounded-xl font-bold" disabled={!agreed || busy} onClick={() => void accept()}>
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {text.accepting}</> : text.accept}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useParams } from "wouter";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LANGS, type LangCode } from "@/lib/language";
import { PHOTO_CONSENT_UI } from "@/lib/photo-consent-i18n";

type View =
  | { state: "invalid" }
  | { state: "done"; status: "granted" | "declined"; grantedAt: string | null }
  | { state: "open"; clinicName: string; language: LangCode; title: string; intro: string; points: string[]; checkbox: string; requiresCode: boolean; maskedEmail: string | null };

// Página pública a la que llega el paciente desde el enlace que le envió la clínica: lee la autorización,
// confirma con un código que llega a su correo (si lo tiene) y acepta o la rechaza. No necesita cuenta.
export default function ConsentPhoto() {
  const { token = "" } = useParams<{ token: string }>();
  const [lang, setLang] = useState<LangCode | "">("");
  const [view, setView] = useState<View | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState<"granted" | "declined" | null>(null);

  const load = useCallback(async (chosen: string) => {
    try {
      const response = await fetch(`/api/consents/photo/${encodeURIComponent(token)}${chosen ? `?lang=${chosen}` : ""}`);
      const body = (await response.json()) as View;
      setView(body);
      if (body.state === "open" && !chosen) setLang(body.language);
    } catch {
      setView({ state: "invalid" });
    }
  }, [token]);
  useEffect(() => { void load(""); }, [load]);

  const ui = PHOTO_CONSENT_UI[(lang || (view?.state === "open" ? view.language : "es")) as LangCode];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const fail = (code: string) => setMessage(
    code === "code_wrong" ? ui.codeWrong : code === "code_expired" ? ui.codeExpired : code === "too_many_attempts" ? ui.tooMany : ui.error,
  );

  const sendCode = async () => {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/consents/photo/${encodeURIComponent(token)}/code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: lang }) });
      if (response.status === 429) setMessage(ui.tooMany);
      else if (!response.ok) setMessage(ui.error);
      else setCodeSent(true);
    } catch { setMessage(ui.error); } finally { setBusy(false); }
  };

  const accept = async () => {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/consents/photo/${encodeURIComponent(token)}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: lang, code }) });
      if (response.ok) { setFinished("granted"); return; }
      const body = (await response.json().catch(() => null)) as { code?: string } | null;
      fail(body?.code ?? "");
    } catch { setMessage(ui.error); } finally { setBusy(false); }
  };

  const decline = async () => {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/consents/photo/${encodeURIComponent(token)}/decline`, { method: "POST" });
      if (response.ok) setFinished("declined"); else setMessage(ui.error);
    } catch { setMessage(ui.error); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-[100dvh] cv-page px-4 py-8" dir={dir}>
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo className="h-10" />
          {view?.state === "open" && (
            <select aria-label={ui.language} value={lang} className="h-10 rounded-xl border bg-white px-3 text-sm"
              onChange={(event) => { setLang(event.target.value as LangCode); void load(event.target.value); }}>
              {LANGS.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.name}</option>)}
            </select>
          )}
        </div>

        {!view && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" aria-label={ui.loading} /></div>}
        {view?.state === "invalid" && <p role="alert" className="rounded-2xl bg-white p-6 text-sm text-muted-foreground">{ui.invalid}</p>}
        {view?.state === "done" && (
          <p role="status" className="rounded-2xl bg-white p-6 text-sm">
            {view.status === "declined" ? ui.declined : ui.done(view.grantedAt ? new Date(view.grantedAt).toLocaleDateString(lang || "es", { dateStyle: "long" }) : "")}
          </p>
        )}
        {finished && (
          <p role="status" className="rounded-2xl bg-white p-6 text-sm flex items-start gap-3" data-testid="consent-finished">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />{finished === "granted" ? ui.thanks : ui.declined}
          </p>
        )}

        {view?.state === "open" && !finished && (
          <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5 text-primary" /></div>
              <div>
                <h1 className="text-xl font-extrabold text-foreground">{view.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">{view.intro}</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm leading-relaxed">
              {view.points.map((point) => <li key={point} className="rounded-2xl bg-[#F5F2EE] p-3">{point}</li>)}
            </ul>
            <label className="flex items-start gap-3 rounded-2xl border p-3 cursor-pointer">
              <Checkbox checked={agreed} onCheckedChange={(value) => setAgreed(value === true)} aria-label={view.checkbox} />
              <span className="text-sm font-semibold">{view.checkbox}</span>
            </label>

            {view.requiresCode ? (
              <div className="space-y-3 rounded-2xl border p-4">
                <p className="text-sm font-bold">{ui.codeTitle}</p>
                {codeSent ? <p className="text-xs text-muted-foreground">{ui.codeSent(view.maskedEmail ?? "")}</p> : null}
                {!codeSent && <Button type="button" variant="outline" className="rounded-full" disabled={busy || !agreed} onClick={sendCode}>{ui.sendCode}</Button>}
                {codeSent && (
                  <>
                    <label htmlFor="consent-code" className="text-xs font-semibold">{ui.codeLabel}</label>
                    <Input id="consent-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} dir="ltr"
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="h-12 rounded-xl text-center text-lg tracking-[0.4em]" />
                    <button type="button" className="text-xs text-primary underline" disabled={busy} onClick={sendCode}>{ui.resendCode}</button>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{ui.noEmail}</p>
            )}

            {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
            <div className="flex flex-col gap-2">
              <Button type="button" className="h-12 rounded-full font-bold" onClick={accept}
                disabled={busy || !agreed || (view.requiresCode && code.length !== 6)}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : view.requiresCode ? ui.verify : ui.accept}
              </Button>
              <Button type="button" variant="ghost" className="rounded-full text-muted-foreground" disabled={busy} onClick={decline}>{ui.decline}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

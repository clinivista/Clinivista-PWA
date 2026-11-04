import { BrandLogo } from "@/components/brand-logo";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, LogOut } from "lucide-react";
import {
  getGetPortalMeQueryKey,
  getGetPortalOptionsQueryKey,
  useGetPortalMe,
  useGetPortalOptions,
  usePortalForgot,
  usePortalLogin,
  usePortalLogout,
  usePortalSetup,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { LanguagePicker } from "@/components/language-picker";
import { useLanguage, type LangCode } from "@/lib/language";
import { PORTAL_TEXT, type PortalText } from "@/lib/portal-i18n";
import { PORTAL_EDIT_TEXT } from "@/lib/evaluation-edit-i18n";
import { DataRightsDialog } from "@/components/data-rights-dialog";
import { MyDataRequests } from "@/components/my-data-requests";

export const LOCALES: Record<string, string> = { es: "es-CL", en: "en-US", pt: "pt-BR", fr: "fr-FR", de: "de-DE", it: "it-IT", tr: "tr-TR", ar: "ar", zh: "zh-CN" };

function usePortalText(): { text: PortalText; lang: string } {
  const { lang } = useLanguage();
  return { text: PORTAL_TEXT[lang], lang };
}

// The server answers in one language; the patient sees the message in theirs, chosen by what went wrong.
function failure(text: PortalText, error: unknown, byStatus: Record<number, string> = {}): string {
  const status = (error as { status?: number } | null)?.status;
  return (status !== undefined && byStatus[status]) || text.genericError;
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const { text, lang } = usePortalText();
  return (
    <div className="min-h-[100dvh] cv-page px-4 py-10 flex justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-md flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="Clinivista"><BrandLogo variant="logo-sin-lema" alt="Clinivista" className="h-9" /></Link>
          <LanguagePicker label={text.language} />
        </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {children}
        <p className="text-xs text-muted-foreground flex gap-4">
          <Link href="/privacidad" className="underline">{text.privacy}</Link>
          <Link href="/terminos" className="underline">{text.terms}</Link>
        </p>
      </div>
    </div>
  );
}

const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// Portal del paciente: entra con Google o con correo y clave y ve los
// resultados que su clínica le envió.
export default function Portal() {
  const { text, lang } = usePortalText();
  const queryClient = useQueryClient();
  const search = new URLSearchParams(useSearch());
  const { data: me, isLoading } = useGetPortalMe({ query: { queryKey: getGetPortalMeQueryKey(), retry: false } });
  const { data: options } = useGetPortalOptions({ query: { queryKey: getGetPortalOptionsQueryKey(), retry: false } });
  const login = usePortalLogin();
  const forgot = usePortalForgot();
  const logout = usePortalLogout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // «Crear o recuperar mi clave»: pantalla propia que le dice al paciente qué pasó y qué hacer.
  const [mode, setMode] = useState<"login" | "recover">(search.get("recover") === "1" ? "recover" : "login");
  const [recoverStatus, setRecoverStatus] = useState<"form" | "sent" | "throttled" | "error">("form");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const sendRecovery = () => {
    forgot.mutate({ data: { email: email.trim(), language: lang } }, {
      onSuccess: (response) => { setRecoverStatus(response?.throttled ? "throttled" : "sent"); setCooldown(60); },
      onError: () => setRecoverStatus("error"),
    });
  };
  const googleNotice = search.get("google") === "error" ? text.googleError : search.get("google") === "off" ? text.googleOff : null;
  const shownError = error ?? googleNotice;
  const editText = PORTAL_EDIT_TEXT[lang as LangCode] ?? PORTAL_EDIT_TEXT.es;
  const when = (iso: string) => new Date(iso).toLocaleString(LOCALES[lang], { dateStyle: "long", timeStyle: "short" });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetPortalMeQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetPortalOptionsQueryKey() });
  };

  if (isLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center cv-page"><Loader2 className="w-8 h-8 animate-spin text-primary" aria-label={text.loading} /></div>;
  }

  if (me) {
    return (
      <Shell title={text.homeTitle}>
        {search.get("clave") === "ok" && <p role="status" className="rounded-2xl bg-[#00A9A5]/10 px-4 py-3 text-sm font-semibold text-[#007f7c]" data-testid="password-created">{text.passwordCreated}</p>}
        <p className="text-sm text-muted-foreground">{text.signedInAs} {me.email}</p>
        {me.cases.length === 0 && <p className="rounded-2xl bg-white p-5 text-sm text-muted-foreground">{text.noCases}</p>}
        {me.cases.map((item) => (
          <section key={item.leadId} className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3">
            <div>
              <p className="font-bold text-foreground">{item.clinicName}</p>
              <p className="text-xs text-muted-foreground">{item.patientName}</p>
            </div>
            <div className="rounded-xl bg-[#F5F2EE] p-3 text-xs text-muted-foreground flex flex-col gap-2" data-testid="portal-edit">
              <p>{item.locked ? editText.lockedHint : editText.openHint}</p>
              <Button asChild variant="outline" size="sm" className="rounded-xl self-start">
                <Link href={`/patient?token=${encodeURIComponent(item.editToken)}`}>{item.locked ? editText.extra : editText.edit}</Link>
              </Button>
            </div>
            <MyDataRequests token={item.editToken} />
            <DataRightsDialog token={item.editToken} />
            {item.results.length === 0 ? (
              <p className="text-sm text-muted-foreground">{text.noResults}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {item.results.map((result) => (
                  <li key={result.id}>
                    <a href={`/api/portal/results/${encodeURIComponent(result.id)}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-[#E8E4DE] px-4 py-3 text-sm font-semibold hover:bg-[#F5F2EE]">
                      <FileText className="w-4 h-4 text-primary" />{text.resultsOn} · {when(result.createdAt)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <Button variant="outline" className="rounded-xl self-start" disabled={logout.isPending}
          onClick={() => logout.mutate(undefined, { onSuccess: () => { void queryClient.resetQueries({ queryKey: getGetPortalMeQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetPortalOptionsQueryKey() }); } })}>
          <LogOut className="w-4 h-4 me-1.5" />{text.logout}
        </Button>
      </Shell>
    );
  }

  if (mode === "recover") {
    return (
      <Shell title={text.recoverTitle}>
        {recoverStatus === "form" || recoverStatus === "error" ? (
          <form className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3" data-testid="recover-form"
            onSubmit={(event) => { event.preventDefault(); sendRecovery(); }}>
            <p className="text-sm text-muted-foreground">{text.recoverIntro}</p>
            <p className="text-xs text-muted-foreground rounded-xl bg-[#F5F2EE] p-3">{text.accountWhy}</p>
            <label className="text-sm font-bold" htmlFor="recover-email">{text.emailLabel}</label>
            <Input id="recover-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-xl" />
            {recoverStatus === "error" && <p role="alert" className="text-sm text-destructive">{text.genericError}</p>}
            <Button type="submit" className="rounded-xl font-bold" disabled={forgot.isPending || !email.includes("@")} data-testid="recover-send">
              {forgot.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : text.recoverSend}
            </Button>
          </form>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3" data-testid="recover-done" role="status">
            <p className="text-lg font-bold text-foreground">{recoverStatus === "throttled" ? text.recoverThrottled : text.recoverSentTitle}</p>
            {recoverStatus === "sent" && <p className="text-sm text-muted-foreground">{text.recoverSentBody.replace("{email}", email.trim())}</p>}
            {recoverStatus === "sent" && <p className="text-sm font-semibold text-foreground">{text.recoverLatest}</p>}
            <p className="text-xs text-muted-foreground">{text.recoverNoMail}</p>
            <Button type="button" variant="outline" className="rounded-xl" disabled={cooldown > 0 || forgot.isPending} onClick={sendRecovery} data-testid="recover-resend">
              {cooldown > 0 ? text.recoverWait.replace("{s}", String(cooldown)) : text.recoverResend}
            </Button>
          </div>
        )}
        <button type="button" className="text-sm text-primary underline self-start" onClick={() => { setMode("login"); setRecoverStatus("form"); }} data-testid="recover-back">{text.recoverBack}</button>
      </Shell>
    );
  }

  return (
    <Shell title={text.loginTitle}>
        {search.get("clave") === "ok" && <p role="status" className="rounded-2xl bg-[#00A9A5]/10 px-4 py-3 text-sm font-semibold text-[#007f7c]" data-testid="password-created">{text.passwordCreated}</p>}
      {options?.googleEnabled && (
        <a href="/api/portal/google/start?next=/paciente" data-testid="google-start"
          className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#E8E4DE] bg-white text-sm font-bold shadow-sm hover:bg-[#F5F2EE]">
          <GoogleG />{text.googleButton}
        </a>
      )}
      <form className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          login.mutate({ data: { email, password } }, {
            onSuccess: refresh,
            onError: (e) => setError(failure(text, e, { 401: text.loginWrong, 429: text.tooMany })),
          });
        }}>
        <label className="text-sm font-bold" htmlFor="portal-email">{text.emailLabel}</label>
        <Input id="portal-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-xl" />
        <label className="text-sm font-bold" htmlFor="portal-password">{text.passwordLabel}</label>
        <PasswordInput id="portal-password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl" />
        {shownError && <p role="alert" className="text-sm text-destructive">{shownError}</p>}
        {message && <p role="status" className="text-sm text-[#007f7c]">{message}</p>}
        <Button type="submit" className="rounded-xl font-bold" disabled={login.isPending || !email || !password}>
          {login.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : text.enter}
        </Button>
        <button type="button" className="text-sm font-semibold text-primary underline self-start" data-testid="open-recover"
          onClick={() => { setError(null); setMessage(null); setRecoverStatus("form"); setMode("recover"); }}>
          {text.forgot}
        </button>
        <p className="text-xs text-muted-foreground rounded-xl bg-[#F5F2EE] p-3" data-testid="first-time-hint">{text.firstTimeHint} {text.accountWhy}</p>
      </form>
    </Shell>
  );
}

// Enlace del correo: el paciente elige su clave.
export function PortalSetPassword() {
  const { text } = usePortalText();
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const setup = usePortalSetup();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mismatch = again.length > 0 && password !== again;
  return (
    <Shell title={text.setupTitle}>
      <form className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setup.mutate({ data: { token, password } }, {
            onSuccess: () => setLocation("/paciente?clave=ok"),
            onError: (e) => setError(failure(text, e, { 400: text.invalidLinkLong })),
          });
        }}>
        <label className="text-sm font-bold" htmlFor="new-password">{text.newPassword}</label>
        <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl" />
        <label className="text-sm font-bold" htmlFor="repeat-password">{text.repeatPassword}</label>
        <PasswordInput id="repeat-password" autoComplete="new-password" value={again} onChange={(event) => setAgain(event.target.value)} className="h-12 rounded-xl" />
        {mismatch && <p role="alert" className="text-sm text-destructive">{text.mismatch}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error} <Link href="/paciente?recover=1" className="underline font-semibold" data-testid="request-new-link">{text.requestNew}</Link></p>}
        <Button type="submit" className="rounded-xl font-bold" disabled={setup.isPending || password.length < 8 || password !== again || !token}>
          {setup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : text.savePassword}
        </Button>
      </form>
    </Shell>
  );
}

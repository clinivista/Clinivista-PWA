import { useState, type ReactNode } from "react";
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
import { LanguagePicker } from "@/components/language-picker";
import { useLanguage } from "@/lib/language";
import { PORTAL_TEXT, type PortalText } from "@/lib/portal-i18n";

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
    <div className="min-h-[100dvh] bg-[#F5F2EE] px-4 py-10 flex justify-center" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="w-full max-w-md flex flex-col gap-5">
        <LanguagePicker label={text.language} />
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
  const googleNotice = search.get("google") === "error" ? text.googleError : search.get("google") === "off" ? text.googleOff : null;
  const shownError = error ?? googleNotice;
  const when = (iso: string) => new Date(iso).toLocaleString(LOCALES[lang], { dateStyle: "long", timeStyle: "short" });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetPortalMeQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetPortalOptionsQueryKey() });
  };

  if (isLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5F2EE]"><Loader2 className="w-8 h-8 animate-spin text-primary" aria-label={text.loading} /></div>;
  }

  if (me) {
    return (
      <Shell title={text.homeTitle}>
        <p className="text-sm text-muted-foreground">{text.signedInAs} {me.email}</p>
        {me.cases.length === 0 && <p className="rounded-2xl bg-white p-5 text-sm text-muted-foreground">{text.noCases}</p>}
        {me.cases.map((item) => (
          <section key={item.leadId} className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3">
            <div>
              <p className="font-bold text-foreground">{item.clinicName}</p>
              <p className="text-xs text-muted-foreground">{item.patientName}</p>
            </div>
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
        <Button variant="outline" className="rounded-full self-start" disabled={logout.isPending}
          onClick={() => logout.mutate(undefined, { onSuccess: refresh })}>
          <LogOut className="w-4 h-4 me-1.5" />{text.logout}
        </Button>
      </Shell>
    );
  }

  return (
    <Shell title={text.loginTitle}>
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
        <Input id="portal-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-2xl" />
        <label className="text-sm font-bold" htmlFor="portal-password">{text.passwordLabel}</label>
        <Input id="portal-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-2xl" />
        {shownError && <p role="alert" className="text-sm text-destructive">{shownError}</p>}
        {message && <p role="status" className="text-sm text-[#007f7c]">{message}</p>}
        <Button type="submit" className="rounded-full font-bold" disabled={login.isPending || !email || !password}>
          {login.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : text.enter}
        </Button>
        <button type="button" className="text-sm text-primary underline self-start disabled:opacity-50" disabled={forgot.isPending || !email.includes("@")}
          onClick={() => {
            setError(null);
            forgot.mutate({ data: { email, language: lang } }, { onSuccess: () => setMessage(text.forgotSent) });
          }}>
          {text.forgot}
        </button>
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
            onSuccess: () => setLocation("/paciente"),
            onError: (e) => setError(failure(text, e, { 400: text.invalidLink })),
          });
        }}>
        <label className="text-sm font-bold" htmlFor="new-password">{text.newPassword}</label>
        <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-2xl" />
        <label className="text-sm font-bold" htmlFor="repeat-password">{text.repeatPassword}</label>
        <Input id="repeat-password" type="password" autoComplete="new-password" value={again} onChange={(event) => setAgain(event.target.value)} className="h-12 rounded-2xl" />
        {mismatch && <p role="alert" className="text-sm text-destructive">{text.mismatch}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error} <Link href="/paciente" className="underline">{text.requestNew}</Link></p>}
        <Button type="submit" className="rounded-full font-bold" disabled={setup.isPending || password.length < 8 || password !== again || !token}>
          {setup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : text.savePassword}
        </Button>
      </form>
    </Shell>
  );
}

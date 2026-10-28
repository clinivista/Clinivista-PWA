import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, ArrowRight, Lock, Mail } from "lucide-react";
import isotipo from "@workspace/brand/svg/clinivista-isotipo.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useAdminLogin, useStaffForgot, useGetAuthMe, getGetAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { BrandLogo } from "@/components/brand-logo";
import { PortalLanguageSelect } from "@/components/portal-language-select";
import { STAFF_RESET_TEXT } from "@/lib/staff-reset-i18n";
import { ACCESS_TEXT } from "@/lib/access-i18n";

const field = "h-12 rounded-xl border-[#C9D6E8] bg-white ps-11 text-base text-[#0A1F4D] placeholder:text-[#7B8AA3] focus-visible:border-[#1D5FD8] focus-visible:ring-2 focus-visible:ring-[#1D5FD8]/25";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const loginMutation = useAdminLogin();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const reset = STAFF_RESET_TEXT[lang];
  const a = ACCESS_TEXT[lang];
  const forgotMutation = useStaffForgot();
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Where to go after signing in: only paths inside the staff panel are accepted.
  const next = (() => {
    const value = new URLSearchParams(window.location.search).get("next") ?? "";
    return /^\/admin(\?[\w=&%.-]*)?$/.test(value) ? value : "/admin";
  })();

  const { data: authStatus, isLoading } = useGetAuthMe({
    query: { queryKey: getGetAuthMeQueryKey() }
  });

  useEffect(() => {
    if (!isLoading && authStatus?.authenticated) {
      setLocation(next);
    }
  }, [isLoading, authStatus, setLocation, next]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
        setLocation(next);
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: t.loginDenied,
          description: t.loginWrongPwd
        });
      }
    });
  };

  if (isLoading) return <div className="min-h-screen bg-[#F3F8FF]" />;

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-[#EEF5FE] via-white to-[#E8F2FE] selection:bg-primary/30"
      dir={lang === "ar" ? "rtl" : "ltr"}
      data-testid="login-page"
    >
      {/* Arcos decorativos del fondo (como en la propuesta) */}
      <span className="pointer-events-none absolute -end-40 top-24 h-[620px] w-[620px] rounded-full border-[40px] border-white/70" aria-hidden="true" />
      <span className="pointer-events-none absolute -start-48 bottom-[-180px] h-[520px] w-[520px] rounded-full bg-[#DCEAFD]/50" aria-hidden="true" />

      <header className="relative mx-auto flex h-[84px] max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Clinivista" className="rounded-lg">
          <BrandLogo variant="logo" alt="Clinivista — Registro fotográfico clínico" className="h-10 sm:h-14" />
        </Link>
        <PortalLanguageSelect label={a.language} testId="login-language" />
      </header>

      <main className="relative flex justify-center px-4 pb-12 pt-2 sm:pt-6">
        <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(10,31,77,0.05),0_18px_44px_-18px_rgba(10,31,77,0.25)] sm:p-9">
          <div className="text-center">
            <img src={isotipo} alt="" className="mx-auto h-20 w-auto sm:h-24" />
            <h1 className="mt-4 text-[28px] font-bold tracking-[-0.02em] text-[#0A1F4D] sm:text-[32px]">{a.loginTitle}</h1>
            <p className="mt-1.5 text-[17px] text-[#4A5F82]">{a.loginSub}</p>
          </div>

          {forgotMode ? (
            <form
              className="mt-7 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.includes("@")) return;
                forgotMutation.mutate({ data: { email, language: lang } }, { onSuccess: () => setForgotSent(true) });
              }}
            >
              <div>
                <h2 className="text-lg font-bold text-[#0A1F4D]">{reset.forgotTitle}</h2>
                <p className="mt-1 text-sm text-[#4A5F82]">{reset.forgotSub}</p>
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7B8AA3]" aria-hidden="true" />
                <Input
                  type="email"
                  aria-label={t.loginEmailLabel}
                  placeholder={t.loginEmailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                />
              </div>
              {forgotSent && <p role="status" className="text-sm text-emerald-700">{reset.sent}</p>}
              <Button type="submit" className="h-12 w-full rounded-xl bg-[#0B63E5] text-base font-semibold text-white hover:bg-[#0A55C4]" disabled={forgotMutation.isPending || !email.includes("@")}>
                {forgotMutation.isPending ? reset.sending : reset.send}
              </Button>
              <button type="button" className="inline-flex min-h-11 items-center text-sm font-medium text-[#0B4FC4] underline underline-offset-4" onClick={() => { setForgotMode(false); setForgotSent(false); }}>
                {reset.back}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-sm font-semibold text-[#0A1F4D]">{t.loginEmailLabel}</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7B8AA3]" aria-hidden="true" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    placeholder={t.loginEmailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={field}
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="block text-sm font-semibold text-[#0A1F4D]">{t.loginLabel}</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#7B8AA3]" aria-hidden="true" />
                  <PasswordInput
                    id="login-password"
                    autoComplete="current-password"
                    placeholder={t.loginPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={field}
                  />
                </div>
                <div className="flex justify-end">
                  {/* Recuperación real: pide el correo aquí y envía el enlace a /admin/clave?token=… */}
                  <button type="button" className="inline-flex min-h-11 items-center text-sm font-medium text-[#0B4FC4] underline underline-offset-4" onClick={() => setForgotMode(true)} data-testid="login-forgot">
                    {reset.forgotLink}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="group h-12 w-full rounded-xl bg-[#0B63E5] text-base font-semibold text-white shadow-lg shadow-[#0B63E5]/25 hover:bg-[#0A55C4]"
                disabled={loginMutation.isPending || !email || !password}
              >
                {loginMutation.isPending ? t.loginVerifying : a.loginCta}
                {!loginMutation.isPending && <ArrowRight className="ms-2 h-5 w-5 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-200 pt-4 text-center">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-[#0B4FC4] hover:underline" data-testid="login-back">
              <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />{a.back}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

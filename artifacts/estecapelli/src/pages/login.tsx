import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminLogin, useGetAuthMe, getGetAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { BrandLogo } from "@/components/brand-logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const loginMutation = useAdminLogin();
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: authStatus, isLoading } = useGetAuthMe({
    query: { queryKey: getGetAuthMeQueryKey() }
  });

  useEffect(() => {
    if (!isLoading && authStatus?.authenticated) {
      setLocation("/admin");
    }
  }, [isLoading, authStatus, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    loginMutation.mutate({ data: { password } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
        setLocation("/admin");
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

  if (isLoading) return <div className="min-h-screen bg-[#F5F2EE]" />;

  return (
    <div className="min-h-[100dvh] flex bg-[#F5F2EE] selection:bg-primary/30">
      {/* Left side: Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-[#0B1F33] rounded-r-[3rem]">
        <img
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80"
          alt="Modern Clinic"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F33]/95 via-[#0B1F33]/70 to-[#0B1F33]/40" />
        <div className="relative z-10 p-16 max-w-2xl w-full">
          <Link href="/">
            <div className="flex items-center mb-10 cursor-pointer group w-fit">
              <BrandLogo className="h-16 w-[205px] group-hover:scale-[1.03] transition-transform" />
            </div>
          </Link>

          <h1 className="text-4xl font-bold text-white mb-6 leading-tight tracking-tight">
            {t.loginBrandTitle}
          </h1>
          <p className="text-lg text-white/65 leading-relaxed font-light max-w-lg">
            {t.loginBrandSub}
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-col gap-3">
            {[t.step1Title, t.step2Title, t.step3Title].map((label, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/8 border border-white/12 rounded-full px-5 py-3 w-fit">
                <div className="w-6 h-6 rounded-full bg-primary/40 flex items-center justify-center">
                  <span className="text-white text-xs font-black">{i + 1}</span>
                </div>
                <span className="text-white/80 text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/">
            <div className="lg:hidden flex items-center justify-center mb-10 cursor-pointer group">
              <BrandLogo className="h-14 w-[180px] group-hover:scale-[1.03] transition-transform" />
            </div>
          </Link>

          {/* Card */}
          <div className="bg-white rounded-[2.5rem] shadow-lg border border-[#E8E4DE] p-8 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col mb-10 text-center lg:text-left">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{t.loginTitle}</h2>
              <p className="text-muted-foreground mt-3 font-medium">{t.loginSub}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">{t.loginLabel}</label>
                <Input
                  type="password"
                  placeholder={t.loginPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-lg px-5 rounded-2xl transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-base font-bold rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 group mt-4"
                disabled={loginMutation.isPending || !password}
              >
                {loginMutation.isPending ? t.loginVerifying : t.loginCTA}
                {!loginMutation.isPending && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/">
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  ← {t.pGoHome}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

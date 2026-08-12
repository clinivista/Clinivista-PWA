import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Activity, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminLogin, useGetAuthMe, getGetAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const loginMutation = useAdminLogin();
  const { toast } = useToast();

  const { data: authStatus, isLoading } = useGetAuthMe({
    query: {
      queryKey: getGetAuthMeQueryKey(),
    }
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
          title: "Acceso denegado",
          description: "La contraseña ingresada es incorrecta."
        });
      }
    });
  };

  if (isLoading) return <div className="min-h-screen bg-[#1A1A2E]" />;

  return (
    <div className="min-h-[100dvh] flex bg-[#1A1A2E] selection:bg-primary/30">
      {/* Left side: Image/Brand (hidden on small screens) */}
      <div className="hidden lg:flex flex-1 relative bg-black items-center justify-center overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80" 
          alt="Modern Clinic" 
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A2E]/95 via-[#2D2B6B]/70 to-transparent"></div>
        <div className="relative z-10 p-16 max-w-2xl w-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-[12px] bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-extrabold text-white tracking-tight">Clinivista</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            Plataforma de <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#FF6B6B]">Gestión Clínica</span>
          </h1>
          <p className="text-xl text-white/70 leading-relaxed font-light max-w-lg">
            Acceso exclusivo para el equipo médico. Revisa preevaluaciones, asigna estados y contacta a tus pacientes con seguridad.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-[#1A1A2E] to-[#0d0d1a]"></div>
        
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-[10px] bg-primary flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-foreground tracking-tight">Clinivista</span>
          </div>

          <div className="flex flex-col mb-10 text-center lg:text-left">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-6 mx-auto lg:mx-0 shadow-sm border border-gray-100">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Bienvenido de vuelta</h2>
            <p className="text-muted-foreground mt-3 font-medium">
              Ingresa tu contraseña para acceder al panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Contraseña de acceso</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 bg-gray-50/50 border-gray-200 focus:bg-white text-lg px-5 rounded-2xl transition-all shadow-sm"
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 group mt-4"
              disabled={loginMutation.isPending || !password}
            >
              {loginMutation.isPending ? "Verificando..." : "Ingresar al Panel"}
              {!loginMutation.isPending && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

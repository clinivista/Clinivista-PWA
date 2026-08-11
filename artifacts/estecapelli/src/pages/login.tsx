import { useState } from "react";
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

  if (authStatus?.authenticated) {
    setLocation("/admin");
    return null;
  }

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

  if (isLoading) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acceso Clínica</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Panel de gestión de pacientes Estecapelli
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Contraseña de acceso</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
              autoFocus
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 font-medium"
            disabled={loginMutation.isPending || !password}
          >
            {loginMutation.isPending ? "Verificando..." : "Ingresar al Panel"}
            {!loginMutation.isPending && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </form>
      </div>
    </div>
  );
}